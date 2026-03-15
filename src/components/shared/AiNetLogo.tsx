'use client'
import { motion } from 'framer-motion'

export function AiNetLogo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        whileHover={{ rotate: 180, scale: 1.1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center rounded-lg"
        style={{ width: size, height: size, background: 'rgba(43,121,255,0.15)', border: '1px solid rgba(43,121,255,0.4)' }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 18 18" fill="none">
          <path d="M9 1v16M1 9h16M3.5 3.5l11 11M14.5 3.5l-11 11" stroke="#2B79FF" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </motion.div>
      <span className="font-bold text-[#F8FAFC]" style={{ fontSize: size * 0.55 }}>AiNet</span>
    </div>
  )
}
