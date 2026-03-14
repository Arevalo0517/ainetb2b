# Admin/Voice Frontend Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four admin pages (`/admin/voice`, `/admin/voice/calls`, `/admin/voice/phone-numbers`, `/admin/voice/config`) plus update `AdminSidebar` with a collapsible "Voz" sub-nav.

**Architecture:** All pages are client components (`'use client'`) using `useEffect`/`useState` for data fetching — no server components. Modals and drawers are inline state-driven overlays. All data comes from existing `voiceApi`, `projectsApi`, and `clientsApi` functions in `src/lib/api.ts`. All entity types imported from `@/types/database`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, framer-motion v12, recharts v3, lucide-react, shadcn/ui v4

---

## Chunk 1: Sidebar + Overview Page

### Task 1: Update AdminSidebar with collapsible Voz sub-nav

**Files:**
- Modify: `src/components/shared/AdminSidebar.tsx`

- [ ] **Step 1: Replace AdminSidebar.tsx with this updated version**

  ```tsx
  'use client'
  import { ElementType } from 'react'
  import Link from 'next/link'
  import { usePathname } from 'next/navigation'
  import { motion, AnimatePresence } from 'framer-motion'
  import { LayoutDashboard, Users, Bot, BarChart3, Settings, LogOut, Phone, ChevronDown } from 'lucide-react'
  import { AiNetLogo } from './AiNetLogo'

  interface NavItem {
    label: string
    href: string
    icon: ElementType
    children?: { label: string; href: string }[]
  }

  const NAV: NavItem[] = [
    { label: 'Dashboard',     href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Clientes',      href: '/admin/clients',   icon: Users },
    { label: 'Proyectos',     href: '/admin/projects',  icon: Bot },
    { label: 'Reportes',      href: '/admin/reports',   icon: BarChart3 },
    {
      label: 'Voz',
      href: '/admin/voice',
      icon: Phone,
      children: [
        { label: 'Overview',      href: '/admin/voice' },
        { label: 'Llamadas',      href: '/admin/voice/calls' },
        { label: 'Números',       href: '/admin/voice/phone-numbers' },
        { label: 'Configuración', href: '/admin/voice/config' },
      ],
    },
    { label: 'Configuración', href: '/admin/settings',  icon: Settings },
  ]

  export function AdminSidebar() {
    const pathname = usePathname()

    return (
      <aside className="flex flex-col w-60 min-h-screen shrink-0"
        style={{ background: '#0B1120', borderRight: '1px solid rgba(100,116,139,0.2)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
          <AiNetLogo size={36} />
          <div>
            <p className="text-[10px] text-[#64748B] uppercase tracking-widest leading-none mt-0.5">Management Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ label, href, icon: Icon, children }) => {
            // Voice parent: active when any /admin/voice* path is current
            // All other items: use startsWith to handle sub-routes (original behavior)
            const active = children ? pathname.startsWith('/admin/voice') : pathname.startsWith(href)
            const isVoiceSection = !!children && pathname.startsWith('/admin/voice')

            return (
              <div key={href}>
                <Link href={href}>
                  <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: active ? 'rgba(43,121,255,0.15)' : 'transparent',
                      color: active ? '#2B79FF' : '#94A3B8',
                      borderLeft: active ? '2px solid #2B79FF' : '2px solid transparent',
                    }}
                  >
                    <Icon size={17} />
                    <span className="flex-1">{label}</span>
                    {children && (
                      <ChevronDown
                        size={13}
                        style={{
                          transform: isVoiceSection ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 0.2s',
                          color: '#64748B',
                        }}
                      />
                    )}
                  </motion.div>
                </Link>

                {/* Sub-items — only visible when in /admin/voice* */}
                {children && (
                  <AnimatePresence>
                    {isVoiceSection && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {children.map(child => {
                          const childActive = pathname === child.href
                          return (
                            <Link key={child.href} href={child.href}>
                              <motion.div
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ x: 3 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center pl-8 pr-3 py-2 rounded-lg text-xs font-medium transition-colors mt-0.5"
                                style={{
                                  background: childActive ? 'rgba(43,121,255,0.1)' : 'transparent',
                                  color: childActive ? '#2B79FF' : '#64748B',
                                  borderLeft: childActive ? '2px solid #2B79FF' : '2px solid transparent',
                                }}
                              >
                                {child.label}
                              </motion.div>
                            </Link>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2B79FF]/20 border border-[#2B79FF]/40 flex items-center justify-center text-xs font-bold text-[#2B79FF]">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#F8FAFC] truncate">Admin User</p>
              <p className="text-[10px] text-[#64748B] truncate">admin@ainet.io</p>
            </div>
            <button className="text-[#64748B] hover:text-[#F8FAFC] transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    )
  }
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  Run: `npx tsc --noEmit 2>&1 | head -20`
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/shared/AdminSidebar.tsx
  git commit -m "feat: add collapsible Voz sub-nav to AdminSidebar"
  ```

