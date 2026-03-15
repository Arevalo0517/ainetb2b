'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Shield, Cpu, LogOut, Save, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MODEL_PRICING = [
  { model: 'gpt-4o-mini',   input: 0.15,  output: 0.60,  margin: 3, tier: 'Básico / Intermedio' },
  { model: 'gpt-4o',        input: 2.50,  output: 10.00, margin: 3, tier: 'Intermedio / Avanzado' },
  { model: 'gpt-4-turbo',   input: 10.00, output: 30.00, margin: 3, tier: 'Avanzado' },
  { model: 'gpt-3.5-turbo', input: 0.50,  output: 1.50,  margin: 3, tier: 'Legado' },
]

function creditsPerMillion(pricePerMillion: number, margin: number) {
  return ((pricePerMillion * margin) / 0.01).toFixed(0)
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ full_name: string; email: string; role: string } | null>(null)
  const [form, setForm]       = useState({ full_name: '', current_password: '', new_password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
        .then(({ data }) => {
          const p = { full_name: data?.full_name ?? '', email: user.email ?? '', role: data?.role ?? 'admin' }
          setProfile(p)
          setForm(f => ({ ...f, full_name: p.full_name }))
        })
    })
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No session')

      // Update display name
      await supabase.from('profiles').update({ full_name: form.full_name }).eq('id', user.id)

      // Update password if provided
      if (form.new_password) {
        const { error: pwErr } = await supabase.auth.updateUser({ password: form.new_password })
        if (pwErr) throw pwErr
        setForm(f => ({ ...f, current_password: '', new_password: '' }))
      }

      setProfile(p => p ? { ...p, full_name: form.full_name } : p)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const inputCls   = "w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
  const inputStyle = { background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }
  const labelCls   = "block text-xs font-medium text-[#94A3B8] mb-1.5"

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Configuración</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Administra tu perfil y configuración de la plataforma</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-6 items-start">

        {/* Left col: profile + security */}
        <div className="col-span-2 space-y-5">

          {/* Profile */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <User size={15} className="text-[#2B79FF]" />
              <h2 className="text-sm font-semibold text-[#F8FAFC]">Perfil de Administrador</h2>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            {saved && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs text-[#10B981]"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                Cambios guardados correctamente.
              </div>
            )}

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre completo</label>
                  <input value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Tu nombre"
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input value={profile?.email ?? ''} disabled
                    className={inputCls + ' opacity-50 cursor-not-allowed'} style={inputStyle} />
                </div>
              </div>

              <div className="pt-1 border-t" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
                <div className="flex items-center gap-2 mt-4 mb-3">
                  <Shield size={13} className="text-[#64748B]" />
                  <p className="text-xs font-medium text-[#94A3B8]">Cambiar contraseña (opcional)</p>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.new_password}
                    onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                    placeholder="Nueva contraseña"
                    className={inputCls + ' pr-10'} style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <motion.button type="submit" disabled={saving}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: '#2B79FF' }}>
                <Save size={14} />
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </motion.button>
            </form>
          </motion.div>

          {/* Model pricing */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
              <Cpu size={14} className="text-[#8B5CF6]" />
              <h2 className="text-sm font-semibold text-[#F8FAFC]">Pricing de Modelos</h2>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                Margen 3×
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(100,116,139,0.15)' }}>
                    {['MODELO', 'TIER', 'INPUT (1M tokens)', 'OUTPUT (1M tokens)', 'CRÉDITOS/1M INPUT'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODEL_PRICING.map((p, i) => (
                    <tr key={p.model}
                      className="border-b"
                      style={{ borderColor: 'rgba(100,116,139,0.1)', background: i % 2 === 0 ? 'transparent' : 'rgba(100,116,139,0.03)' }}>
                      <td className="px-5 py-3 text-sm font-mono font-medium text-[#F8FAFC]">{p.model}</td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full text-[#64748B]"
                          style={{ background: 'rgba(100,116,139,0.1)' }}>
                          {p.tier}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#94A3B8]">${p.input.toFixed(2)}</td>
                      <td className="px-5 py-3 text-sm text-[#94A3B8]">${p.output.toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-semibold text-[#2B79FF]">
                          {creditsPerMillion(p.input, p.margin).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 text-[11px] text-[#475569]"
              style={{ borderTop: '1px solid rgba(100,116,139,0.15)', background: 'rgba(100,116,139,0.03)' }}>
              Fórmula: <span className="text-[#64748B]">(tokens / 1,000,000) × precio_OpenAI × 3 ÷ $0.01 = créditos consumidos</span>
            </div>
          </motion.div>
        </div>

        {/* Right col: account info + danger */}
        <div className="space-y-5">

          {/* Account card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card rounded-xl p-5">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: 'rgba(43,121,255,0.15)', border: '2px solid rgba(43,121,255,0.4)', color: '#2B79FF' }}>
                {(profile?.full_name || profile?.email || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-[#F8FAFC]">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{profile?.email ?? '—'}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(43,121,255,0.15)', color: '#2B79FF' }}>
                {profile?.role ?? 'admin'}
              </span>
            </div>
          </motion.div>

          {/* Platform info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Plataforma</h3>
            {[
              { label: 'Versión',        value: 'AiNet v1.0' },
              { label: '1 crédito',      value: '$0.01 USD' },
              { label: 'Margen',         value: '3× sobre OpenAI' },
              { label: 'Stack',          value: 'Next.js 14 + Supabase' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-[#64748B]">{label}</span>
                <span className="text-[#94A3B8] font-medium">{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Danger zone */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-xl p-5 space-y-3"
            style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Sesión</h3>
            <p className="text-xs text-[#64748B]">Cerrar sesión en todos los dispositivos.</p>
            <motion.button onClick={handleLogout}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-red-400 transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <LogOut size={14} /> Cerrar sesión
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
