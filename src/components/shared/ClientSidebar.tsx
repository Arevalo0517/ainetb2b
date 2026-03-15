'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, CreditCard, LogOut } from 'lucide-react'
import { AiNetLogo } from './AiNetLogo'

const NAV = [
  { label: 'Overview', href: '/client/dashboard', icon: LayoutDashboard },
  { label: 'Billing',  href: '/client/billing',   icon: CreditCard },
]

export function ClientSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 min-h-screen shrink-0"
      style={{ background: '#0B1120', borderRight: '1px solid rgba(100,116,139,0.2)' }}>

      <div className="flex items-center gap-3 px-5 py-6 border-b" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
        <AiNetLogo size={34} />
        <p className="text-[10px] text-[#64748B] uppercase tracking-widest leading-none mt-0.5">Client Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  background: active ? 'rgba(43,121,255,0.15)' : 'transparent',
                  color: active ? '#2B79FF' : '#94A3B8',
                  borderLeft: active ? '2px solid #2B79FF' : '2px solid transparent',
                }}
              >
                <Icon size={17} />
                {label}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2B79FF]/20 border border-[#2B79FF]/40 flex items-center justify-center text-xs font-bold text-[#2B79FF]">
            AC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#F8FAFC] truncate">Acme Corp</p>
            <p className="text-[10px] text-[#64748B]">Enterprise Plan</p>
          </div>
          <button className="text-[#64748B] hover:text-[#F8FAFC]">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
