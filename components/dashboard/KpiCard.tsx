'use client'

import { type LucideIcon } from 'lucide-react'
import { AnimatedCounter } from '@/components/shared/AnimatedCounter'

interface KpiCardProps {
  title: string
  value: string | number
  animateValue?: number
  formatValue?: (v: number) => string
  subtitle?: string
  icon: LucideIcon
  gradient: string
  iconColor: string
  progress?: number
  progressColor?: string
  children?: React.ReactNode
}

export function KpiCard({
  title,
  value,
  animateValue,
  formatValue,
  subtitle,
  icon: Icon,
  gradient,
  iconColor,
  progress,
  progressColor = '#10B981',
  children,
}: KpiCardProps) {
  return (
    <div className="relative bg-bg-card border border-border rounded-2xl p-5 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
      {/* accent glow blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-300"
        style={{ background: progressColor }}
      />

      <div className="relative flex items-start justify-between mb-4">
        {/* icon badge */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: gradient }}
        >
          <Icon size={22} className={iconColor} />
        </div>

        {typeof progress === 'number' && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: progressColor, background: `${progressColor}18` }}>
            {progress.toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-extrabold text-text-primary tabular-nums leading-tight">
        {animateValue !== undefined ? (
          <AnimatedCounter to={animateValue} formatFn={formatValue} />
        ) : (
          value
        )}
      </p>
      {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}

      {typeof progress === 'number' && (
        <div className="mt-4">
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${progressColor}99, ${progressColor})` }}
            />
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
