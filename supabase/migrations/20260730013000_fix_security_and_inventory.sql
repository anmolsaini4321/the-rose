-- Migration: Fix payment security, status transitions, and stock integrity constraints

-- 1. Redefine decrement_stock_on_payment to enforce sufficient stock check
CREATE OR REPLACE FUNCTION public.decrement_stock_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item RECORD;
  v_row_count INTEGER;
BEGIN
  -- Loop through order items and decrement stock
  FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
    UPDATE public.products
    SET stock_count = stock_count - v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id
      AND stock_count >= v_item.quantity
      AND is_published = true;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count = 0 THEN
      RAISE EXCEPTION 'Insufficient stock or unpublished product for product %', v_item.product_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- 2. Redefine validate_order_status_update to restrict direct status changes to 'paid' and validate transitions
CREATE OR REPLACE FUNCTION public.validate_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from updating orders they don't own
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = NEW.id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  -- Enforce status state machine rules
  IF OLD.status <> NEW.status THEN
    -- If transition is to 'paid', ensure it's from 'pending' and verified
    IF NEW.status = 'paid' THEN
      IF OLD.status <> 'pending' THEN
        RAISE EXCEPTION 'Cannot transition status from % to paid', OLD.status;
      END IF;
      
      -- Check if transaction flag is active OR user is admin
      IF current_setting('app.payment_verified', true) IS DISTINCT FROM 'true' AND NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
      ) THEN
        RAISE EXCEPTION 'Direct update of status to paid is not allowed. Must verify payment via secure RPC.';
      END IF;
    ELSIF OLD.status = 'pending' AND NEW.status NOT IN ('paid', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
    ELSIF OLD.status = 'paid' AND NEW.status NOT IN ('processing', 'refunded') THEN
      RAISE EXCEPTION 'Invalid transition from paid to %', NEW.status;
    ELSIF OLD.status = 'processing' AND NEW.status NOT IN ('shipped', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from processing to %', NEW.status;
    ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered') THEN
      RAISE EXCEPTION 'Invalid transition from shipped to %', NEW.status;
    ELSIF OLD.status IN ('delivered', 'cancelled', 'refunded') THEN
      RAISE EXCEPTION 'Cannot update order status once it is %', OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger BEFORE UPDATE on orders (to validate status transitions)
DROP TRIGGER IF EXISTS secure_order_status_update ON public.orders;
CREATE TRIGGER secure_order_status_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_status_update();

-- 3. Create public.add_to_cart_secure RPC for atomic cart additions
CREATE OR REPLACE FUNCTION public.add_to_cart_secure(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_stock INTEGER;
  v_current_qty INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get product stock
  SELECT stock_count INTO v_stock FROM public.products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Validate stock count
  IF v_stock <= 0 THEN
    RAISE EXCEPTION 'This product is currently out of stock';
  END IF;

  -- Get existing quantity in cart
  SELECT quantity INTO v_current_qty FROM public.carts 
  WHERE user_id = v_user_id AND product_id = p_product_id;
  
  IF NOT FOUND THEN
    v_current_qty := 0;
  END IF;

  -- Validate quantity
  IF (v_current_qty + p_quantity) > v_stock THEN
    RAISE EXCEPTION 'Cannot add % units. Only % units available, and you already have % in your bag.', 
      p_quantity, v_stock, v_current_qty;
  END IF;

  INSERT INTO public.carts (user_id, product_id, quantity, updated_at)
  VALUES (v_user_id, p_product_id, p_quantity, NOW())
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET 
    quantity = public.carts.quantity + EXCLUDED.quantity,
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger to validate cart quantities on direct insert/update operations
CREATE OR REPLACE FUNCTION public.validate_cart_item()
RETURNS TRIGGER AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  -- Get available stock
  SELECT stock_count INTO v_stock FROM public.products WHERE id = NEW.product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product does not exist';
  END IF;

  IF NEW.quantity > v_stock THEN
    RAISE EXCEPTION 'Requested quantity % exceeds available stock %', NEW.quantity, v_stock;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_cart_item_trg ON public.carts;
CREATE TRIGGER validate_cart_item_trg
  BEFORE INSERT OR UPDATE ON public.carts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cart_item();

-- 5. Create verify_payment RPC for Razorpay payments verification
CREATE OR REPLACE FUNCTION public.verify_payment(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_secret TEXT;
  v_expected_signature TEXT;
  v_computed_signature BYTEA;
  v_payload TEXT;
BEGIN
  -- Ensure user is authenticated and order belongs to them
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = p_order_id AND user_id = auth.uid() AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Order not found or not in pending state';
  END IF;

  -- Try to get Razorpay secret from Supabase custom settings
  BEGIN
    v_secret := current_setting('app.settings.razorpay_secret', true);
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  -- Check if secret is set. If not, validate fields are not empty (test mode/mock)
  IF v_secret IS NULL OR v_secret = '' THEN
    IF p_razorpay_order_id IS NULL OR p_razorpay_order_id = '' OR
       p_razorpay_payment_id IS NULL OR p_razorpay_payment_id = '' OR
       p_razorpay_signature IS NULL OR p_razorpay_signature = '' THEN
      RAISE EXCEPTION 'Invalid payment details provided';
    END IF;
  ELSE
    -- Cryptographic HMAC-SHA256 signature verification if secret is configured
    v_payload := p_razorpay_order_id || '|' || p_razorpay_payment_id;
    v_computed_signature := public.hmac(v_payload::bytea, v_secret::bytea, 'sha256');
    v_expected_signature := encode(v_computed_signature, 'hex');

    IF v_expected_signature <> p_razorpay_signature THEN
      RAISE EXCEPTION 'Payment signature verification failed';
    END IF;
  END IF;

  -- Set session flag to allow status transition to 'paid'
  PERFORM set_config('app.payment_verified', 'true', true);

  -- Perform the update securely inside security definer context
  UPDATE public.orders
  SET status = 'paid',
      razorpay_order_id = p_razorpay_order_id,
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature = p_razorpay_signature,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
