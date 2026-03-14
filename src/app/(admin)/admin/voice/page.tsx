'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Phone, PhoneCall, Clock, CreditCard, PhoneOutgoing, X } from 'lucide-react'
import { MetricCard } from '@/components/shared/MetricCard'
import { voiceApi, projectsApi } from '@/lib/api'
import type { CallLog, Project, PhoneNumber } from '@/types/database'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

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

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  completed:     { background: 'rgba(16,185,129,0.15)',  color: '#10B981' },
  failed:        { background: 'rgba(239,68,68,0.15)',    color: '#EF4444' },
  'no-answer':   { background: 'rgba(239,68,68,0.15)',    color: '#EF4444' },
  'in-progress': { background: 'rgba(43,121,255,0.15)',   color: '#2B79FF' },
  initiated:     { background: 'rgba(245,158,11,0.15)',   color: '#F59E0B' },
  ringing:       { background: 'rgba(245,158,11,0.15)',   color: '#F59E0B' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs">
      <p className="text-[#64748B] mb-1">{label}</p>
      <p className="text-[#2B79FF] font-semibold">{payload[0].value} llamadas</p>
    </div>
  )
}

function InitiateCallModal({
  onClose,
  voiceProjects,
}: {
  onClose: () => void
  voiceProjects: Project[]
}) {
  const [projectId, setProjectId] = useState('')
  const [toNumber, setToNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectId || !toNumber) { setError('Selecciona un proyecto y escribe el número destino'); return }
    setLoading(true)
    setError('')
    try {
      await voiceApi.initiateCall({ project_id: projectId, to_number: toNumber })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar llamada')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[#F8FAFC]">Iniciar Llamada</h2>
            <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"><X size={18} /></button>
          </div>

          {success && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs text-[#10B981]"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              Llamada iniciada correctamente
            </div>
          )}
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Proyecto de Voz *</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
                <option value="">Seleccionar proyecto...</option>
                {voiceProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Número destino *</label>
              <input value={toNumber} onChange={e => setToNumber(e.target.value)}
                placeholder="+1 555 123 4567" required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }} />
            </div>
            <button type="submit" disabled={loading || success}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
              {loading ? 'Iniciando...' : 'Iniciar Llamada'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default function VoiceOverviewPage() {
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([])
  const [allCalls, setAllCalls] = useState<CallLog[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [voiceProjects, setVoiceProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [recent, all, numbers, projects] = await Promise.all([
          voiceApi.calls({ limit: 10 }) as Promise<CallLog[]>,
          voiceApi.calls({ limit: 500 }) as Promise<CallLog[]>,
          voiceApi.phoneNumbers() as Promise<PhoneNumber[]>,
          projectsApi.list() as Promise<Project[]>,
        ])
        setRecentCalls(recent)
        setAllCalls(all)
        setPhoneNumbers(numbers)
        setVoiceProjects(projects.filter(p => p.type.startsWith('voz-')))
      } catch {
        // empty state shown on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Metrics derived from the 500-row fetch
  // Note: capped at 500 calls; for very high-volume clients some metrics may undercount
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const llamadasHoy = allCalls.filter(c => c.started_at?.slice(0, 10) === today).length
  const minutosConsumidos = (allCalls.reduce((acc, c) => acc + c.duration_seconds, 0) / 60).toFixed(1)
  const numerosActivos = phoneNumbers.filter(n => n.status === 'active').length
  const creditosMes = allCalls
    .filter(c => c.started_at && c.started_at.slice(0, 10) >= firstOfMonth)
    .reduce((acc, c) => acc + c.credits_used, 0)
    .toFixed(1)

  // Chart: calls per day last 7 days, aggregated client-side
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
  const chartData = last7.map(date => ({
    day: date.slice(5), // MM-DD
    llamadas: allCalls.filter(c => c.started_at?.slice(0, 10) === date).length,
  }))

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
        <div>
          <h1 className="text-lg font-bold text-[#F8FAFC]">Voz & Telefonía</h1>
          <p className="text-xs text-[#64748B]">Gestión de agentes de voz y llamadas</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
          <PhoneOutgoing size={15} /> Iniciar Llamada
        </motion.button>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Llamadas Hoy"        value={String(llamadasHoy)}     subtitle="Llamadas del día"    icon={<Phone size={18}/>}      delay={0} />
          <MetricCard title="Minutos Consumidos"  value={minutosConsumidos}     subtitle="Total acumulado"      icon={<Clock size={18}/>}       delay={0.1} />
          <MetricCard title="Números Activos"     value={String(numerosActivos)} subtitle="Números de Twilio"  icon={<PhoneCall size={18}/>}   delay={0.2} />
          <MetricCard title="Créditos de Voz"     value={creditosMes}           subtitle="Mes actual"           icon={<CreditCard size={18}/>}  delay={0.3} />
        </div>

        {/* Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Llamadas últimos 7 días</h2>
            <p className="text-xs text-[#64748B]">Volumen diario de llamadas</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="voiceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2B79FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2B79FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="llamadas" stroke="#2B79FF" strokeWidth={2}
                fill="url(#voiceGrad)" dot={false} activeDot={{ r: 4, fill: '#2B79FF' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent calls table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Llamadas Recientes</h2>
            <Link href="/admin/voice/calls" className="text-xs text-[#2B79FF] hover:underline">Ver todas →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(100,116,139,0.15)' }}>
                  {['PROYECTO','DIRECCIÓN','NÚMERO','DURACIÓN','ESTADO','CRÉDITOS','FECHA'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#64748B] tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Cargando...</td></tr>
                ) : recentCalls.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No hay llamadas registradas</td></tr>
                ) : recentCalls.map(call => (
                  <tr key={call.id} style={{ borderBottom: '1px solid rgba(100,116,139,0.08)' }}
                    className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[#94A3B8] font-mono">{call.project_id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={call.direction === 'inbound'
                          ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' }
                          : { background: 'rgba(43,121,255,0.15)', color: '#2B79FF' }}>
                        {call.direction === 'inbound' ? 'Entrante' : 'Saliente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{call.to_number ?? call.from_number ?? '—'}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={STATUS_STYLE[call.status] ?? { background: 'rgba(100,116,139,0.15)', color: '#64748B' }}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{call.credits_used}</td>
                    <td className="px-4 py-3 text-[#64748B]">{formatDate(call.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {showModal && (
        <InitiateCallModal
          onClose={() => setShowModal(false)}
          voiceProjects={voiceProjects}
        />
      )}
    </div>
  )
}
