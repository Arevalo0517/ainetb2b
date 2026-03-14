-- ============================================================
-- AiNet - Initial Schema Migration
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client', -- 'admin' | 'client'
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clients (Credit Balances)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'suspended' | 'inactive'
  credit_balance DECIMAL(10,2) DEFAULT 0,
  credit_threshold DECIMAL(10,2) DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Projects (Agents/Chatbots sold)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'chatbot-basico' | 'chatbot-intermedio' | 'chatbot-avanzado'
  status TEXT DEFAULT 'setup', -- 'setup' | 'active' | 'paused' | 'cancelled'
  price DECIMAL(10,2),

  -- n8n config
  n8n_workflow_id TEXT,
  n8n_webhook_url TEXT,

  -- AI config
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  system_prompt TEXT,
  max_tokens_per_message INTEGER DEFAULT 1000,

  -- Channel config
  channel TEXT,
  channel_config JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. API Usage (Detailed logs)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  model TEXT NOT NULL,
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  cost_usd DECIMAL(10,6),
  credits_consumed DECIMAL(10,4),

  endpoint TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Credit Transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'purchase' | 'consumption' | 'adjustment' | 'refund'
  amount DECIMAL(10,2) NOT NULL, -- Positive = recharge, Negative = consumption
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- Points to api_usage.id or payment.id
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_profile_id ON clients(profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_project_id ON api_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_client_id ON api_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_id ON credit_transactions(client_id);

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
