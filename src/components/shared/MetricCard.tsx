'use client'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string
  change?: string
  changeType?: 'up' | 'down'
  subtitle?: string
  icon?: ReactNode
  delay?: number
}

export function MetricCard({ title, value, change, changeType = 'up', subtitle, icon, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(43,121,255,0.15)' }}
      className="glass-card rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider">{title}</p>
        {icon && <div className="text-[#2B79FF]">{icon}</div>}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#F8FAFC] leading-none">{value}</p>
        {subtitle && <p className="text-[11px] text-[#64748B] mt-1">{subtitle}</p>}
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-xs font-medium ${changeType === 'up' ? 'text-[#10B981]' : 'text-red-400'}`}>
          {changeType === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {change}
        </div>
      )}
    </motion.div>
  )
}