---

### Task 2: Create Voice Overview page (`/admin/voice`)

**Files:**
- Create: `src/app/(admin)/admin/voice/page.tsx`

- [ ] **Step 1: Create the directory**

  ```bash
  mkdir -p "src/app/(admin)/admin/voice"
  ```

- [ ] **Step 2: Create the page file**

  Create `src/app/(admin)/admin/voice/page.tsx`:

  ```tsx
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

    const llamasHoy = allCalls.filter(c => c.started_at?.slice(0, 10) === today).length
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
            <MetricCard title="Llamadas Hoy"        value={String(llamasHoy)}     subtitle="Llamadas del día"    icon={<Phone size={18}/>}      delay={0} />
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
  ```

- [ ] **Step 3: Verify no TypeScript errors**

  Run: `npx tsc --noEmit 2>&1 | head -30`
  Expected: no errors

- [ ] **Step 4: Commit**

  ```bash
  git add "src/app/(admin)/admin/voice/page.tsx"
  git commit -m "feat: add voice overview page at /admin/voice"
  ```

---

## Chunk 2: Call Logs Page

### Task 3: Create Call Logs page (`/admin/voice/calls`)

**Files:**
- Create: `src/app/(admin)/admin/voice/calls/page.tsx`

- [ ] **Step 1: Create the directory and file**

  ```bash
  mkdir -p "src/app/(admin)/admin/voice/calls"
  ```

  Create `src/app/(admin)/admin/voice/calls/page.tsx`:

  ```tsx
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
      <AnimatePresence>
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
      </AnimatePresence>
    )
  }

  export default function VoiceCallsPage() {
    const [calls, setCalls] = useState<CallLog[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [direction, setDirection] = useState('all')
    const [status, setStatus] = useState('all')
    const [projectFilter, setProjectFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [selectedCall, setSelectedCall] = useState<CallLog | null>(null)

    useEffect(() => {
      async function load() {
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
          // empty state
        } finally {
          setLoading(false)
        }
      }
      setLoading(true)
      load()
    }, [direction, projectFilter])

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
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Cargando...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No hay llamadas registradas</td></tr>
                  ) : paginated.map(call => (
                    <tr key={call.id}
                      style={{ borderBottom: '1px solid rgba(100,116,139,0.08)', cursor: 'pointer' }}
                      className="hover:bg-white/[0.02] transition-colors"
                      onClick={() => setSelectedCall(call)}>
                      <td className="px-4 py-3 text-[#94A3B8] font-mono">{call.project_id.slice(0, 8)}</td>
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

        {selectedCall && <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  Run: `npx tsc --noEmit 2>&1 | head -30`
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add "src/app/(admin)/admin/voice/calls/page.tsx"
  git commit -m "feat: add voice call logs page at /admin/voice/calls"
  ```

---

## Chunk 3: Phone Numbers Page

### Task 4: Create Phone Numbers page (`/admin/voice/phone-numbers`)

**Files:**
- Create: `src/app/(admin)/admin/voice/phone-numbers/page.tsx`

