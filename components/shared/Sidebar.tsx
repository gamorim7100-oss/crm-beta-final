'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  MessageCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useLeadsStore } from '@/stores/leads.store'
import { useSidebarStore } from '@/stores/sidebar.store'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/leads', label: 'Leads', icon: MessageCircle },
  { href: '/pos-venda', label: 'Pós-Venda', icon: BadgeCheck },
  { href: '/ajustes', label: 'Ajustes', icon: Pencil },
]

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed)
  const toggle = useSidebarStore((s) => s.toggle)
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const unreadCount = useLeadsStore((s) => s.unreadCount)
  const posVendaUnreadCount = useLeadsStore((s) => s.posVendaUnreadCount)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'h-screen bg-[#130E48] flex flex-col fixed left-0 top-0 z-50 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="relative flex items-center h-16 border-b border-white/10">
        {!collapsed && (
          <div className="pl-5">
            <img src="/sidebar-logo.svg" alt="Logo" className="h-9 w-auto" />
          </div>
        )}
        <button
          onClick={toggle}
          className="absolute right-4 text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/15"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={20} className={cn(isActive && 'text-emerald-400')} />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {item.href === '/leads' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.href === '/pos-venda' && posVendaUnreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {posVendaUnreadCount > 99 ? '99+' : posVendaUnreadCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 text-white/50 hover:text-red-300 transition-colors text-sm w-full',
            collapsed ? 'justify-center' : 'px-3 py-2'
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}

