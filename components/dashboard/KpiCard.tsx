'use client'

import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedCounter } from '@/components/shared/AnimatedCounter'

const PROGRESS_COLORS: Record<string, string> = {
  'bg-emerald-500/20': '#10B981',
  'bg-purple-500/20': '#8B5CF6',
  'bg-blue-500/20': '#3B82F6',
}

interface KpiCardProps {
  title: string
  value: string | number
  animateValue?: number
  formatValue?: (v: number) => string
  subtitle?: string
  icon: LucideIcon
  color: string
  progress?: number
  children?: React.ReactNode
}

export function KpiCard({ title, value, animateValue, formatValue, subtitle, icon: Icon, color, progress, children }: KpiCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
            {animateValue !== undefined ? (
              <AnimatedCounter to={animateValue} formatFn={formatValue} />
            ) : (
              value
            )}
          </p>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="h-1.5 bg-bg-secondary/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: PROGRESS_COLORS[color] || '#6B7280' }}
            />
          </div>
          <p className="text-xs text-text-secondary mt-1">{progress.toFixed(1)}%</p>
        </div>
      )}
      {children}
    </div>
  )
}

