export type Role = 'admin' | 'client'
export type ClientStatus = 'active' | 'suspended' | 'inactive'
export type ProjectStatus = 'setup' | 'active' | 'paused' | 'cancelled'
export type ProjectType =
  | 'chatbot-basico' | 'chatbot-intermedio' | 'chatbot-avanzado'
  | 'voz-basico' | 'voz-intermedio' | 'voz-avanzado'
export type TransactionType = 'purchase' | 'consumption' | 'adjustment' | 'refund'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  company_name: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  profile_id: string | null
  company_name: string
  industry: string | null
  status: ClientStatus
  credit_balance: number
  credit_threshold: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  description: string | null
  type: ProjectType
  status: ProjectStatus
  price: number | null

  // n8n
  n8n_workflow_id: string | null
  n8n_webhook_url: string | null

  // AI
  ai_model: string
  system_prompt: string | null
  max_tokens_per_message: number

  // Channel
  channel: string | null
  channel_config: Record<string, unknown>

  created_at: string
  updated_at: string
}

export interface ApiUsage {
  id: string
  project_id: string
  client_id: string
  model: string
  tokens_input: number
  tokens_output: number
  cost_usd: number | null
  credits_consumed: number | null
  endpoint: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CreditTransaction {
  id: string
  client_id: string
  type: TransactionType
  amount: number
  balance_after: number
  description: string | null
  reference_id: string | null
  created_by: string | null
  created_at: string
}

// Voice agent types
export type CallDirection = 'inbound' | 'outbound'
export type CallStatus = 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer'
export type PhoneNumberStatus = 'active' | 'released' | 'pending'

export interface PhoneNumber {
  id: string
  project_id: string | null
  client_id: string
  phone_number: string
  twilio_sid: string
  friendly_name: string | null
  country_code: string
  status: PhoneNumberStatus
  sip_domain: string | null
  created_at: string
  updated_at: string
}

export interface CallLog {
  id: string
  project_id: string
  client_id: string | null
  direction: CallDirection
  status: CallStatus
  from_number: string | null
  to_number: string | null
  duration_seconds: number
  credits_used: number
  cost_breakdown: Record<string, number>
  recording_url: string | null
  recording_duration_seconds: number | null
  transcript: Array<{ role: string; content: string; timestamp: number }> | null
  summary: string | null
  livekit_room_id: string | null
  livekit_room_name: string | null
  twilio_call_sid: string | null
  metadata: Record<string, unknown>
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface VoiceConfig {
  id: string
  project_id: string
  voice_provider: string
  stt_model: string
  stt_language: string
  tts_model: string
  tts_language: string
  voice_system_prompt: string | null
  voice_ai_model: string
  voice_max_tokens: number
  n8n_voice_webhook_url: string | null
  n8n_voice_workflow_id: string | null
  voice_tools: Array<{
    name: string
    description: string
    parameters: Record<string, unknown>
    n8n_endpoint?: string
  }>
  greeting_message: string
  end_call_phrases: string[]
  max_call_duration_seconds: number
  silence_timeout_seconds: number
  transfer_number: string | null
  livekit_room_prefix: string | null
  created_at: string
  updated_at: string
}

// Database generic type for Supabase
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> }
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> }
      api_usage: { Row: ApiUsage; Insert: Partial<ApiUsage>; Update: Partial<ApiUsage> }
      credit_transactions: { Row: CreditTransaction; Insert: Partial<CreditTransaction>; Update: Partial<CreditTransaction> }
      phone_numbers: { Row: PhoneNumber; Insert: Partial<PhoneNumber>; Update: Partial<PhoneNumber> }
      call_logs: { Row: CallLog; Insert: Partial<CallLog>; Update: Partial<CallLog> }
      voice_configs: { Row: VoiceConfig; Insert: Partial<VoiceConfig>; Update: Partial<VoiceConfig> }
    }
    Functions: {
      deduct_credits: {
        Args: { p_client_id: string; p_credits: number; p_usage_id: string; p_description: string }
        Returns: number
      }
      deduct_voice_credits: {
        Args: { p_client_id: string; p_credits: number; p_call_id: string; p_description: string }
        Returns: number
      }
      is_admin: { Args: Record<never, never>; Returns: boolean }
      get_my_client_id: { Args: Record<never, never>; Returns: string }
    }
  }
}
