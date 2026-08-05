-- Migration: Secure Delivery Transitions
-- 1. Redefine validate_order_status_update to clear ETA and handle customer confirmation on transition to 'delivered'
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

  -- Automatically clear ETA and set user confirmation status when order becomes 'delivered'
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
    NEW.delivery_eta := NULL;
    -- If the customer themselves (not an admin) is performing the update, or if they confirmed it:
    IF auth.uid() = NEW.user_id AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    ) THEN
      NEW.delivery_confirmed_by_user := TRUE;
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

-- 2. Explicitly ensure RLS updates are enabled for users on their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ))
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ));
