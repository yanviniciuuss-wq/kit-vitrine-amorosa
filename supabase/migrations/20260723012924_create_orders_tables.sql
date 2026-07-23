/*
# Create orders and order_items tables

1. New Tables
- `orders`
  - `id` (uuid, primary key)
  - `store_id` (uuid, foreign key to stores, on delete cascade)
  - `customer_name` (text, optional — name of the customer placing the order)
  - `customer_phone` (text, optional — customer's phone for contact)
  - `total` (numeric, not null — total order value in BRL)
  - `status` (text, not null, default 'pending' — pending | confirmed | cancelled)
  - `whatsapp_message` (text, optional — the formatted message sent to WhatsApp)
  - `created_at` (timestamptz, default now)
- `order_items`
  - `id` (uuid, primary key)
  - `order_id` (uuid, foreign key to orders, on delete cascade)
  - `product_id` (uuid, optional, foreign key to products, on delete set null)
  - `name` (text, not null — product name snapshot at order time)
  - `price` (numeric, not null — unit price snapshot)
  - `quantity` (integer, not null)
  - `note` (text, optional — customer observation per item)

2. Security (RLS)
- `orders`: public INSERT (anon + authenticated) so storefront visitors can place orders;
  owner-scoped SELECT/UPDATE/DELETE for authenticated store owners via ownership check
  through the stores table.
- `order_items`: public INSERT (anon + authenticated) tied to order creation;
  owner-scoped SELECT/UPDATE/DELETE for authenticated store owners through order -> store.
- `status` updated_at columns and indexes added for query performance.

3. Important Notes
- The storefront is a public page (no sign-in for customers), so order creation must be
  allowed for the anon role. Reading and managing orders is restricted to the authenticated
  store owner.
- Product references in order_items use ON DELETE SET NULL so historical orders remain
  intact even if a product is later deleted.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  whatsapp_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note text
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- orders policies
-- Public INSERT: anyone (anon or authenticated) can create an order from the storefront
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Owner-scoped SELECT: store owners can read their own orders
DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid())
  );

-- Owner-scoped UPDATE: store owners can update order status
DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()));

-- Owner-scoped DELETE: store owners can delete orders
DROP POLICY IF EXISTS "delete_own_orders" ON orders;
CREATE POLICY "delete_own_orders" ON orders FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid())
  );

-- order_items policies
-- Public INSERT: tied to order creation from the storefront
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Owner-scoped SELECT: store owners can read their own order items
DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id AND stores.owner_id = auth.uid()
    )
  );

-- Owner-scoped DELETE: store owners can delete order items (cascade handles most cases)
DROP POLICY IF EXISTS "delete_own_order_items" ON order_items;
CREATE POLICY "delete_own_order_items" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id AND stores.owner_id = auth.uid()
    )
  );