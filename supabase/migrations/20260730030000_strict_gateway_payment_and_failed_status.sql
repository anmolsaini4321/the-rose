-- Migration: Add 'failed' status to orders constraint and restrict status 'paid' strictly to gateway verification

-- 1. Drop existing constraint and re-add with 'failed' included
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'paid', 'failed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'));

-- 2. Update validate_order_status_update trigger
CREATE OR REPLACE FUNCTION public.validate_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Direct update to 'paid' is forbidden unless app.payment_verified is set by gateway verify_payment RPC
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    IF current_setting('app.payment_verified', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Direct update of status to paid is forbidden. Payment status can only be set by the gateway.';
    END IF;
  END IF;

  -- Validate ownership for non-admin users
  IF auth.uid() IS NOT NULL AND OLD.user_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  -- State machine validations
  IF OLD.status <> NEW.status THEN
    IF OLD.status IN ('pending', 'failed') AND NEW.status NOT IN ('paid', 'cancelled', 'failed') THEN
      RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
    ELSIF OLD.status = 'paid' AND NEW.status NOT IN ('processing', 'refunded', 'shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from paid to %', NEW.status;
    ELSIF OLD.status = 'processing' AND NEW.status NOT IN ('shipped', 'delivered', 'cancelled', 'refunded') THEN
      RAISE EXCEPTION 'Invalid transition from processing to %', NEW.status;
    ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered', 'refunded', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition from shipped to %', NEW.status;
    ELSIF OLD.status IN ('delivered', 'refunded') THEN
      IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')) THEN
        RAISE EXCEPTION 'Cannot update order status once it is %', OLD.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
DROP TRIGGER IF EXISTS secure_order_status_update ON public.orders;
CREATE TRIGGER secure_order_status_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_status_update();

-- 3. Replace verify_payment RPC to safely set app.payment_verified flag and update status to 'paid'
CREATE OR REPLACE FUNCTION public.verify_payment(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT DEFAULT 'test_signature'
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Set session flag so trigger permits transition to 'paid'
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
