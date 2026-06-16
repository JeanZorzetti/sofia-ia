'use client'

import { useEffect, useState } from 'react'
import { useInView } from '@/hooks/use-in-view'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 1.5,
  className,
}: AnimatedCounterProps) {
  const [current, setCurrent] = useState(0)
  const { ref, inView } = useInView<HTMLSpanElement>({ once: true, margin: '-50px' })

  useEffect(() => {
    if (!inView) return
    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.floor(eased * value))
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCurrent(value)
      }
    }

    requestAnimationFrame(animate)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{current}{suffix}
    </span>
  )
}
