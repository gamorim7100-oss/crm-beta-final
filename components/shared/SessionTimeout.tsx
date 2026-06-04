'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INACTIVITY_LIMIT = 3 * 60 * 60 * 1000
const WARNING_BEFORE = 5 * 60 * 1000

export function SessionTimeout() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const warningRef = useRef<ReturnType<typeof setTimeout>>()
  const supabase = createClient()
  const [showWarning, setShowWarning] = useState(false)

  const resetTimer = () => {
    clearTimeout(timerRef.current)
    clearTimeout(warningRef.current)
    setShowWarning(false)

    warningRef.current = setTimeout(() => setShowWarning(true), INACTIVITY_LIMIT - WARNING_BEFORE)

    timerRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    }, INACTIVITY_LIMIT)
  }

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']
    const handler = () => resetTimer()

    resetTimer()

    events.forEach((e) => window.addEventListener(e, handler))
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
      clearTimeout(timerRef.current)
      clearTimeout(warningRef.current)
    }
  }, [])

  const stayActive = () => {
    resetTimer()
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⏰</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Sessão expirando</h2>
        <p className="text-sm text-gray-500 mb-6">
          Você ficou inativo por muito tempo. Sua sessão será encerrada em 5 minutos.
        </p>
        <div className="flex gap-3">
          <button
            onClick={stayActive}
            className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            Continuar sessão
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
              router.refresh()
            }}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Sair agora
          </button>
        </div>
      </div>
    </div>
  )
}

