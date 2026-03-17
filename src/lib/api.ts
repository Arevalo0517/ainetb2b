/**
 * Frontend API client — wraps fetch calls to backend Route Handlers.
 */

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? ''

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'API error')
  }
  return res.json()
}

// ─── Clients ────────────────────────────────────────────────
export const clientsApi = {
  list:   (params?: { status?: string }) =>
    apiFetch(`/api/clients${params?.status ? `?status=${params.status}` : ''}`),
  get:    (id: string) => apiFetch(`/api/clients/${id}`),
  create: (data: Record<string, unknown>) => apiFetch('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch(`/api/clients/${id}`, { method: 'DELETE' }),
}

// ─── Projects ───────────────────────────────────────────────
export const projectsApi = {
  list:   (params?: { client_id?: string; status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return apiFetch(`/api/projects${qs ? `?${qs}` : ''}`)
  },
  get:    (id: string) => apiFetch(`/api/projects/${id}`),
  create: (data: Record<string, unknown>) => apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
}

// ─── Credits ────────────────────────────────────────────────
export const creditsApi = {
  transactions: (clientId: string, limit = 50) => apiFetch(`/api/credits?client_id=${clientId}&limit=${limit}`),
  add: (data: { client_id: string; amount: number; description?: string; type?: string }) =>
    apiFetch('/api/credits', { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Usage ──────────────────────────────────────────────────
export const usageApi = {
  get: (params: { client_id?: string; project_id?: string; group_by?: 'day' | 'month'; from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return apiFetch(`/api/usage?${qs}`)
  },
}

// ─── Voice ──────────────────────────────────────────────────
export const voiceApi = {
  // Call logs
  calls: (params?: { client_id?: string; project_id?: string; direction?: string; limit?: number; offset?: number }) => {
    const clean: Record<string, string> = {}
    if (params) {
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined) clean[k] = String(v) })
    }
    const qs = new URLSearchParams(clean).toString()
    return apiFetch(`/api/voice/calls${qs ? `?${qs}` : ''}`)
  },
  callDetail: (id: string) => apiFetch(`/api/voice/calls/${id}`),

  // Outbound
  initiateCall: (data: { project_id: string; to_number: string; metadata?: Record<string, unknown> }) =>
    apiFetch('/api/voice/outbound', { method: 'POST', body: JSON.stringify(data) }),

  // Phone numbers
  phoneNumbers: (params?: { client_id?: string }) =>
    apiFetch(`/api/voice/phone-numbers${params?.client_id ? `?client_id=${params.client_id}` : ''}`),
  purchaseNumber: (data: { client_id: string; project_id?: string; country_code?: string; area_code?: string }) =>
    apiFetch('/api/voice/phone-numbers', { method: 'POST', body: JSON.stringify(data) }),
  reassignNumber: (id: string, data: { project_id: string | null }) =>
    apiFetch(`/api/voice/phone-numbers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  releaseNumber: (id: string) =>
    apiFetch(`/api/voice/phone-numbers/${id}`, { method: 'DELETE' }),
  syncNumbers: (client_id: string) =>
    apiFetch('/api/voice/phone-numbers/sync', { method: 'POST', body: JSON.stringify({ client_id }) }),

  // Voice config
  getConfig: (projectId: string) => apiFetch(`/api/voice/config/${projectId}`),
  updateConfig: (projectId: string, data: Record<string, unknown>) =>
    apiFetch(`/api/voice/config/${projectId}`, { method: 'PUT', body: JSON.stringify(data) }),
}
