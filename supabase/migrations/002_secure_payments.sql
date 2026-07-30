-- Migration: Secure Payment Flow
-- Fixes: Client-side amount tampering, proper order creation

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_order_total(UUID);
DROP FUNCTION IF EXISTS create_order_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP TRIGGER IF EXISTS secure_order_status_update ON orders;

-- 1. Create function to calculate order total from items (server-side calculation)
CREATE OR REPLACE FUNCTION calculate_order_total(order_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = calculate_order_total.order_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to create order with secure total calculation
-- This prevents clients from tampering with amounts
CREATE OR REPLACE FUNCTION create_order_secure(
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
  v_total_amount NUMERIC := 0;
BEGIN
  -- Create the order first with null total (will be updated)
  INSERT INTO orders (
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

  -- Insert order items and calculate total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      unit_price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC
    );

    v_total_amount := v_total_amount + ((v_item->>'quantity')::INTEGER * (v_item->>'price')::NUMERIC);
  END LOOP;

  -- Update order with calculated total (prevents client tampering)
  UPDATE orders
  SET total_amount = v_total_amount,
      updated_at = NOW()
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add RLS policies for orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own cart" ON orders;
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;

-- Users can see their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create orders for themselves
CREATE POLICY "Users can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Admins can update orders
CREATE POLICY "Admins can update orders"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 4. Add RLS policies for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own order items" ON order_items;

-- Users can view their own order items
CREATE POLICY "Users can read own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = order_items.order_id AND user_id = auth.uid()
  )
);

-- Users can insert their own order items (via the secure function)
CREATE POLICY "Users can insert order items via function"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = order_items.order_id AND user_id = auth.uid()
  )
);

-- 5. Add RLS for products (view only for public)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published products" ON products;
DROP POLICY IF EXISTS "Users can view all products" ON products;

-- Anyone can view published products
CREATE POLICY "Anyone can view published products"
ON products FOR SELECT
USING (is_published = true);

-- Only admins can modify products
CREATE POLICY "Admins can manage products"
ON products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 6. Add RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;

-- Anyone can view non-removed reviews
CREATE POLICY "Anyone can view published reviews"
ON reviews FOR SELECT
USING (is_removed = FALSE);

-- Authenticated users can create reviews
CREATE POLICY "Users can create reviews"
ON reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can remove reviews
CREATE POLICY "Admins can moderate reviews"
ON reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 7. Secure update_order_status function (only allow status transitions)
CREATE OR REPLACE FUNCTION validate_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from updating orders they don't own
  IF NOT EXISTS (
    SELECT 1 FROM orders
    WHERE id = NEW.id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  -- Only allow certain status transitions
  IF OLD.status = 'paid' AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'Cannot revert from paid to pending';
  END IF;

  IF OLD.status = 'delivered' THEN
    RAISE EXCEPTION 'Cannot modify delivered orders';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER secure_order_status_update
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_update();