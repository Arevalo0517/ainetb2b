'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { AiNetLogo } from '@/components/shared/AiNetLogo'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Fetch role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .single()

    router.push(profile?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] relative overflow-hidden px-4">

      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(43,121,255,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Top nav */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
        <AiNetLogo size={32} />
        <div className="flex items-center gap-6 text-sm text-[#64748B]">
          <a href="#" className="hover:text-[#F8FAFC] transition-colors">Product</a>
          <a href="#" className="hover:text-[#F8FAFC] transition-colors">Solutions</a>
          <a href="#" className="hover:text-[#F8FAFC] transition-colors">Pricing</a>
          <a href="#" className="hover:text-[#F8FAFC] transition-colors">Docs</a>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.4)' }}
          >
            Sign Up
          </motion.button>
        </div>
      </nav>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="glass-card rounded-2xl p-8 glow-blue">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(43,121,255,0.15)', border: '1px solid rgba(43,121,255,0.4)' }}
            >
              <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
                <path d="M9 1v16M1 9h16M3.5 3.5l11 11M14.5 3.5l-11 11" stroke="#2B79FF" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </motion.div>
          </div>

          <h1 className="text-2xl font-bold text-center text-[#F8FAFC] mb-1">Welcome Back</h1>
          <p className="text-sm text-center text-[#64748B] mb-8">Access your AI agent fleet.</p>

          {error && (
            <div className="px-3 py-2 rounded-lg text-xs text-red-400 mb-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none transition-all focus:ring-1 focus:ring-[#2B79FF]"
                  style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#94A3B8]">Password</label>
                <a href="#" className="text-xs text-[#2B79FF] hover:underline">Forgot Password?</a>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none transition-all focus:ring-1 focus:ring-[#2B79FF]"
                  style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}
                  required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(43,121,255,0.5)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-lg text-sm font-bold text-white mt-2 transition-all disabled:opacity-70"
              style={{ background: '#2B79FF', boxShadow: '0 0 20px rgba(43,121,255,0.35)' }}
            >
              {loading ? 'Logging in…' : 'Log In'}
            </motion.button>
          </form>

          <p className="text-center text-xs text-[#64748B] mt-6">
            Don&apos;t have an account?{' '}
            <a href="#" className="text-[#2B79FF] hover:underline font-medium">Sign up for free</a>
          </p>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="absolute bottom-5 text-center text-[10px] text-[#475569] space-x-4">
        <a href="#" className="hover:text-[#64748B]">Privacy Policy</a>
        <a href="#" className="hover:text-[#64748B]">Terms of Service</a>
        <a href="#" className="hover:text-[#64748B]">Contact Support</a>
        <span className="block mt-1">© 2024 AiNet Systems Inc. All rights reserved.</span>
      </footer>
    </main>
  )
}
