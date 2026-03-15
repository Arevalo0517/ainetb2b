'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, Zap, DollarSign, Activity } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { MetricCard } from '@/components/shared/MetricCard'
import { usageApi, clientsApi } from '@/lib/api'

interface UsageGrouped {
  period: string
  calls: number
  tokens_input: number
  tokens_output: number
  cost_usd: number
  credits_consumed: number
}

interface UsageTotals {
  calls: number
  tokens_input: number
  tokens_output: number
  cost_usd: number
  credits_consumed: number
}

interface Client {
  id: string
  company_name: string
  credit_balance: number
  status: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs border-[#2B79FF]/20">
      <p className="text-[#94A3B8] mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

const RANGES = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export default function ReportsPage() {
  const [grouped, setGrouped]   = useState<UsageGrouped[]>([])
  const [totals, setTotals]     = useState<UsageTotals | null>(null)
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [range, setRange]       = useState(30)
  const [groupBy, setGroupBy]   = useState<'day' | 'month'>('day')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const from = new Date()
        from.setDate(from.getDate() - range)

        const [usageRes, clientsRes] = await Promise.all([
          usageApi.get({ group_by: groupBy, from: from.toISOString() }) as Promise<{ grouped: UsageGrouped[]; totals: UsageTotals }>,
          clientsApi.list() as Promise<Client[]>,
        ])

        setGrouped(usageRes.grouped ?? [])
        setTotals(usageRes.totals ?? null)
        setClients(clientsRes)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [range, groupBy])

  const revenue = (totals?.credits_consumed ?? 0) * 0.01
  const shortPeriod = (p: string) => groupBy === 'day' ? p.slice(5) : p // MM-DD or YYYY-MM

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Reportes</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Uso de la plataforma y consumo de créditos</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Group by */}
          <div className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(100,116,139,0.2)' }}>
            {(['day','month'] as const).map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={groupBy === g
                  ? { background: '#2B79FF', color: 'white' }
                  : { background: 'rgba(100,116,139,0.1)', color: '#64748B' }}>
                {g === 'day' ? 'Por día' : 'Por mes'}
              </button>
            ))}
          </div>
          {/* Range */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <Calendar size={12} className="text-[#64748B]" />
            {RANGES.map(r => (
              <button key={r.days} onClick={() => setRange(r.days)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                style={range === r.days ? { color: '#2B79FF' } : { color: '#64748B' }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="API Calls"          value={loading ? '—' : (totals?.calls ?? 0).toLocaleString()}          subtitle={`Últimos ${range} días`} delay={0} />
        <MetricCard title="Tokens Consumidos"  value={loading ? '—' : ((totals?.tokens_input ?? 0) + (totals?.tokens_output ?? 0)).toLocaleString()} subtitle="Input + Output" delay={0.1} />
        <MetricCard title="Créditos Gastados"  value={loading ? '—' : (totals?.credits_consumed ?? 0).toFixed(4)}     subtitle="Descontados a clientes" delay={0.2} />
        <MetricCard title="Revenue Estimado"   value={loading ? '—' : `$${revenue.toFixed(4)}`}                        subtitle="Créditos × $0.01 USD" delay={0.3} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Calls over time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-[#2B79FF]" />
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Llamadas al API</h2>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#64748B]">Cargando…</div>
          ) : grouped.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#64748B]">Sin datos en este período</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={grouped} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="repBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2B79FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2B79FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="period" tickFormatter={shortPeriod} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="calls" name="Llamadas" stroke="#2B79FF" strokeWidth={2}
                  fill="url(#repBlue)" dot={false}
                  activeDot={{ r: 4, fill: '#2B79FF', stroke: '#0F172A', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Credits consumed over time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-[#10B981]" />
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Créditos Consumidos</h2>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#64748B]">Cargando…</div>
          ) : grouped.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#64748B]">Sin datos en este período</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={grouped} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                <XAxis dataKey="period" tickFormatter={shortPeriod} tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="credits_consumed" name="Créditos" fill="#10B981" opacity={0.8} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Clients balance table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
          <DollarSign size={14} className="text-[#F59E0B]" />
          <h2 className="text-sm font-semibold text-[#F8FAFC]">Balance de Créditos por Cliente</h2>
          <span className="ml-auto text-xs text-[#64748B]">{clients.length} clientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(100,116,139,0.15)' }}>
                {['CLIENTE', 'STATUS', 'BALANCE ACTUAL', 'INDICADOR'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-[#64748B]">Cargando…</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-[#64748B]">Sin clientes</td></tr>
              ) : [...clients].sort((a, b) => b.credit_balance - a.credit_balance).map((client, i) => {
                const pct = Math.min((client.credit_balance / 100) * 100, 100)
                const color = client.credit_balance <= 0 ? '#EF4444' : client.credit_balance < 10 ? '#F59E0B' : '#10B981'
                return (
                  <motion.tr key={client.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }}
                    className="border-b" style={{ borderColor: 'rgba(100,116,139,0.1)' }}>
                    <td className="px-5 py-3.5 text-sm font-medium text-[#F8FAFC]">{client.company_name}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                        style={client.status === 'active'
                          ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' }
                          : { background: 'rgba(100,116,139,0.15)', color: '#64748B' }}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold" style={{ color }}>
                        ${Number(client.credit_balance).toFixed(6)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 w-48">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#1E293B]">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-[10px] text-[#64748B] w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Tokens breakdown */}
      {totals && totals.calls > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-[#8B5CF6]" />
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Resumen del período</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tokens de entrada',   value: totals.tokens_input.toLocaleString(),          color: '#2B79FF' },
              { label: 'Tokens de salida',    value: totals.tokens_output.toLocaleString(),         color: '#10B981' },
              { label: 'Costo real (OpenAI)', value: `$${totals.cost_usd.toFixed(6)}`,             color: '#F59E0B' },
              { label: 'Revenue (3x margen)', value: `$${(totals.cost_usd * 3).toFixed(6)}`,       color: '#8B5CF6' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg px-4 py-3"
                style={{ background: color + '10', border: `1px solid ${color}25` }}>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold mt-1" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
