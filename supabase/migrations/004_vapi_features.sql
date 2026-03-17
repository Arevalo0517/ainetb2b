-- ============================================================
-- AiNet - Voice Agent VAPI-inspired features
-- Adds: firstMessageMode, speaking/interruption tuning,
--       background audio, voicemail detection, analysis plan
-- ============================================================

-- voice_configs: new behavior + analysis fields
ALTER TABLE voice_configs
  ADD COLUMN IF NOT EXISTS first_message_mode TEXT NOT NULL DEFAULT 'assistant-speaks-first'
    CHECK (first_message_mode IN ('assistant-speaks-first', 'assistant-waits-for-user')),
  ADD COLUMN IF NOT EXISTS wait_seconds_before_speaking DECIMAL(4,2) NOT NULL DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS interruption_num_words INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS background_sound TEXT NOT NULL DEFAULT 'off'
    CHECK (background_sound IN ('off', 'office')),
  ADD COLUMN IF NOT EXISTS background_denoising_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voicemail_detection_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS analysis_summary_prompt TEXT,
  ADD COLUMN IF NOT EXISTS analysis_structured_schema JSONB,
  ADD COLUMN IF NOT EXISTS analysis_success_prompt TEXT;

-- call_logs: store post-call analysis results
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS analysis_summary TEXT,
  ADD COLUMN IF NOT EXISTS analysis_structured_data JSONB,
  ADD COLUMN IF NOT EXISTS analysis_success TEXT;
