-- Trigger to decrement stock on successful payment
CREATE OR REPLACE FUNCTION public.decrement_stock_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Loop through order items and decrement stock
  FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
    UPDATE public.products
    SET stock_count = GREATEST(stock_count - v_item.quantity, 0)
    WHERE id = v_item.product_id;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decrement_stock_on_payment_trg ON public.orders;

CREATE TRIGGER decrement_stock_on_payment_trg
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status <> 'paid')
  EXECUTE FUNCTION public.decrement_stock_on_payment();
