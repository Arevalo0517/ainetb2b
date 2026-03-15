'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { voiceApi, projectsApi } from '@/lib/api'
import type { CallLog, Project } from '@/types/database'

const PAGE_SIZE = 25

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  completed:     { background: 'rgba(16,185,129,0.15)',  color: '#10B981' },
  failed:        { background: 'rgba(239,68,68,0.15)',    color: '#EF4444' },
  'no-answer':   { background: 'rgba(239,68,68,0.15)',    color: '#EF4444' },
  'in-progress': { background: 'rgba(43,121,255,0.15)',   color: '#2B79FF' },
  initiated:     { background: 'rgba(245,158,11,0.15)',   color: '#F59E0B' },
  ringing:       { background: 'rgba(245,158,11,0.15)',   color: '#F59E0B' },
}

const STATUS_LABELS: Record<string, string> = {
  all: 'Todos', initiated: 'Iniciada', ringing: 'Timbrando',
  'in-progress': 'En curso', completed: 'Completada',
  failed: 'Fallida', 'no-answer': 'Sin respuesta',
}

function formatDuration(secs: number): string {
  if (secs === 0) return '0s'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

function CallDetailDrawer({ call, onClose }: { call: CallLog; onClose: () => void }) {
  return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 500, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative z-10 w-[480px] h-full overflow-y-auto"
          style={{ background: '#0B1120', borderLeft: '1px solid rgba(100,116,139,0.2)' }}>

          <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
            style={{ background: '#0B1120', borderColor: 'rgba(100,116,139,0.2)' }}>
            <h2 className="text-sm font-bold text-[#F8FAFC]">Detalle de Llamada</h2>
            <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"><X size={18} /></button>
          </div>

          <div className="p-5 space-y-5">
            {/* Metadata */}
            <div className="glass-card rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Metadatos</h3>
              {([
                ['ID', call.id],
                ['LiveKit Room', call.livekit_room_name ?? '—'],
                ['Twilio SID', call.twilio_call_sid ?? '—'],
                ['De', call.from_number ?? '—'],
                ['Hacia', call.to_number ?? '—'],
                ['Duración', formatDuration(call.duration_seconds)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-[#64748B]">{k}</span>
                  <span className="text-[#94A3B8] font-mono text-right max-w-[260px] break-all">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={call.direction === 'inbound'
                    ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' }
                    : { background: 'rgba(43,121,255,0.15)', color: '#2B79FF' }}>
                  {call.direction === 'inbound' ? 'Entrante' : 'Saliente'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={STATUS_STYLE[call.status] ?? { background: 'rgba(100,116,139,0.15)', color: '#64748B' }}>
                  {STATUS_LABELS[call.status] ?? call.status}
                </span>
              </div>
            </div>

            {/* Transcript */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Transcript</h3>
              {!call.transcript || call.transcript.length === 0 ? (
                <p className="text-xs text-[#64748B]">Sin transcript disponible</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {call.transcript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
                        style={msg.role === 'user'
                          ? { background: 'rgba(43,121,255,0.2)', color: '#E2E8F0' }
                          : { background: 'rgba(100,116,139,0.2)', color: '#94A3B8' }}>
                        <span className="block text-[10px] font-semibold mb-0.5"
                          style={{ color: msg.role === 'user' ? '#2B79FF' : '#64748B' }}>
                          {msg.role === 'user' ? 'Usuario' : 'Agente'}
                        </span>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recording */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Grabación</h3>
              {call.recording_url ? (
                <audio controls src={call.recording_url} className="w-full h-8" />
              ) : (
                <p className="text-xs text-[#64748B]">Sin grabación</p>
              )}
            </div>

            {/* Cost breakdown */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Costo</h3>
              {!call.cost_breakdown || Object.keys(call.cost_breakdown).length === 0 ? (
                <p className="text-xs text-[#64748B]">Sin datos de costo</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(call.cost_breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-[#64748B] capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-[#94A3B8]">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
  )
}

export default function VoiceCallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState('all')
  const [status, setStatus] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null)

  useEffect(() => {
    async function load() {
      setCalls([])
      setError('')
      try {
        const params: Parameters<typeof voiceApi.calls>[0] = { limit: 500 }
        if (direction !== 'all') params.direction = direction
        if (projectFilter !== 'all') params.project_id = projectFilter
        const [callData, projectData] = await Promise.all([
          voiceApi.calls(params) as Promise<CallLog[]>,
          projectsApi.list() as Promise<Project[]>,
        ])
        setCalls(callData)
        setProjects(projectData.filter(p => p.type.startsWith('voz-')))
      } catch {
        setError('Error al cargar llamadas')
      } finally {
        setLoading(false)
      }
    }
    setLoading(true)
    load()
  }, [direction, projectFilter])

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

  // Client-side filters (status and search are not supported by API)
  const filtered = calls.filter(c => {
    if (search) {
      const s = search.toLowerCase()
      if (!c.from_number?.toLowerCase().includes(s) && !c.to_number?.toLowerCase().includes(s)) return false
    }
    if (status !== 'all' && c.status !== status) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
        <div>
          <h1 className="text-lg font-bold text-[#F8FAFC]">Llamadas</h1>
          <p className="text-xs text-[#64748B]">Historial completo de llamadas de voz</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por número..."
              className="pl-8 pr-3 py-2 rounded-lg text-xs text-[#94A3B8] placeholder-[#475569] outline-none"
              style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', width: 200 }} />
          </div>

          <select value={direction} onChange={e => { setDirection(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg text-xs text-[#94A3B8] outline-none"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <option value="all">Dirección: Todas</option>
            <option value="inbound">Entrante</option>
            <option value="outbound">Saliente</option>
          </select>

          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg text-xs text-[#94A3B8] outline-none"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{k === 'all' ? 'Estado: Todos' : v}</option>
            ))}
          </select>

          <select value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg text-xs text-[#94A3B8] outline-none"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <option value="all">Proyecto: Todos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(100,116,139,0.15)' }}>
                  {['PROYECTO','DIRECCIÓN','DE','HACIA','DURACIÓN','ESTADO','CRÉDITOS','FECHA'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748B] tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-red-400">{error}</td></tr>
                ) : loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Cargando...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No hay llamadas registradas</td></tr>
                ) : paginated.map(call => (
                  <tr key={call.id}
                    style={{ borderBottom: '1px solid rgba(100,116,139,0.08)', cursor: 'pointer' }}
                    className="hover:bg-white/[0.02] transition-colors"
                    onClick={() => setSelectedCall(call)}>
                    <td className="px-4 py-3 text-[#94A3B8]">{projectMap[call.project_id] ?? call.project_id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={call.direction === 'inbound'
                          ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' }
                          : { background: 'rgba(43,121,255,0.15)', color: '#2B79FF' }}>
                        {call.direction === 'inbound' ? 'Entrante' : 'Saliente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{call.from_number ?? '—'}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{call.to_number ?? '—'}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={STATUS_STYLE[call.status] ?? { background: 'rgba(100,116,139,0.15)', color: '#64748B' }}>
                        {STATUS_LABELS[call.status] ?? call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{call.credits_used}</td>
                    <td className="px-4 py-3 text-[#64748B]">{formatDate(call.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
            <span className="text-xs text-[#64748B]">{filtered.length} llamadas</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1 rounded text-[#64748B] hover:text-[#F8FAFC] disabled:opacity-30 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs text-[#64748B]">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1 rounded text-[#64748B] hover:text-[#F8FAFC] disabled:opacity-30 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedCall && <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />}
      </AnimatePresence>
    </div>
  )
}
