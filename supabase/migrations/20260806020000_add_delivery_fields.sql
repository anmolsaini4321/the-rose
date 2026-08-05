-- Migration: Add Delivery Partner & ETA columns to orders, and auto-assign them on payment confirmation.

-- 1. Add delivery partner and delivery eta columns to orders table if they do not exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_partner TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_eta TIMESTAMPTZ;

-- 2. Redefine validate_order_status_update function to auto-assign delivery partner and ETA upon transition to 'paid' status
CREATE OR REPLACE FUNCTION public.validate_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Direct update to 'paid' is forbidden unless app.payment_verified is set by gateway verify_payment RPC
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    IF current_setting('app.payment_verified', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Direct update of status to paid is forbidden. Payment status can only be set by the gateway.';
    END IF;
  END IF;

  -- Auto-assign delivery partner and ETA when transitioning to 'paid' status
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    IF NEW.delivery_partner IS NULL THEN
      -- Pick a random partner out of Blue Dart, Delhivery, FastExpress, and DHL
      NEW.delivery_partner := (ARRAY['Delhivery', 'Blue Dart', 'FastExpress', 'DHL'])[floor(random() * 4 + 1)];
    END IF;
    IF NEW.delivery_eta IS NULL THEN
      -- Assign 3-day ETA
      NEW.delivery_eta := NOW() + INTERVAL '3 days';
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
