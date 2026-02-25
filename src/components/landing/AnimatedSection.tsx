'use client'

import { motion, type TargetAndTransition } from 'framer-motion'
import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: Direction
  once?: boolean
}

const hidden: Record<Direction, TargetAndTransition> = {
  up:    { opacity: 0, y: 40 },
  down:  { opacity: 0, y: -40 },
  left:  { opacity: 0, x: 40 },
  right: { opacity: 0, x: -40 },
  fade:  { opacity: 0 },
}

const visible: TargetAndTransition = { opacity: 1, y: 0, x: 0 }

export function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = 'up',
  once = true,
}: AnimatedSectionProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={hidden[direction]}
      whileInView={visible}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
