'use client'

import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(
  () => import('@/components/leads/KanbanBoard').then((mod) => ({ default: mod.KanbanBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 bg-bg-card rounded-xl animate-pulse min-w-[280px]" />
        ))}
      </div>
    ),
  }
)

export default function LeadsPage() {
  return <KanbanBoard />
}

