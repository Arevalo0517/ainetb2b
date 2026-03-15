-- ============================================================
-- AiNet - Voice Agents Schema
-- ============================================================

-- ============================================================
-- PHONE_NUMBERS table
-- ============================================================
CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL UNIQUE,
  friendly_name TEXT,
  country_code TEXT DEFAULT 'US',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'released', 'pending')),
  sip_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_numbers_project ON phone_numbers(project_id);
CREATE INDEX idx_phone_numbers_number ON phone_numbers(phone_number);
CREATE INDEX idx_phone_numbers_client ON phone_numbers(client_id);

-- ============================================================
-- CALL_LOGS table
-- ============================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer')),

  from_number TEXT,
  to_number TEXT,

  duration_seconds INTEGER DEFAULT 0,
  credits_used DECIMAL(10,4) DEFAULT 0,
  cost_breakdown JSONB DEFAULT '{}',

  recording_url TEXT,
  recording_duration_seconds INTEGER,
  transcript JSONB,
  summary TEXT,

  livekit_room_id TEXT,
  livekit_room_name TEXT,
  twilio_call_sid TEXT,

  metadata JSONB DEFAULT '{}',

  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_logs_project ON call_logs(project_id);
CREATE INDEX idx_call_logs_client ON call_logs(client_id);
CREATE INDEX idx_call_logs_created ON call_logs(created_at);
CREATE INDEX idx_call_logs_direction ON call_logs(direction);

-- ============================================================
-- VOICE_CONFIGS table (1:1 with projects)
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,

  -- STT
  voice_provider TEXT NOT NULL DEFAULT 'deepgram',
  stt_model TEXT NOT NULL DEFAULT 'nova-2',
  stt_language TEXT NOT NULL DEFAULT 'es',

  -- TTS
  tts_model TEXT NOT NULL DEFAULT 'aura-asteria-en',
  tts_language TEXT NOT NULL DEFAULT 'es',

  -- LLM for voice
  voice_system_prompt TEXT,
  voice_ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  voice_max_tokens INTEGER NOT NULL DEFAULT 300,

  -- n8n tools for voice
  n8n_voice_webhook_url TEXT,
  n8n_voice_workflow_id TEXT,
  voice_tools JSONB NOT NULL DEFAULT '[]',

  -- Behavior
  greeting_message TEXT NOT NULL DEFAULT 'Hola, ¿en qué le puedo ayudar?',
  end_call_phrases TEXT[] DEFAULT ARRAY['adiós', 'hasta luego', 'bye', 'chao'],
  max_call_duration_seconds INTEGER NOT NULL DEFAULT 600,
  silence_timeout_seconds INTEGER NOT NULL DEFAULT 30,
  transfer_number TEXT,

  -- LiveKit
  livekit_room_prefix TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Enable RLS on new tables
-- ============================================================
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PHONE_NUMBERS policies
-- ============================================================
CREATE POLICY "phone_numbers_select"
  ON phone_numbers FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());

CREATE POLICY "phone_numbers_insert_admin"
  ON phone_numbers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "phone_numbers_update_admin"
  ON phone_numbers FOR UPDATE
  USING (is_admin());

CREATE POLICY "phone_numbers_delete_admin"
  ON phone_numbers FOR DELETE
  USING (is_admin());

-- ============================================================
-- CALL_LOGS policies
-- ============================================================
CREATE POLICY "call_logs_select"
  ON call_logs FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());

CREATE POLICY "call_logs_insert_service"
  ON call_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "call_logs_update_service"
  ON call_logs FOR UPDATE
  USING (true);

-- ============================================================
-- VOICE_CONFIGS policies
-- ============================================================
CREATE POLICY "voice_configs_select"
  ON voice_configs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id = get_my_client_id()
    )
    OR is_admin()
  );

CREATE POLICY "voice_configs_insert_admin"
  ON voice_configs FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "voice_configs_update_admin"
  ON voice_configs FOR UPDATE
  USING (is_admin());

CREATE POLICY "voice_configs_delete_admin"
  ON voice_configs FOR DELETE
  USING (is_admin());

-- ============================================================
-- RPC: Deduct voice credits (atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_voice_credits(
  p_client_id UUID,
  p_credits DECIMAL,
  p_call_id UUID,
  p_description TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  UPDATE clients
  SET credit_balance = credit_balance - p_credits
  WHERE id = p_client_id
  RETURNING credit_balance INTO v_new_balance;

  INSERT INTO credit_transactions (
    client_id, type, amount, balance_after, description, reference_id
  ) VALUES (
    p_client_id,
    'consumption',
    -p_credits,
    v_new_balance,
    p_description,
    p_call_id
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_configs_updated_at
  BEFORE UPDATE ON voice_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
