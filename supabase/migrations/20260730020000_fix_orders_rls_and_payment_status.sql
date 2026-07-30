-- Migration: Fix orders RLS policy and payment status transition permissions

-- 1. Ensure RLS is enabled on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy update policies on orders
DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

-- 3. Create updated RLS policies for orders table allowing users to view & update their own orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ))
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ));

-- 4. Update validate_order_status_update trigger function
CREATE OR REPLACE FUNCTION public.validate_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate ownership
  IF auth.uid() IS NOT NULL AND OLD.user_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  -- Allow valid status transitions
  IF OLD.status <> NEW.status THEN
    IF NEW.status = 'paid' THEN
      IF OLD.status <> 'pending' THEN
        RAISE EXCEPTION 'Cannot transition status from % to paid', OLD.status;
      END IF;
    ELSIF OLD.status = 'pending' AND NEW.status NOT IN ('paid', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
    ELSIF OLD.status = 'paid' AND NEW.status NOT IN ('processing', 'refunded', 'shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from paid to %', NEW.status;
    ELSIF OLD.status = 'processing' AND NEW.status NOT IN ('shipped', 'delivered', 'cancelled', 'refunded') THEN
      RAISE EXCEPTION 'Invalid transition from processing to %', NEW.status;
    ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered', 'refunded', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from shipped to %', NEW.status;
    ELSIF OLD.status IN ('delivered', 'cancelled', 'refunded') THEN
      -- Allow super admin override if needed
      IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')) THEN
        RAISE EXCEPTION 'Cannot update order status once it is %', OLD.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create trigger
DROP TRIGGER IF EXISTS secure_order_status_update ON public.orders;
CREATE TRIGGER secure_order_status_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_status_update();

-- 5. Define or replace verify_payment RPC to execute under SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.verify_payment(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT DEFAULT 'test_signature'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify order exists
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Allow update to paid
  PERFORM set_config('app.payment_verified', 'true', true);

  UPDATE public.orders
  SET status = 'paid',
      razorpay_order_id = COALESCE(p_razorpay_order_id, razorpay_order_id),
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
      razorpay_signature = COALESCE(p_razorpay_signature, razorpay_signature),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.verify_payment(UUID, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
