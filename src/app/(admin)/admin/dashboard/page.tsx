'use client'
import { motion } from 'framer-motion'
import { Search, Bell, User, Plus, Users, Bot, DollarSign, MessageSquare, Circle } from 'lucide-react'
import { MetricCard } from '@/components/shared/MetricCard'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const CHART_DATA = [
  { day: '30d ago', calls: 12000 }, { day: '25d', calls: 18500 }, { day: '20d', calls: 14200 },
  { day: '15d', calls: 28000 }, { day: '10d', calls: 22000 }, { day: '5d',  calls: 35000 },
  { day: '2d',  calls: 30000 }, { day: 'Today', calls: 42000 },
]

const ACTIVITY = [
  { color: '#2B79FF', title: 'Agent Alpha deployed', sub: 'Cloud Compute Instance #021', time: '2 MINS AGO' },
  { color: '#10B981', title: 'New client onboarded', sub: 'Nexun Corp — Enterprise Plus', time: '14 MINS AGO' },
  { color: '#F59E0B', title: 'Model retraining started', sub: 'NLP PLU Core upgrade', time: '1 HOUR AGO' },
  { color: '#10B981', title: 'Backup completed', sub: 'Multi-Region US-East', time: '2 HOURS AGO' },
  { color: '#EF4444', title: 'Agent Beta shutdown', sub: 'Maintenance scheduled', time: '5 HOURS AGO' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs">
      <p className="text-[#64748B] mb-1">{label}</p>
      <p className="text-[#2B79FF] font-semibold">{payload[0].value.toLocaleString()} calls</p>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <div className="flex-1 flex flex-col overflow-auto">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input placeholder="Search analytics, agents or logs..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs text-[#94A3B8] placeholder-[#475569] outline-none"
            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg text-[#64748B] hover:text-[#F8FAFC] transition-colors"
            style={{ background: 'rgba(100,116,139,0.1)' }}>
            <Bell size={16} />
          </button>
          <button className="p-2 rounded-lg text-[#64748B] hover:text-[#F8FAFC] transition-colors"
            style={{ background: 'rgba(100,116,139,0.1)' }}>
            <User size={16} />
          </button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
            <Plus size={15} /> New Agent
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-6 space-y-6">

          {/* Metric cards */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Total Clients"      value="1,284" change="+10% this month"  subtitle="Active accounts" icon={<Users size={18}/>} delay={0} />
            <MetricCard title="Active Agents"      value="452"   change="+5%"              subtitle="Running instances" icon={<Bot size={18}/>} delay={0.1} />
            <MetricCard title="Monthly Revenue"    value="$48,200" change="-8%" changeType="down" subtitle="Recurring billing cycle" icon={<DollarSign size={18}/>} delay={0.2} />
            <MetricCard title="Messages Processed" value="1.2M"  change="+16%"             subtitle="Last 30 days throughput" icon={<MessageSquare size={18}/>} delay={0.3} />
          </div>

          {/* Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#F8FAFC]">API Usage over 30 days</h2>
                <p className="text-xs text-[#64748B]">Peak performance tracked daily</p>
              </div>
              <div className="flex gap-2">
                {['Daily', 'Weekly'].map(t => (
                  <button key={t} className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    style={t === 'Daily' ? { background: 'rgba(43,121,255,0.2)', color: '#2B79FF' } : { color: '#64748B' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={CHART_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2B79FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2B79FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="calls" stroke="#2B79FF" strokeWidth={2.5}
                  fill="url(#blueGrad)" dot={false} activeDot={{ r: 5, fill: '#2B79FF', stroke: '#0F172A', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bottom row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-[#2B79FF]/20 flex items-center justify-center">
                  <Circle size={12} className="text-[#2B79FF]" />
                </div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">System Health</h3>
              </div>
              {[{ label: 'CPU Usage', pct: 42 }, { label: 'Memory Usage', pct: 88 }].map(({ label, pct }) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-xs text-[#64748B] mb-1.5">
                    <span>{label}</span><span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1E293B]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.7, duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: pct > 80 ? '#F59E0B' : '#2B79FF', boxShadow: `0 0 6px ${pct > 80 ? '#F59E0B' : '#2B79FF'}60` }} />
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="glass-card rounded-xl p-5 flex flex-col justify-center items-center">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[#10B981]/20 flex items-center justify-center">
                  <Circle size={12} className="text-[#10B981]" />
                </div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">Global Latency</h3>
              </div>
              <p className="text-4xl font-bold text-[#F8FAFC]">124<span className="text-lg font-normal text-[#64748B]">ms</span></p>
              <p className="text-xs text-[#10B981] mt-1 font-medium">Optimal</p>
              <p className="text-[11px] text-[#64748B] mt-1">Average across 11 regions</p>
            </motion.div>
          </div>
        </div>

        {/* Recent Activity sidebar */}
        <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="w-64 shrink-0 border-l p-5 overflow-auto" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
          <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {ACTIVITY.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }} className="flex gap-3">
                <div className="relative mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                  {i < ACTIVITY.length - 1 && (
                    <div className="absolute left-[3.5px] top-3 w-px h-8" style={{ background: 'rgba(100,116,139,0.2)' }} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#F8FAFC] leading-tight">{a.title}</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">{a.sub}</p>
                  <p className="text-[9px] text-[#475569] mt-1 uppercase tracking-wide">{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <button className="mt-5 text-xs text-[#2B79FF] hover:underline font-medium">View full log audit</button>
        </motion.aside>
      </div>
    </div>
  )
}
