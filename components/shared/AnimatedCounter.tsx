'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'

interface Props {
  from?: number
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  formatFn?: (value: number) => string
  duration?: number
}

export function AnimatedCounter({
  from = 0,
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  formatFn,
  duration = 1.5,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState(() =>
    formatFn ? formatFn(from) : `${prefix}${from.toFixed(decimals)}${suffix}`
  )

  useEffect(() => {
    if (!inView) return

    const controls = animate(from, to, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (latest) => {
        if (formatFn) {
          setDisplay(formatFn(latest))
        } else {
          setDisplay(`${prefix}${latest.toFixed(decimals)}${suffix}`)
        }
      },
    })

    return controls.stop
  }, [inView, from, to, decimals, prefix, suffix, formatFn, duration])

  return <span ref={ref}>{display}</span>
}

