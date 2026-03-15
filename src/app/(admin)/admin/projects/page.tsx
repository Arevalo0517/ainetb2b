'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, MessageSquare, Database, Zap,
  ExternalLink, X, Copy, Check, RefreshCw, Globe, Phone,
} from 'lucide-react'
import { projectsApi, clientsApi } from '@/lib/api'

interface Project {
  id: string
  name: string
  description: string | null
  type: string
  status: string
  channel: string | null
  ai_model: string
  n8n_webhook_url: string | null
  n8n_workflow_id: string | null
  system_prompt: string | null
  max_tokens_per_message: number
  price: number | null
  channel_config: Record<string, string> | null
  clients: { company_name: string; credit_balance?: number } | null
  created_at: string
}

interface ClientOption { id: string; company_name: string }

// ─── Type definitions ────────────────────────────────────────
const TYPES = [
  {
    value:       'chatbot-basico',
    label:       'Básico',
    tagline:     'FAQ + respuestas simples',
    description: 'Responde preguntas frecuentes con información estática. Sin conexiones externas.',
    icon:        MessageSquare,
    color:       '#2B79FF',
    model:       'gpt-4o-mini',
    maxTokens:   500,
    features:    ['System prompt personalizado', 'Respuestas de FAQ', 'Un canal'],
  },
  {
    value:       'chatbot-intermedio',
    label:       'Intermedio',
    tagline:     'Conectado a base de datos',
    description: 'Consulta y escribe en sistemas externos via n8n: CRMs, bases de datos, APIs.',
    icon:        Database,
    color:       '#10B981',
    model:       'gpt-4o-mini',
    maxTokens:   1500,
    features:    ['Todo lo del Básico', 'Integración con DB / CRM', 'Hasta 3 canales'],
  },
  {
    value:       'chatbot-avanzado',
    label:       'Avanzado',
    tagline:     'Agenda citas + procesa pagos',
    description: 'Ejecuta acciones reales: reserva calendarios, genera cobros, envía confirmaciones.',
    icon:        Zap,
    color:       '#8B5CF6',
    model:       'gpt-4o',
    maxTokens:   4000,
    features:    ['Todo lo del Intermedio', 'Agenda citas (Google Cal)', 'Procesa pagos (Stripe)', 'Canales ilimitados'],
  },
]

const TYPE_MAP = Object.fromEntries(TYPES.map(t => [t.value, t]))
const CHANNELS = ['WhatsApp', 'Web', 'Slack', 'REST API', 'Dashboard']
const FILTERS  = ['All Agents', 'Active', 'Standby']

