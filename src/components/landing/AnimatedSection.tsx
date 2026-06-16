'use client'

import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/use-in-view'

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: Direction
  once?: boolean
}

// Offset applied while hidden; cleared (to `none`) once in view.
const hiddenTransform: Record<Direction, string> = {
  up:    'translateY(40px)',
  down:  'translateY(-40px)',
  left:  'translateX(40px)',
  right: 'translateX(-40px)',
  fade:  'none',
}

// Pure CSS + IntersectionObserver reveal (no framer-motion). Mirrors the previous
// motion.div: fade + directional slide, 0.6s, cubic-bezier(0.4,0,0.2,1), optional delay.
export function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = 'up',
  once = true,
}: AnimatedSectionProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ once, margin: '-80px' })

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : hiddenTransform[direction],
        transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}s, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
