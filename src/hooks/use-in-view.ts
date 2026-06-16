'use client'

import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Stop observing after the first intersection (default: true). */
  once?: boolean
  /** IntersectionObserver rootMargin, e.g. '-80px' (shrinks the viewport). */
  margin?: string
}

/**
 * Lightweight viewport-detection hook backed by IntersectionObserver.
 * Replaces framer-motion's `useInView` / `whileInView` for simple reveal
 * animations so framer-motion can be dropped from public bundles.
 */
export function useInView<T extends Element = HTMLDivElement>(options: UseInViewOptions = {}) {
  const { once = true, margin } = options
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // SSR / very old browsers: reveal immediately so content is never stuck hidden.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin: margin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once, margin])

  return { ref, inView }
}