// ─── Detail Modal ────────────────────────────────────────────
function DetailModal({ project, onClose, onUpdated }: {
  project: Project
  onClose: () => void
  onUpdated: () => void
}) {
  const [copied, setCopied]           = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [channelConfig, setChannelConfig] = useState<Record<string, string>>(
    (project.channel_config as Record<string, string>) ?? {}
  )
  const [form, setForm] = useState({
    name:            project.name,
    system_prompt:   project.system_prompt ?? '',
    n8n_webhook_url: project.n8n_webhook_url ?? '',
    n8n_workflow_id: project.n8n_workflow_id ?? '',
    max_tokens:      String(project.max_tokens_per_message ?? 1000),
    status:          project.status,
  })

  const typeInfo = TYPE_MAP[project.type]
  const base     = typeof window !== 'undefined' ? window.location.origin : ''

  async function save() {
    setSaving(true)
    try {
      await projectsApi.update(project.id, {
        name:                   form.name,
        system_prompt:          form.system_prompt || null,
        n8n_webhook_url:        form.n8n_webhook_url || null,
        n8n_workflow_id:        form.n8n_workflow_id || null,
        max_tokens_per_message: parseInt(form.max_tokens) || 1000,
        status:                 form.status,
        channel_config:         channelConfig,
      })
      onUpdated()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function generateToken() {
    const token = crypto.randomUUID().replace(/-/g, '')
    setChannelConfig(c => ({ ...c, verify_token: token }))
  }

  const inputCls   = "w-full px-3 py-2 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
  const inputStyle = { background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }
  const labelCls   = "block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5"

  function CopyBtn({ text, id }: { text: string; id: string }) {
    return (
      <button type="button" onClick={() => copy(text, id)}
        className="p-1.5 rounded text-[#64748B] hover:text-[#2B79FF] transition-colors shrink-0">
        {copied === id ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
      </button>
    )
  }

  function CodeRow({ label, value, id }: { label: string; value: string; id: string }) {
    return (
      <div>
        <p className="text-[10px] text-[#475569] mb-1">{label}</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,116,139,0.2)' }}>
          <span className="flex-1 text-xs font-mono text-[#94A3B8] truncate">{value}</span>
          <CopyBtn text={value} id={id} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="glass-card rounded-2xl p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#F8FAFC]">{project.name}</h2>
              <p className="text-xs text-[#64748B] mt-0.5">{project.clients?.company_name ?? '—'}</p>
            </div>
            <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC] transition-colors mt-0.5">
              <X size={18} />
            </button>
          </div>

          {/* Type badge */}
          {typeInfo && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: typeInfo.color + '12', border: `1px solid ${typeInfo.color}30` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: typeInfo.color + '20' }}>
                <typeInfo.icon size={16} style={{ color: typeInfo.color }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: typeInfo.color }}>{typeInfo.label} — {typeInfo.tagline}</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">{typeInfo.description}</p>
              </div>
            </div>
          )}

          {/* Project ID */}
          <div>
            <label className={labelCls}>Project ID (x-project-key para n8n)</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)' }}>
              <span className="flex-1 text-xs text-[#64748B] font-mono truncate">{project.id}</span>
              <CopyBtn text={project.id} id="project-id" />
            </div>
          </div>

          {/* Read-only info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'MODEL',   value: project.ai_model },
              { label: 'CHANNEL', value: project.channel ?? '—' },
              { label: 'MAX TOKENS', value: String(project.max_tokens_per_message) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg px-3 py-2 text-center"
                style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)' }}>
                <p className="text-[9px] font-semibold text-[#475569] uppercase tracking-wider">{label}</p>
                <p className="text-xs text-[#94A3B8] font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Editable fields */}
          <div>
            <label className={labelCls}>Agent Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className={inputCls} style={inputStyle}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="setup">Setup</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>n8n Webhook URL</label>
            <input value={form.n8n_webhook_url}
              onChange={e => setForm(f => ({ ...f, n8n_webhook_url: e.target.value }))}
              placeholder="https://your-n8n.com/webhook/..."
              className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className={labelCls}>n8n Workflow ID</label>
            <input value={form.n8n_workflow_id}
              onChange={e => setForm(f => ({ ...f, n8n_workflow_id: e.target.value }))}
              placeholder="workflow-id"
              className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className={labelCls}>System Prompt</label>
            <textarea value={form.system_prompt}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
              placeholder="You are a helpful assistant…"
              rows={4} className={inputCls + ' resize-none'} style={inputStyle} />
          </div>

          <div>
            <label className={labelCls}>Max Tokens por mensaje</label>
            <input type="number" min="100" max="128000" value={form.max_tokens}
              onChange={e => setForm(f => ({ ...f, max_tokens: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>

          {/* ── Channel Setup ─────────────────────────────── */}
          <div className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(100,116,139,0.2)' }}>
            <div className="px-4 py-3 flex items-center gap-2"
              style={{ background: 'rgba(100,116,139,0.08)', borderBottom: '1px solid rgba(100,116,139,0.15)' }}>
              {project.channel === 'WhatsApp' && <Phone size={13} className="text-[#10B981]" />}
              {project.channel === 'Web'       && <Globe size={13} className="text-[#2B79FF]" />}
              <span className="text-xs font-semibold text-[#F8FAFC]">
                Canal: {project.channel ?? '—'}
              </span>
            </div>

            <div className="p-4 space-y-4">

              {/* ── WEB ── */}
              {project.channel === 'Web' && (
                <>
                  <CodeRow
                    label="Endpoint (POST)"
                    value={`${base}/api/channels/web/${project.id}`}
                    id="web-endpoint"
                  />
                  <div>
                    <p className="text-[10px] text-[#475569] mb-1">Ejemplo de llamada</p>
                    <div className="px-3 py-2.5 rounded-lg text-[11px] font-mono text-[#94A3B8] leading-relaxed"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,116,139,0.2)' }}>
                      {`fetch("${base}/api/channels/web/${project.id}", {`}<br />
                      {`  method: "POST",`}<br />
                      {`  headers: { "Content-Type": "application/json" },`}<br />
                      {`  body: JSON.stringify({`}<br />
                      {`    message: "Hola",`}<br />
                      {`    history: []`}<br />
                      {`  })`}<br />
                      {`})`}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Allowed Origin (opcional)</label>
                    <input
                      value={channelConfig.allowed_origin ?? ''}
                      onChange={e => setChannelConfig(c => ({ ...c, allowed_origin: e.target.value }))}
                      placeholder="https://mi-cliente.com"
                      className={inputCls} style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* ── WHATSAPP ── */}
              {project.channel === 'WhatsApp' && (
                <>
                  <CodeRow
                    label="Webhook URL (pegar en Meta for Developers)"
                    value={`${base}/api/channels/whatsapp/${project.id}`}
                    id="wa-webhook"
                  />
                  <div>
                    <label className={labelCls}>Verify Token</label>
                    <div className="flex gap-2">
                      <input
                        value={channelConfig.verify_token ?? ''}
                        onChange={e => setChannelConfig(c => ({ ...c, verify_token: e.target.value }))}
                        placeholder="token-secreto"
                        className={inputCls} style={inputStyle}
                      />
                      <button type="button" onClick={generateToken}
                        title="Generar token aleatorio"
                        className="px-3 rounded-lg text-[#64748B] hover:text-[#2B79FF] transition-colors shrink-0"
                        style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Phone Number ID</label>
                    <input
                      value={channelConfig.phone_number_id ?? ''}
                      onChange={e => setChannelConfig(c => ({ ...c, phone_number_id: e.target.value }))}
                      placeholder="123456789012345"
                      className={inputCls} style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>WhatsApp Token</label>
                    <input
                      type="password"
                      value={channelConfig.whatsapp_token ?? ''}
                      onChange={e => setChannelConfig(c => ({ ...c, whatsapp_token: e.target.value }))}
                      placeholder="EAAxxxxxx…"
                      className={inputCls} style={inputStyle}
                    />
                  </div>
                  {/* Flow explanation by agent type */}
                  <div className="rounded-lg overflow-hidden"
                    style={{ border: '1px solid rgba(100,116,139,0.2)' }}>
                    <div className="px-3 py-2" style={{ background: 'rgba(100,116,139,0.1)' }}>
                      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">¿Necesitas n8n?</p>
                    </div>
                    <div className="px-3 py-3 space-y-3">
                      {/* Básico */}
                      <div className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: '#2B79FF20' }}>
                          <MessageSquare size={10} style={{ color: '#2B79FF' }} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-[#94A3B8]">Básico — Sin n8n</p>
                          <p className="text-[11px] text-[#64748B] mt-0.5">
                            El Webhook URL de arriba va directo en Meta. El agente responde
                            solo con lo que tiene en su System Prompt.
                          </p>
                          <p className="text-[10px] font-mono text-[#475569] mt-1">
                            WhatsApp → AiNet → OpenAI → WhatsApp
                          </p>
                        </div>
                      </div>
                      <div className="h-px" style={{ background: 'rgba(100,116,139,0.15)' }} />
                      {/* Intermedio / Avanzado */}
                      <div className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: '#10B98120' }}>
                          <Database size={10} style={{ color: '#10B981' }} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-[#94A3B8]">Intermedio / Avanzado — Con n8n</p>
                          <p className="text-[11px] text-[#64748B] mt-0.5">
                            En Meta pon el webhook de n8n (no el de arriba). n8n recibe
                            el mensaje, consulta tu DB / agenda / pagos, luego llama a
                            nuestro proxy con el contexto extra, y responde al usuario.
                          </p>
                          <p className="text-[10px] font-mono text-[#475569] mt-1">
                            WhatsApp → n8n → (DB/Cal/Stripe) → AiNet proxy → OpenAI → n8n → WhatsApp
                          </p>
                          <p className="text-[11px] text-[#64748B] mt-1.5">
                            En n8n usa el header{' '}
                            <span className="font-mono text-[#94A3B8]">x-project-key: {project.id}</span>
                            {' '}al llamar al proxy para identificar este agente y descontar créditos.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-3 rounded-lg text-[11px] text-[#64748B] leading-relaxed space-y-1"
                    style={{ background: 'rgba(43,121,255,0.05)', border: '1px solid rgba(43,121,255,0.15)' }}>
                    <p className="font-semibold text-[#94A3B8]">Pasos en Meta for Developers:</p>
                    <p>1. Ve a <span className="text-[#2B79FF]">Tu App → WhatsApp → Configuration</span></p>
                    <p>2. En <span className="text-[#94A3B8]">Webhook</span>: pega el URL correspondiente a tu tipo de agente</p>
                    <p>3. En <span className="text-[#94A3B8]">Verify token</span>: pega el mismo token de arriba</p>
                    <p>4. Activa el campo <span className="text-[#94A3B8] font-medium">messages</span></p>
                    <p>5. Copia el <span className="text-[#94A3B8]">Phone Number ID</span> y el <span className="text-[#94A3B8]">System User Token</span> en los campos de arriba</p>
                  </div>
                </>
              )}

              {/* ── REST API ── */}
              {project.channel === 'REST API' && (
                <>
                  <CodeRow
                    label="Endpoint (POST)"
                    value={`${base}/api/proxy/openai`}
                    id="rest-endpoint"
                  />
                  <CodeRow
                    label="Header requerido"
                    value={`x-project-key: ${project.id}`}
                    id="rest-header"
                  />
                  <div className="px-3 py-2.5 rounded-lg text-[11px] font-mono text-[#94A3B8] leading-relaxed"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,116,139,0.2)' }}>
                    {`curl -X POST ${base}/api/proxy/openai \\`}<br />
                    {`  -H "Content-Type: application/json" \\`}<br />
                    {`  -H "x-project-key: ${project.id}" \\`}<br />
                    {`  -d '{"model":"${project.ai_model}","messages":[{"role":"user","content":"Hola"}]}'`}
                  </div>
                </>
              )}

              {/* ── Others ── */}
              {!['Web','WhatsApp','REST API'].includes(project.channel ?? '') && (
                <p className="text-xs text-[#475569] text-center py-2">
                  Configuración de canal <span className="text-[#64748B] font-medium">{project.channel}</span> próximamente.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8]"
              style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
              Cancel
            </button>
            <motion.button onClick={save} disabled={saving}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
              style={{ background: '#2B79FF' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── New Agent Modal ─────────────────────────────────────────
function NewAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [clients, setClients]     = useState<ClientOption[]>([])
  const [selectedType, setSelectedType] = useState(TYPES[0])
  const [form, setForm] = useState({
    client_id:   '',
    name:        '',
    channel:     'WhatsApp',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    clientsApi.list().then(data => setClients(data as ClientOption[])).catch(console.error)
  }, [])

  function pickType(t: typeof TYPES[0]) {
    setSelectedType(t)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await projectsApi.create({
        client_id:              form.client_id,
        name:                   form.name,
        type:                   selectedType.value,
        ai_model:               selectedType.model,
        max_tokens_per_message: selectedType.maxTokens,
        channel:                form.channel,
        description:            form.description || null,
        status:                 'active',
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating agent')
      setLoading(false)
    }
  }

  const inputCls  = "w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
  const inputStyle = { background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="glass-card rounded-2xl p-6">

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[#F8FAFC]">New Agent</h2>
            <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"><X size={18} /></button>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Type selector */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-2">Tipo de Agente *</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(t => {
                  const Icon    = t.icon
                  const active  = selectedType.value === t.value
                  return (
                    <button key={t.value} type="button" onClick={() => pickType(t)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all"
                      style={active
                        ? { background: t.color + '18', border: `2px solid ${t.color}60` }
                        : { background: 'rgba(100,116,139,0.08)', border: '2px solid rgba(100,116,139,0.15)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: active ? t.color + '25' : 'rgba(100,116,139,0.12)' }}>
                        <Icon size={16} style={{ color: active ? t.color : '#64748B' }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: active ? t.color : '#94A3B8' }}>{t.label}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5 leading-tight">{t.tagline}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected type detail */}
              <div className="mt-2 px-3 py-2.5 rounded-lg"
                style={{ background: selectedType.color + '08', border: `1px solid ${selectedType.color}20` }}>
                <p className="text-[11px] text-[#64748B]">{selectedType.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedType.features.map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: selectedType.color + '18', color: selectedType.color }}>
                      {f}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[#475569] mt-2">
                  Modelo: <span className="text-[#94A3B8] font-medium">{selectedType.model}</span>
                  {' · '}Max tokens: <span className="text-[#94A3B8] font-medium">{selectedType.maxTokens.toLocaleString()}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Cliente *</label>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                required className={inputCls} style={inputStyle}>
                <option value="">Selecciona un cliente…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Nombre del Agente *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Customer Service Bot" required className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Canal</label>
              <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                className={inputCls} style={inputStyle}>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Breve descripción del agente…" rows={2}
                className={inputCls + ' resize-none'} style={inputStyle} />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8]"
                style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                Cancel
              </button>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#2B79FF' }}>
                {loading ? 'Creating…' : 'Create Agent'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeFilter, setActiveFilter] = useState('All Agents')
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [detail, setDetail]       = useState<Project | null>(null)

  async function fetchProjects() {
    setLoading(true)
    try {
      const data = await projectsApi.list() as Project[]
      setProjects(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  async function toggleStatus(project: Project) {
    const next = project.status === 'active' ? 'paused' : 'active'
    setProjects(ps => ps.map(p => p.id === project.id ? { ...p, status: next } : p))
    try {
      await projectsApi.update(project.id, { status: next })
    } catch {
      setProjects(ps => ps.map(p => p.id === project.id ? { ...p, status: project.status } : p))
    }
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clients?.company_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      activeFilter === 'All Agents' ||
      (activeFilter === 'Active'  && p.status === 'active') ||
      (activeFilter === 'Standby' && p.status !== 'active')
    return matchSearch && matchFilter
  })

  return (
    <div className="flex-1 overflow-auto p-6 space-y-5">
      {showModal && <NewAgentModal onClose={() => setShowModal(false)} onCreated={fetchProjects} />}
      {detail && (
        <DetailModal
          project={detail}
          onClose={() => setDetail(null)}
          onUpdated={() => { setDetail(null); fetchProjects() }}
        />
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#F8FAFC]">AI Agents / Projects</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents…"
              className="pl-8 pr-3 py-2 rounded-lg text-xs text-[#94A3B8] placeholder-[#475569] outline-none w-52"
              style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }} />
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
            <Plus size={15} /> New Agent
          </motion.button>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={activeFilter === f
              ? { background: 'rgba(43,121,255,0.2)', color: '#2B79FF', border: '1px solid rgba(43,121,255,0.3)' }
              : { color: '#64748B', border: '1px solid transparent' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-[#64748B]">Loading…</div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-3 py-16 text-center text-sm text-[#64748B]">
                {projects.length === 0 ? 'No agents yet. Create your first one.' : 'No results.'}
              </motion.div>
            )}

            {filtered.map((project, i) => {
              const isActive  = project.status === 'active'
              const typeInfo  = TYPE_MAP[project.type]
              const color     = typeInfo?.color ?? '#2B79FF'
              const Icon      = typeInfo?.icon  ?? MessageSquare
              return (
                <motion.div key={project.id} layout
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${color}20` }}
                  className="glass-card rounded-xl p-5 flex flex-col gap-4">

                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: color + '20', border: `1px solid ${color}40` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                      <span className="relative flex h-1.5 w-1.5">
                        {isActive && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ background: '#10B981' }} />
                        )}
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                          style={{ background: isActive ? '#10B981' : '#F59E0B' }} />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: isActive ? '#10B981' : '#F59E0B' }}>
                        {isActive ? 'Online' : 'Standby'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#F8FAFC]">{project.name}</h3>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{project.clients?.company_name ?? '—'}</p>
                  </div>

                  {/* Type badge */}
                  {typeInfo && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ background: color + '10', border: `1px solid ${color}25` }}>
                      <Icon size={12} style={{ color }} />
                      <div>
                        <span className="text-[11px] font-semibold" style={{ color }}>{typeInfo.label}</span>
                        <span className="text-[10px] text-[#64748B]"> · {typeInfo.tagline}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">MODEL</span>
                      <span className="text-[#94A3B8] font-medium">{project.ai_model}</span>
                    </div>
                    <div className="h-px" style={{ background: 'rgba(100,116,139,0.15)' }} />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">CHANNEL</span>
                      <span className="text-[#94A3B8]">{project.channel ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">MAX TOKENS</span>
                      <span className="text-[#94A3B8]">{project.max_tokens_per_message.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isActive} onChange={() => toggleStatus(project)} className="sr-only peer" />
                      <div className="w-9 h-5 rounded-full transition-all peer-checked:bg-[#2B79FF] bg-[#1E293B] border border-[rgba(100,116,139,0.3)]
                        after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full
                        after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                    <button onClick={() => setDetail(project)}
                      className="flex items-center gap-1 text-xs text-[#2B79FF] hover:underline font-medium">
                      View Details <ExternalLink size={11} />
                    </button>
                  </div>
                </motion.div>
              )
            })}

            {/* Add New Agent card */}
            <motion.div key="add-new" layout
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(43,121,255,0.15)' }}
              onClick={() => setShowModal(true)}
              className="rounded-xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[200px]"
              style={{ border: '2px dashed rgba(43,121,255,0.3)', background: 'rgba(43,121,255,0.04)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(43,121,255,0.15)', border: '1px solid rgba(43,121,255,0.3)' }}>
                <Plus size={22} className="text-[#2B79FF]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#F8FAFC]">Add New Agent</p>
                <p className="text-xs text-[#64748B] mt-0.5">Deploy a new AI chatbot</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