- [ ] **Step 1: Create the directory and file**

  ```bash
  mkdir -p "src/app/(admin)/admin/voice/phone-numbers"
  ```

  Create `src/app/(admin)/admin/voice/phone-numbers/page.tsx`:

  ```tsx
  'use client'
  import React, { useState, useEffect } from 'react'
  import { motion } from 'framer-motion'
  import { Plus, X, Phone, MoreHorizontal } from 'lucide-react'
  import { voiceApi, projectsApi, clientsApi } from '@/lib/api'
  import type { PhoneNumber, Project, Client } from '@/types/database'
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

  const STATUS_STYLE: Record<string, React.CSSProperties> = {
    active:   { background: 'rgba(16,185,129,0.15)',  color: '#10B981' },
    released: { background: 'rgba(100,116,139,0.15)', color: '#64748B' },
    pending:  { background: 'rgba(245,158,11,0.15)',   color: '#F59E0B' },
  }
  const STATUS_LABELS: Record<string, string> = { active: 'Activo', released: 'Liberado', pending: 'Pendiente' }

  function PurchaseModal({
    onClose, onPurchased, projects, clients,
  }: {
    onClose: () => void
    onPurchased: () => void
    projects: Project[]
    clients: Client[]
  }) {
    const [clientId, setClientId] = useState('')
    const [projectId, setProjectId] = useState('')
    const [areaCode, setAreaCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const voiceProjects = projects.filter(p => p.type.startsWith('voz-'))

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      if (!clientId) { setError('Selecciona un cliente'); return }
      setLoading(true)
      setError('')
      try {
        await voiceApi.purchaseNumber({
          client_id: clientId,
          project_id: projectId || undefined,
          area_code: areaCode || undefined,
        })
        onPurchased()
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al comprar número')
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
              <h2 className="text-lg font-bold text-[#F8FAFC]">Comprar Número</h2>
              <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC]"><X size={18} /></button>
            </div>
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Cliente *</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                  style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Proyecto de voz (opcional)</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                  style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
                  <option value="">Sin asignar</option>
                  {voiceProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Código de área (opcional)</label>
                <input value={areaCode} onChange={e => setAreaCode(e.target.value)}
                  placeholder="e.g. 415"
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                  style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
                {loading ? 'Comprando...' : 'Comprar Número'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  function ReassignModal({
    numberId, onClose, onReassigned, projects,
  }: {
    numberId: string
    onClose: () => void
    onReassigned: () => void
    projects: Project[]
  }) {
    const [projectId, setProjectId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      setLoading(true)
      setError('')
      try {
        await voiceApi.reassignNumber(numberId, { project_id: projectId || null })
        onReassigned()
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al reasignar')
        setLoading(false)
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Reasignar Número</h2>
              <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC]"><X size={18} /></button>
            </div>
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Proyecto destino</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                  style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
                  <option value="">Sin asignar</option>
                  {projects.filter(p => p.type.startsWith('voz-')).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
                {loading ? 'Guardando...' : 'Confirmar Reasignación'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  function ConfirmReleaseDialog({
    numberId, phoneNumber, onClose, onReleased,
  }: {
    numberId: string
    phoneNumber: string
    onClose: () => void
    onReleased: () => void
  }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleConfirm() {
      setLoading(true)
      setError('')
      try {
        await voiceApi.releaseNumber(numberId)
        onReleased()
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al liberar número')
        setLoading(false)
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[#F8FAFC] mb-2">Liberar Número</h2>
            <p className="text-sm text-[#94A3B8] mb-2">
              ¿Liberar <span className="text-[#F8FAFC] font-mono">{phoneNumber}</span>?
            </p>
            <p className="text-xs text-[#64748B] mb-5">
              Esta acción no se puede deshacer y el número será devuelto a Twilio.
            </p>
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8]"
                style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.25)' }}>
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={loading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#EF4444' }}>
                {loading ? 'Liberando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  export default function PhoneNumbersPage() {
    const [numbers, setNumbers] = useState<PhoneNumber[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [showPurchase, setShowPurchase] = useState(false)
    const [reassignTarget, setReassignTarget] = useState<PhoneNumber | null>(null)
    const [releaseTarget, setReleaseTarget] = useState<PhoneNumber | null>(null)

    async function loadData() {
      try {
        const [nums, projs, cls] = await Promise.all([
          voiceApi.phoneNumbers() as Promise<PhoneNumber[]>,
          projectsApi.list() as Promise<Project[]>,
          clientsApi.list() as Promise<Client[]>,
        ])
        setNumbers(nums)
        setProjects(projs)
        setClients(cls)
      } catch {
        // empty state
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => { loadData() }, [])

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
          <div>
            <h1 className="text-lg font-bold text-[#F8FAFC]">Números de Teléfono</h1>
            <p className="text-xs text-[#64748B]">Gestión de números Twilio asignados</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowPurchase(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
            <Plus size={15} /> Comprar Número
          </motion.button>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-[#64748B] text-sm text-center py-12">Cargando...</p>
          ) : numbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(43,121,255,0.1)' }}>
                <Phone size={24} className="text-[#2B79FF]" />
              </div>
              <p className="text-[#94A3B8] text-sm">No hay números registrados. Compra tu primer número.</p>
              <motion.button whileHover={{ scale: 1.03 }} onClick={() => setShowPurchase(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
                <Plus size={15} /> Comprar Número
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {numbers.map((num, i) => (
                <motion.div key={num.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(43,121,255,0.15)' }}>
                      <Phone size={16} className="text-[#2B79FF]" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <button className="p-1 rounded text-[#64748B] hover:text-[#F8FAFC] transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end"
                        style={{ background: '#0B1120', border: '1px solid rgba(100,116,139,0.2)' }}>
                        <DropdownMenuItem
                          className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                          onClick={() => setReassignTarget(num)}>
                          Reasignar
                        </DropdownMenuItem>
                        {num.status !== 'released' && (
                          <DropdownMenuItem
                            className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                            onClick={() => setReleaseTarget(num)}>
                            Liberar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-base font-bold text-[#F8FAFC] font-mono mb-1">{num.phone_number}</p>
                  <p className="text-xs text-[#64748B] mb-3">
                    {num.project_id ? (projectMap[num.project_id] ?? 'Proyecto desconocido') : 'Sin asignar'}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={STATUS_STYLE[num.status] ?? { background: 'rgba(100,116,139,0.15)', color: '#64748B' }}>
                      {STATUS_LABELS[num.status] ?? num.status}
                    </span>
                    <span className="text-[10px] text-[#64748B]">{num.country_code}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {showPurchase && (
          <PurchaseModal
            onClose={() => setShowPurchase(false)}
            onPurchased={loadData}
            projects={projects}
            clients={clients}
          />
        )}
        {reassignTarget && (
          <ReassignModal
            numberId={reassignTarget.id}
            onClose={() => setReassignTarget(null)}
            onReassigned={loadData}
            projects={projects}
          />
        )}
        {releaseTarget && (
          <ConfirmReleaseDialog
            numberId={releaseTarget.id}
            phoneNumber={releaseTarget.phone_number}
            onClose={() => setReleaseTarget(null)}
            onReleased={loadData}
          />
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  Run: `npx tsc --noEmit 2>&1 | head -30`
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add "src/app/(admin)/admin/voice/phone-numbers/page.tsx"
  git commit -m "feat: add phone numbers management page at /admin/voice/phone-numbers"
  ```

