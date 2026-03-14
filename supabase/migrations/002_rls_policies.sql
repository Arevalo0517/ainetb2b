-- ============================================================
-- AiNet - Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Helper: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Get client_id for current user
CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS UUID AS $$
  SELECT id FROM clients
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES policies
-- ============================================================
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- CLIENTS policies
-- ============================================================
CREATE POLICY "clients_select"
  ON clients FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

CREATE POLICY "clients_insert_admin"
  ON clients FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "clients_update_admin"
  ON clients FOR UPDATE
  USING (is_admin());

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  USING (is_admin());

-- ============================================================
-- PROJECTS policies
-- ============================================================
CREATE POLICY "projects_select"
  ON projects FOR SELECT
  USING (
    client_id = get_my_client_id()
    OR is_admin()
  );

CREATE POLICY "projects_insert_admin"
  ON projects FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "projects_update_admin"
  ON projects FOR UPDATE
  USING (is_admin());

CREATE POLICY "projects_delete_admin"
  ON projects FOR DELETE
  USING (is_admin());

-- ============================================================
-- API_USAGE policies
-- ============================================================
CREATE POLICY "api_usage_select"
  ON api_usage FOR SELECT
  USING (
    client_id = get_my_client_id()
    OR is_admin()
  );

CREATE POLICY "api_usage_insert_service"
  ON api_usage FOR INSERT
  WITH CHECK (true); -- Managed by service role key from API routes

-- ============================================================
-- CREDIT_TRANSACTIONS policies
-- ============================================================
CREATE POLICY "credit_transactions_select"
  ON credit_transactions FOR SELECT
  USING (
    client_id = get_my_client_id()
    OR is_admin()
  );

CREATE POLICY "credit_transactions_insert_admin"
  ON credit_transactions FOR INSERT
  WITH CHECK (is_admin() OR true); -- Service role manages this

-- ============================================================
-- Supabase RPC: Deduct credits (atomic transaction)
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_credits(
  p_client_id UUID,
  p_credits DECIMAL,
  p_usage_id UUID,
  p_description TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  -- Deduct credits atomically
  UPDATE clients
  SET credit_balance = credit_balance - p_credits
  WHERE id = p_client_id
  RETURNING credit_balance INTO v_new_balance;

  -- Insert transaction log
  INSERT INTO credit_transactions (
    client_id, type, amount, balance_after, description, reference_id
  ) VALUES (
    p_client_id,
    'consumption',
    -p_credits,
    v_new_balance,
    p_description,
    p_usage_id
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
