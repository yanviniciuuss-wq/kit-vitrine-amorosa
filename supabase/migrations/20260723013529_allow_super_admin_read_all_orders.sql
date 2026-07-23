/*
# Allow super_admin to read all orders and order_items

1. Security changes (RLS)
- Add SELECT policies on `orders` and `order_items` so a user with the
  `super_admin` role can read every order across all stores (platform-wide
  statistics and support views in /admin).
- Existing owner-scoped policies remain unchanged.

2. Important Notes
- The super_admin role is stored in `user_roles`. We check it via an EXISTS
  subquery against `user_roles` where `role = 'super_admin'` and
  `user_id = auth.uid()`.
- This is additive only — no data is modified or lost.
*/

DROP POLICY IF EXISTS "super_admin_select_orders" ON orders;
CREATE POLICY "super_admin_select_orders" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "super_admin_select_order_items" ON order_items;
CREATE POLICY "super_admin_select_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN user_roles ON user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
      WHERE orders.id = order_items.order_id
    )
  );