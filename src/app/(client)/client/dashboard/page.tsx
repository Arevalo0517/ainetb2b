'use client'
import { motion } from 'framer-motion'
import { Bell, Calendar, TrendingUp, Bot, MessageSquare, CheckCircle2 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'

const USAGE_DATA = [
  { day: '30d', calls: 800 }, { day: '25d', calls: 2200 }, { day: '22d', calls: 1400 },
  { day: '18d', calls: 3800 }, { day: '15d', calls: 2900 }, { day: '12d', calls: 4800 },
  { day: '8d',  calls: 3600 }, { day: '5d',  calls: 5200 }, { day: '3d',  calls: 4100 },
  { day: 'Today', calls: 6200 },
]

const EVENTS = [
  { color: '#10B981', icon: CheckCircle2, title: 'Optimization Cycle Complete', sub: 'Agent Customer Balance — Improved response model.', time: '2 hours ago' },
  { color: '#2B79FF', icon: CheckCircle2, title: 'Knowledge Base Synced', sub: 'All context documents updated successfully.', time: '5 hours ago' },
  { color: '#F59E0B', icon: CheckCircle2, title: 'Credit threshold reached', sub: 'Balance dropped below configured threshold.', time: '1 day ago' },
]

const CREDIT_BALANCE = 127.50
const CREDIT_MAX = 500
const CREDIT_PCT = Math.round((CREDIT_BALANCE / CREDIT_MAX) * 100)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs border-[#2B79FF]/30">
      <p className="text-[#2B79FF] font-bold">TODAY 5.19</p>
      <p className="text-[#64748B]">{payload[0].value.toLocaleString()} calls</p>
    </div>
  )
}

export default function ClientDashboard() {
  return (
    <div className="flex-1 overflow-auto">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Dashboard Overview</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Real-time performance and resource allocation.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg text-[#64748B] hover:text-[#F8FAFC] transition-colors"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <Bell size={16} />
          </button>
          <motion.button whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[#94A3B8]"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <Calendar size={13} /> Last 30 Days
          </motion.button>
        </div>
      </header>

      <div className="px-6 pb-6 space-y-5">

        {/* Top cards */}
        <div className="grid grid-cols-3 gap-4">

          {/* Credit balance — big card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            whileHover={{ scale: 1.01, boxShadow: '0 0 25px rgba(43,121,255,0.15)' }}
            className="glass-card rounded-xl p-5 col-span-1">
            <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest mb-3">Credit Balance</p>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-[#F8FAFC]">
                  ${CREDIT_BALANCE.toFixed(2)}
                </p>
                <p className="text-xs text-[#64748B] mt-1">credits remaining</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(43,121,255,0.15)', border: '1px solid rgba(43,121,255,0.3)' }}>
                <span className="text-base">💳</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-[#64748B] mb-2">
                <span>Remaining Capacity</span>
                <span className="text-[#2B79FF] font-semibold">{CREDIT_PCT}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#1E293B] overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${CREDIT_PCT}%` }}
                  transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #2B79FF, #60A5FA)', boxShadow: '0 0 8px rgba(43,121,255,0.5)' }} />
              </div>
            </div>
          </motion.div>

          {/* Messages */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.01 }}
            className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Messages This Month</p>
              <MessageSquare size={16} className="text-[#2B79FF]" />
            </div>
            <p className="text-3xl font-bold text-[#F8FAFC]">42.8k</p>
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp size={12} className="text-[#10B981]" />
              <span className="text-xs text-[#10B981] font-medium">+12% vs last month</span>
            </div>
          </motion.div>

          {/* Active agents */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.01 }}
            className="glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Active Agents</p>
              <Bot size={16} className="text-[#10B981]" />
            </div>
            <p className="text-3xl font-bold text-[#F8FAFC]">12</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs text-[#10B981] font-medium">Fully Optimized</span>
            </div>
          </motion.div>
        </div>

        {/* Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#F8FAFC] mb-0.5">Daily Usage</h2>
          <p className="text-xs text-[#64748B] mb-5">Resource consumption across all active agents</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={USAGE_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
              <defs>
                <linearGradient id="clientBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2B79FF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2B79FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x="Today" stroke="#2B79FF" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="calls" stroke="#2B79FF" strokeWidth={2.5}
                fill="url(#clientBlue)" dot={false}
                activeDot={{ r: 5, fill: '#2B79FF', stroke: '#0F172A', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-[10px] text-[#475569] mt-2">
            <span>30 DAYS AGO</span><span>15 DAYS AGO</span><span>TODAY</span>
          </div>
        </motion.div>

        {/* Recent Events */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#F8FAFC] mb-4">Recent System Events</h2>
          <div className="space-y-3">
            {EVENTS.map((e, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-white/[0.03]">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: e.color + '20' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#F8FAFC]">{e.title}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{e.sub}</p>
                </div>
                <span className="text-[10px] text-[#475569] shrink-0">{e.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
