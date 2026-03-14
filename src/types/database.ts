export type Role = 'admin' | 'client'
export type ClientStatus = 'active' | 'suspended' | 'inactive'
export type ProjectStatus = 'setup' | 'active' | 'paused' | 'cancelled'
export type ProjectType = 'chatbot-basico' | 'chatbot-intermedio' | 'chatbot-avanzado'
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

// Database generic type for Supabase
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> }
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> }
      api_usage: { Row: ApiUsage; Insert: Partial<ApiUsage>; Update: Partial<ApiUsage> }
      credit_transactions: { Row: CreditTransaction; Insert: Partial<CreditTransaction>; Update: Partial<CreditTransaction> }
    }
    Functions: {
      deduct_credits: {
        Args: { p_client_id: string; p_credits: number; p_usage_id: string; p_description: string }
        Returns: number
      }
      is_admin: { Args: Record<never, never>; Returns: boolean }
      get_my_client_id: { Args: Record<never, never>; Returns: string }
    }
  }
}
