'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import { TopBar } from '@/components/shared/TopBar'
import { ThemeProvider } from '@/lib/theme-context'
import { createClient } from '@/lib/supabase/client'
import { MessageNotification } from '@/components/shared/MessageNotification'
import { MeetingReminder } from '@/components/shared/MeetingReminder'
import { SessionTimeout } from '@/components/shared/SessionTimeout'
import { useSidebarStore } from '@/stores/sidebar.store'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const collapsed = useSidebarStore((s) => s.collapsed)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router, supabase.auth])

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-bg-primary">
        <Sidebar />
        <div className={`${collapsed ? 'ml-16' : 'ml-60'} transition-all duration-300`}>
          <TopBar />
          <main className="p-6">{children}</main>
        </div>
      </div>
      <MessageNotification />
      <MeetingReminder />
      <SessionTimeout />
    </ThemeProvider>
  )
}