---

## Chunk 4: Voice Config Page

### Task 5: Create Voice Config page (`/admin/voice/config`)

**Files:**
- Create: `src/app/(admin)/admin/voice/config/page.tsx`

- [ ] **Step 1: Create the directory and file**

  ```bash
  mkdir -p "src/app/(admin)/admin/voice/config"
  ```

  Create `src/app/(admin)/admin/voice/config/page.tsx`:

  ```tsx
  'use client'
  import React, { useState, useEffect, KeyboardEvent } from 'react'
  import { motion } from 'framer-motion'
  import { X, Settings } from 'lucide-react'
  import { voiceApi, projectsApi } from '@/lib/api'
  import type { Project } from '@/types/database'

  interface VoiceConfigForm {
    stt_model: string
    tts_model: string
    tts_language: string
    voice_ai_model: string
    greeting_message: string
    end_call_phrases: string[]
    max_call_duration_seconds: string
    silence_timeout_seconds: string
    transfer_number: string
    n8n_voice_webhook_url: string
    voice_tools: string
    livekit_room_prefix: string
    voice_max_tokens: string
  }

  const DEFAULT_FORM: VoiceConfigForm = {
    stt_model: 'deepgram-nova-2',
    tts_model: 'deepgram-aura-asteria-en',
    tts_language: 'en-US',
    voice_ai_model: 'gpt-4o-mini',
    greeting_message: '',
    end_call_phrases: [],
    max_call_duration_seconds: '300',
    silence_timeout_seconds: '10',
    transfer_number: '',
    n8n_voice_webhook_url: '',
    voice_tools: '[]',
    livekit_room_prefix: 'voice-',
    voice_max_tokens: '1024',
  }

  function configToForm(config: Record<string, unknown>): VoiceConfigForm {
    return {
      stt_model: String(config.stt_model ?? DEFAULT_FORM.stt_model),
      tts_model: String(config.tts_model ?? DEFAULT_FORM.tts_model),
      tts_language: String(config.tts_language ?? DEFAULT_FORM.tts_language),
      voice_ai_model: String(config.voice_ai_model ?? DEFAULT_FORM.voice_ai_model),
      greeting_message: String(config.greeting_message ?? ''),
      end_call_phrases: Array.isArray(config.end_call_phrases) ? (config.end_call_phrases as string[]) : [],
      max_call_duration_seconds: String(config.max_call_duration_seconds ?? DEFAULT_FORM.max_call_duration_seconds),
      silence_timeout_seconds: String(config.silence_timeout_seconds ?? DEFAULT_FORM.silence_timeout_seconds),
      transfer_number: String(config.transfer_number ?? ''),
      n8n_voice_webhook_url: String(config.n8n_voice_webhook_url ?? ''),
      voice_tools: JSON.stringify(config.voice_tools ?? [], null, 2),
      livekit_room_prefix: String(config.livekit_room_prefix ?? DEFAULT_FORM.livekit_room_prefix),
      voice_max_tokens: String(config.voice_max_tokens ?? DEFAULT_FORM.voice_max_tokens),
    }
  }

  export default function VoiceConfigPage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProject, setSelectedProject] = useState('')
    const [form, setForm] = useState<VoiceConfigForm>(DEFAULT_FORM)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isNew, setIsNew] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [saveError, setSaveError] = useState('')
    const [tagInput, setTagInput] = useState('')

    useEffect(() => {
      projectsApi.list()
        .then(data => setProjects((data as Project[]).filter(p => p.type.startsWith('voz-'))))
        .catch(() => {})
    }, [])

    useEffect(() => {
      if (!selectedProject) return
      setLoading(true)
      setSaveStatus('idle')
      voiceApi.getConfig(selectedProject)
        .then(config => {
          setForm(configToForm(config as Record<string, unknown>))
          setIsNew(false)
        })
        .catch((err: Error) => {
          // 404 means no config yet — show empty form with note
          if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
            setForm(DEFAULT_FORM)
            setIsNew(true)
          }
        })
        .finally(() => setLoading(false))
    }, [selectedProject])

    function setField(key: keyof VoiceConfigForm, value: string) {
      setForm(f => ({ ...f, [key]: value }))
    }

    function addTag(phrase: string) {
      const trimmed = phrase.trim()
      if (trimmed && !form.end_call_phrases.includes(trimmed)) {
        setForm(f => ({ ...f, end_call_phrases: [...f.end_call_phrases, trimmed] }))
      }
    }

    function removeTag(phrase: string) {
      setForm(f => ({ ...f, end_call_phrases: f.end_call_phrases.filter(p => p !== phrase) }))
    }

    function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'Enter') {
        e.preventDefault()
        addTag(tagInput)
        setTagInput('')
      }
    }

    async function handleSave(e: React.FormEvent) {
      e.preventDefault()
      if (!selectedProject) return
      setSaving(true)
      setSaveStatus('idle')
      setSaveError('')

      let parsedTools
      try {
        parsedTools = JSON.parse(form.voice_tools)
      } catch {
        setSaveStatus('error')
        setSaveError('Voice Tools contiene JSON inválido')
        setSaving(false)
        return
      }

      const payload = {
        stt_model: form.stt_model,
        tts_model: form.tts_model,
        tts_language: form.tts_language,
        voice_ai_model: form.voice_ai_model,
        greeting_message: form.greeting_message || null,
        end_call_phrases: form.end_call_phrases,
        max_call_duration_seconds: parseInt(form.max_call_duration_seconds) || null,
        silence_timeout_seconds: parseInt(form.silence_timeout_seconds) || null,
        transfer_number: form.transfer_number || null,
        n8n_voice_webhook_url: form.n8n_voice_webhook_url || null,
        voice_tools: parsedTools,
        livekit_room_prefix: form.livekit_room_prefix || null,
        voice_max_tokens: parseInt(form.voice_max_tokens) || null,
      }

      try {
        await voiceApi.updateConfig(selectedProject, payload)
        setSaveStatus('success')
        setIsNew(false)
        setTimeout(() => setSaveStatus('idle'), 3000)
      } catch (err: unknown) {
        setSaveStatus('error')
        setSaveError(err instanceof Error ? err.message : 'Error al guardar')
      } finally {
        setSaving(false)
      }
    }

    const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
    const inputStyle = { background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }
    const labelClass = "block text-xs font-medium text-[#94A3B8] mb-1.5"
    const sectionClass = "glass-card rounded-xl p-5 space-y-4"
    const sectionTitle = "text-sm font-semibold text-[#F8FAFC] mb-4"

    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
          <div>
            <h1 className="text-lg font-bold text-[#F8FAFC]">Configuración de Voz</h1>
            <p className="text-xs text-[#64748B]">Pipeline STT/TTS y parámetros del agente</p>
          </div>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-[#94A3B8] outline-none"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <option value="">Seleccionar proyecto...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(43,121,255,0.1)' }}>
                <Settings size={24} className="text-[#2B79FF]" />
              </div>
              <p className="text-[#94A3B8] text-sm">Selecciona un proyecto para ver su configuración</p>
            </div>
          ) : loading ? (
            <p className="text-[#64748B] text-sm text-center py-12">Cargando configuración...</p>
          ) : (
            <form onSubmit={handleSave} className="max-w-2xl space-y-5">
              {isNew && (
                <div className="px-4 py-3 rounded-lg text-xs text-[#F59E0B]"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  Este proyecto no tiene configuración de voz. Guarda para crear una.
                </div>
              )}

              {/* 1. Pipeline */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                className={sectionClass}>
                <h2 className={sectionTitle}>Pipeline</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>STT Model</label>
                    <select value={form.stt_model} onChange={e => setField('stt_model', e.target.value)}
                      className={inputClass} style={inputStyle}>
                      <option value="deepgram-nova-2">Deepgram Nova-2</option>
                      <option value="deepgram-nova">Deepgram Nova</option>
                      <option value="whisper-1">OpenAI Whisper-1</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>TTS Model</label>
                    <select value={form.tts_model} onChange={e => setField('tts_model', e.target.value)}
                      className={inputClass} style={inputStyle}>
                      <option value="deepgram-aura-asteria-en">Deepgram Aura Asteria (EN)</option>
                      <option value="deepgram-aura-luna-en">Deepgram Aura Luna (EN)</option>
                      <option value="deepgram-aura-stella-en">Deepgram Aura Stella (EN)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>LLM Model</label>
                    <select value={form.voice_ai_model} onChange={e => setField('voice_ai_model', e.target.value)}
                      className={inputClass} style={inputStyle}>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Idioma TTS</label>
                    <input value={form.tts_language} onChange={e => setField('tts_language', e.target.value)}
                      placeholder="en-US" className={inputClass} style={inputStyle} />
                  </div>
                </div>
              </motion.div>

              {/* 2. Comportamiento */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={sectionClass}>
                <h2 className={sectionTitle}>Comportamiento</h2>
                <div>
                  <label className={labelClass}>Mensaje de bienvenida</label>
                  <textarea value={form.greeting_message} onChange={e => setField('greeting_message', e.target.value)}
                    rows={3} placeholder="Hola, soy tu asistente. ¿En qué puedo ayudarte?"
                    className={`${inputClass} resize-none`} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Frases de fin de llamada (Enter para agregar)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.end_call_phrases.map(phrase => (
                      <span key={phrase} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                        style={{ background: 'rgba(43,121,255,0.15)', color: '#2B79FF' }}>
                        {phrase}
                        <button type="button" onClick={() => removeTag(phrase)}
                          className="text-[#2B79FF]/60 hover:text-[#2B79FF]">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Ej: adiós, hasta luego..."
                    className={inputClass} style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Duración máxima (seg)</label>
                    <input type="number" value={form.max_call_duration_seconds}
                      onChange={e => setField('max_call_duration_seconds', e.target.value)}
                      min={10} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelClass}>Silencio antes de colgar (seg)</label>
                    <input type="number" value={form.silence_timeout_seconds}
                      onChange={e => setField('silence_timeout_seconds', e.target.value)}
                      min={1} className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Número de transferencia</label>
                  <input value={form.transfer_number} onChange={e => setField('transfer_number', e.target.value)}
                    placeholder="+1 555 000 0000" className={inputClass} style={inputStyle} />
                </div>
              </motion.div>

              {/* 3. Integración n8n */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className={sectionClass}>
                <h2 className={sectionTitle}>Integración n8n</h2>
                <div>
                  <label className={labelClass}>Webhook URL de n8n</label>
                  <input value={form.n8n_voice_webhook_url} onChange={e => setField('n8n_voice_webhook_url', e.target.value)}
                    placeholder="https://n8n.example.com/webhook/..." className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Voice Tools (JSON array)</label>
                  <textarea value={form.voice_tools} onChange={e => setField('voice_tools', e.target.value)}
                    rows={6}
                    placeholder={`[{"name": "example_tool", "description": "..."}]`}
                    className={`${inputClass} resize-none font-mono text-xs`} style={inputStyle} />
                </div>
              </motion.div>

              {/* 4. Avanzado */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className={sectionClass}>
                <h2 className={sectionTitle}>Avanzado</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>LiveKit Room Prefix</label>
                    <input value={form.livekit_room_prefix} onChange={e => setField('livekit_room_prefix', e.target.value)}
                      placeholder="voice-" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelClass}>Voice Max Tokens</label>
                    <input type="number" value={form.voice_max_tokens}
                      onChange={e => setField('voice_max_tokens', e.target.value)}
                      min={64} className={inputClass} style={inputStyle} />
                  </div>
                </div>
              </motion.div>

              {/* Save feedback */}
              {saveStatus === 'success' && (
                <div className="px-4 py-3 rounded-lg text-xs text-[#10B981]"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  Configuración guardada
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="px-4 py-3 rounded-lg text-xs text-red-400"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {saveError}
                </div>
              )}

              <motion.button type="submit" disabled={saving}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </motion.button>
            </form>
          )}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  Run: `npx tsc --noEmit 2>&1 | head -30`
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add "src/app/(admin)/admin/voice/config/page.tsx"
  git commit -m "feat: add voice config page at /admin/voice/config"
  ```

---

## Chunk 5: Final Verification

### Task 6: Verify full build and navigation

- [ ] **Step 1: Run full TypeScript check**

  Run: `npx tsc --noEmit 2>&1`
  Expected: 0 errors

- [ ] **Step 2: Run Next.js build**

  Run: `npm run build 2>&1 | tail -40`
  Expected: build succeeds. Pages `/admin/voice`, `/admin/voice/calls`, `/admin/voice/phone-numbers`, `/admin/voice/config` appear in the output.

- [ ] **Step 3: Verify file structure**

  Run: `find "src/app/(admin)/admin/voice" -type f`
  Expected output:
  ```
  src/app/(admin)/admin/voice/page.tsx
  src/app/(admin)/admin/voice/calls/page.tsx
  src/app/(admin)/admin/voice/phone-numbers/page.tsx
  src/app/(admin)/admin/voice/config/page.tsx
  ```

- [ ] **Step 4: Final commit**

  ```bash
  git add -A
  git commit -m "feat: complete admin/voice frontend pages"
  ```
