-- Migration: Fix Secure Order Price Tampering
-- Corrects the create_order_secure RPC to fetch prices from products table and securely add GST.

CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_user_id UUID,
  p_shipping_name TEXT,
  p_shipping_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_shipping_pincode TEXT,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product_price NUMERIC;
  v_subtotal NUMERIC := 0;
  v_gst NUMERIC := 0;
  v_total_amount NUMERIC := 0;
BEGIN
  -- Create the order first with 0 total (will be updated after calculation)
  INSERT INTO public.orders (
    user_id,
    status,
    total_amount,
    shipping_name,
    shipping_phone,
    shipping_address,
    shipping_city,
    shipping_pincode,
    notes
  ) VALUES (
    p_user_id,
    'pending',
    0,
    p_shipping_name,
    p_shipping_phone,
    p_shipping_address,
    p_shipping_city,
    p_shipping_pincode,
    p_notes
  )
  RETURNING id INTO v_order_id;

  -- Insert order items and calculate subtotal securely
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Fetch product price directly from the database to prevent client tampering
    SELECT price INTO v_product_price 
    FROM public.products 
    WHERE id = (v_item->>'product_id')::UUID 
      AND is_published = true;

    IF v_product_price IS NULL THEN
      RAISE EXCEPTION 'Product with ID % does not exist or is not published', (v_item->>'product_id');
    END IF;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      v_product_price
    );

    v_subtotal := v_subtotal + ((v_item->>'quantity')::INTEGER * v_product_price);
  END LOOP;

  -- Compute GST (5%) matching client-side calculations and round to 2 decimals
  v_gst := ROUND(v_subtotal * 0.05, 2);
  v_total_amount := v_subtotal + v_gst;

  -- Update order with secure calculated total
  UPDATE public.orders
  SET total_amount = v_total_amount,
      updated_at = NOW()
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
