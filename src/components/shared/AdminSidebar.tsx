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
