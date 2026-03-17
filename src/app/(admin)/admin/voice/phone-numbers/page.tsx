'use client'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Phone, MoreHorizontal, RefreshCw } from 'lucide-react'
import { voiceApi, projectsApi, clientsApi } from '@/lib/api'
import type { PhoneNumber, Project, Client } from '@/types/database'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  active:   { background: 'rgba(16,185,129,0.15)',  color: '#10B981' },
  released: { background: 'rgba(100,116,139,0.15)', color: '#64748B' },
  pending:  { background: 'rgba(245,158,11,0.15)',   color: '#F59E0B' },
}
const STATUS_LABELS: Record<string, string> = { active: 'Activo', released: 'Liberado', pending: 'Pendiente' }

function SyncModal({
  onClose, onSynced, clients,
}: {
  onClose: () => void
  onSynced: () => void
  clients: Client[]
}) {
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ imported: number; message?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { setError('Selecciona un cliente'); return }
    setLoading(true)
    setError('')
    try {
      const res = await voiceApi.syncNumbers(clientId) as { imported: number; message?: string }
      setResult(res)
      onSynced()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
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
            <h2 className="text-lg font-bold text-[#F8FAFC]">Sincronizar desde Twilio</h2>
            <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC]"><X size={18} /></button>
          </div>
          <p className="text-xs text-[#64748B] mb-4">
            Importa los números que ya tienes en tu cuenta de Twilio y aún no están en la base de datos.
          </p>
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          {result ? (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-lg text-sm text-[#10B981]"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                {result.imported > 0
                  ? `✓ ${result.imported} número${result.imported > 1 ? 's' : ''} importado${result.imported > 1 ? 's' : ''} correctamente`
                  : result.message ?? 'Sin cambios'}
              </div>
              <button onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#2B79FF' }}>
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Asignar a cliente *</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#2B79FF]"
                  style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#2B79FF' }}>
                {loading ? <><RefreshCw size={14} className="animate-spin" /> Sincronizando...</> : 'Sincronizar'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

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
  const [error, setError] = useState('')
  const [showPurchase, setShowPurchase] = useState(false)
  const [showSync, setShowSync] = useState(false)
  const [reassignTarget, setReassignTarget] = useState<PhoneNumber | null>(null)
  const [releaseTarget, setReleaseTarget] = useState<PhoneNumber | null>(null)

  async function loadData() {
    setError('')
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
      setError('Error al cargar los números')
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
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowSync(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)', color: '#94A3B8' }}>
            <RefreshCw size={14} /> Sincronizar Twilio
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowPurchase(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
            <Plus size={15} /> Comprar Número
          </motion.button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <p className="text-red-400 text-sm text-center py-12">{error}</p>
        ) : loading ? (
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
                    <DropdownMenuTrigger className="p-1.5 rounded-md text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors outline-none">
                      <MoreHorizontal size={16} />
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

      {showSync && (
        <SyncModal
          onClose={() => setShowSync(false)}
          onSynced={loadData}
          clients={clients}
        />
      )}

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
