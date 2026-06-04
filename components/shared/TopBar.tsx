'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { LogOut, User, Sun, Moon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme-context'

export function TopBar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (data) {
          setProfile(data)
        } else if (!error) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({ id: user.id, name: user.email?.split('@')[0] || 'Usuário', email: user.email || '' })
            .select()
            .single()
          setProfile(newProfile)
        }
      }
    }
    loadProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-bg-primary">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="text-text-secondary hover:text-yellow-500 transition-colors p-2 rounded-lg hover:bg-card-hover"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-text-primary">{profile?.name || 'Carregando...'}</p>
          <p className="text-xs text-text-secondary">{profile?.email || ''}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
        <button
          onClick={handleLogout}
          className="text-text-secondary hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-card-hover"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

