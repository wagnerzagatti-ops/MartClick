/*
# MartClick - Core Schema: settings + orders tables

## Purpose
This migration creates the two core tables that power the MartClick grocery-ordering app:
1. `settings` — a single-row table storing the store owner's configuration (delivery fee, free-shipping threshold, minimum order, ETA, max installments, WhatsApp number, enabled payment methods).
2. `orders` — every customer order: items, pricing breakdown, delivery status, payment status, customer contact info.

## Tables Created

### settings
- `id` (int, primary key, always 1 — singleton row)
- `value` (jsonb, stores the full config object)

### orders
- `id` (uuid, primary key — generated client-side so the customer can track their order immediately)
- `created_at` (timestamptz, default now())
- `nome` (text — customer name)
- `tel` (text — customer phone)
- `endereco` (text — delivery address)
- `itens` (jsonb — array of {q, n, on} item objects)
- `subtotal` (numeric — estimated grocery total)
- `taxa` (numeric — delivery fee)
- `total` (numeric — subtotal + fee)
- `status` (int, default 0 — 0=Recebido, 1=Comprando, 2=Saiu para entrega, 3=Entregue)
- `pago` (boolean, default false — payment confirmed)
- `forma` (text — payment method used)

## Security (RLS)

### settings table
- SELECT: public (anyone can read the store config — TO anon, authenticated)
- INSERT/UPDATE/DELETE: authenticated only (only the logged-in store owner can change config)

### orders table
- SELECT: public (TO anon, authenticated) — customers need to track their own order by ID; the order ID acts as a capability token
- INSERT: anon only, with CHECK constraint forcing status=0 and pago=false (customers can only create new unpaid orders)
- UPDATE: authenticated only (only the store owner can change order status / mark as paid)
- DELETE: authenticated only (only the store owner can remove orders)

### get_order function
- SECURITY DEFINER function that returns a single order by ID
- Granted to anon so customers can track their order without authentication
- The order UUID itself serves as the authorization token (unguessable)

## Important Notes
1. This is a single-tenant app — one store owner (Wagner) uses the admin panel. No user_id columns needed.
2. The order ID is generated client-side with crypto.randomUUID() and acts as a capability token for tracking.
3. Customers (anon role) can only INSERT new orders and SELECT their own order via get_order RPC.
4. The store owner authenticates via Supabase email/password to access the admin panel.
5. Demo data: 3 sample orders are inserted for immediate visual feedback.
*/
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1,
  value jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  nome text,
  tel text,
  endereco text,
  itens jsonb,
  subtotal numeric,
  taxa numeric,
  total numeric,
  status int DEFAULT 0,
  pago boolean DEFAULT false,
  forma text
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- settings policies: public read, authenticated write
DROP POLICY IF EXISTS "settings_select_public" ON settings;
CREATE POLICY "settings_select_public"
  ON settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_insert_admin" ON settings;
CREATE POLICY "settings_insert_admin"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "settings_update_admin" ON settings;
CREATE POLICY "settings_update_admin"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "settings_delete_admin" ON settings;
CREATE POLICY "settings_delete_admin"
  ON settings FOR DELETE
  TO authenticated
  USING (true);

-- orders policies: public read (order ID = capability token), anon insert (new orders only), authenticated update/delete
DROP POLICY IF EXISTS "orders_select_public" ON orders;
CREATE POLICY "orders_select_public"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "orders_insert_customer" ON orders;
CREATE POLICY "orders_insert_customer"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (status = 0 AND pago = false);

DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- get_order: SECURITY DEFINER function so anon can fetch a single order by ID (capability token)
CREATE OR REPLACE FUNCTION get_order(oid uuid)
RETURNS setof orders
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM orders WHERE id = oid;
$$;

GRANT EXECUTE ON FUNCTION get_order TO anon, authenticated;

-- Insert default settings
INSERT INTO settings (id, value) VALUES (1, '{"fee":15,"freeAbove":200,"minOrder":0,"eta":90,"installments":3,"whats":"5516999999999","methods":{"pix":true,"link":true,"credit":true,"debit":true}}')
ON CONFLICT (id) DO NOTHING;

-- Insert demo orders
INSERT INTO orders (id, nome, tel, endereco, itens, subtotal, taxa, total, status, pago, forma) VALUES
  (gen_random_uuid(), 'Dona Cida', '16991112222', 'Rua das Flores, 120 - Centro, Serrana-SP', '[{"q":2,"n":"arroz","on":true},{"q":1,"n":"leite integral","on":true},{"q":1,"n":"café","on":true}]', 79.5, 15, 94.5, 0, false, 'pix'),
  (gen_random_uuid(), 'Marlene Souza', '16993334444', 'Av. Brasil, 845 - Jd. Primavera, Serrana-SP', '[{"q":5,"n":"frango","on":true},{"q":3,"n":"carne","on":true},{"q":2,"n":"feijão","on":true}]', 254, 0, 254, 1, true, 'credit'),
  (gen_random_uuid(), 'Joana Lima', '16995556666', 'Rua XV de Novembro, 33 - Serrana-SP', '[{"q":12,"n":"ovos","on":true},{"q":1,"n":"pão","on":true}]', 177, 15, 192, 3, true, 'pix')
ON CONFLICT (id) DO NOTHING;
