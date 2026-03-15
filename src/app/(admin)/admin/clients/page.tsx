'use client'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { MetricCard } from '@/components/shared/MetricCard'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { clientsApi } from '@/lib/api'

interface Client {
  id: string
  company_name: string
  industry: string | null
  status: string
  credit_balance: number
  profiles: { email: string; full_name: string | null } | null
}

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  active:    { background: 'rgba(16,185,129,0.15)',  color: '#10B981' },
  pending:   { background: 'rgba(245,158,11,0.15)',   color: '#F59E0B' },
  suspended: { background: 'rgba(239,68,68,0.15)',    color: '#EF4444' },
  inactive:  { background: 'rgba(100,116,139,0.15)',  color: '#64748B' },
}

const COLORS = ['#8B5CF6','#2B79FF','#10B981','#F59E0B','#EC4899','#06B6D4','#F97316']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ company_name: '', industry: '', credit_balance: '0' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await clientsApi.create({
        company_name: form.company_name,
        industry: form.industry || null,
        credit_balance: parseFloat(form.credit_balance) || 0,
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating client')
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
            <h2 className="text-lg font-bold text-[#F8FAFC]">New Client</h2>
            <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"><X size={18} /></button>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Company Name *</label>
              <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder="Acme Corp" required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Industry</label>
              <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="SaaS, Finance, Healthcare…"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Initial Credits ($)</label>
              <input type="number" min="0" step="0.01" value={form.credit_balance}
                onChange={e => setForm(f => ({ ...f, credit_balance: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8]"
                style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                Cancel
              </button>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#2B79FF' }}>
                {loading ? 'Creating…' : 'Create Client'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  async function fetchClients() {
    setLoading(true)
    try {
      const data = await clientsApi.list() as Client[]
      setClients(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [])

  const filtered = clients.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeCount   = clients.filter(c => c.status === 'active').length
  const pendingCount  = clients.filter(c => c.status === 'pending').length
  const totalCredits  = clients.reduce((s, c) => s + c.credit_balance, 0)

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {showModal && <NewClientModal onClose={() => setShowModal(false)} onCreated={fetchClients} />}

      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Clientes</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Manage your client accounts and their AI agent credits</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
          <Plus size={15} /> New Client
        </motion.button>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Clients"    value={String(clients.length)} subtitle="Registered accounts" delay={0} />
        <MetricCard title="Active"           value={String(activeCount)}    subtitle="Active clients"      delay={0.1} />
        <MetricCard title="Total Credits"    value={`$${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} subtitle="Combined balance" delay={0.2} />
        <MetricCard title="Pending"          value={String(pendingCount)}   subtitle="Awaiting review"     delay={0.3} />
      </div>

      {/* Table card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="glass-card rounded-xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
          <div className="relative w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-[#94A3B8] placeholder-[#475569] outline-none"
              style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(100,116,139,0.15)' }}>
                {['COMPANY', 'INDUSTRY', 'EMAIL', 'CREDIT BALANCE', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#64748B]">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#64748B]">
                  {clients.length === 0 ? 'No clients yet. Create your first one.' : 'No results for your search.'}
                </td></tr>
              ) : filtered.map((client, i) => (
                <motion.tr key={client.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ background: 'rgba(43,121,255,0.04)' }}
                  className="border-b transition-colors cursor-default"
                  style={{ borderColor: 'rgba(100,116,139,0.1)' }}>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: COLORS[i % COLORS.length] + '30', border: `1px solid ${COLORS[i % COLORS.length]}50`, color: COLORS[i % COLORS.length] }}>
                        {initials(client.company_name)}
                      </div>
                      <span className="text-sm font-medium text-[#F8FAFC]">{client.company_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{client.industry ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-[#94A3B8]">{client.profiles?.email ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold" style={{ color: client.credit_balance === 0 ? '#EF4444' : '#2B79FF' }}>
                      ${client.credit_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
                      style={STATUS_COLORS[client.status] ?? {}}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded-md text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors outline-none">
                        <MoreHorizontal size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1E293B] border-[rgba(100,116,139,0.3)] text-[#F8FAFC]">
                        <DropdownMenuItem className="focus:bg-[#2B79FF]/10 focus:text-[#2B79FF] cursor-pointer">View Details</DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-[#2B79FF]/10 focus:text-[#2B79FF] cursor-pointer">Add Credits</DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-[#2B79FF]/10 focus:text-[#2B79FF] cursor-pointer">Edit Client</DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-red-500/10 focus:text-red-400 cursor-pointer text-red-400">Suspend</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: '1px solid rgba(100,116,139,0.15)' }}>
          <p className="text-xs text-[#64748B]">Showing {filtered.length} of {clients.length} clients</p>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-md text-[#64748B] hover:text-[#F8FAFC] transition-colors"><ChevronLeft size={15} /></button>
            <button className="w-7 h-7 rounded-md text-xs font-medium" style={{ background: '#2B79FF', color: 'white' }}>1</button>
            <button className="p-1.5 rounded-md text-[#64748B] hover:text-[#F8FAFC] transition-colors"><ChevronRight size={15} /></button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
