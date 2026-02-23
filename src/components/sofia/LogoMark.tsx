interface LogoMarkProps {
  size?: number
  className?: string
}

/**
 * Sofia AI icon mark — stylized S inside a blue-to-purple rounded square.
 * Use <LogoMark /> for the icon alone, or <Logo /> for icon + wordmark.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const id = `lm-${size}`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Sofia AI"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="14" y1="8" x2="34" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${id}-bg)`} />
      <path
        d="M 32 16
           C 32 11.6 28.4 8 24 8
           L 20 8
           C 15.6 8 12 11.6 12 16
           C 12 20.4 15.6 24 20 24
           L 28 24
           C 32.4 24 36 27.6 36 32
           C 36 36.4 32.4 40 28 40
           L 24 40
           C 19.6 40 16 36.4 16 32"
        stroke={`url(#${id}-s)`}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

interface LogoProps {
  size?: number
  className?: string
  /** Show just the icon without the wordmark */
  iconOnly?: boolean
}

export function Logo({ size = 32, className, iconOnly = false }: LogoProps) {
  if (iconOnly) return <LogoMark size={size} className={className} />

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} />
      <span
        style={{ fontSize: size * 0.6, lineHeight: 1 }}
        className="font-bold tracking-tight text-white"
      >
        Sofia AI
      </span>
    </div>
  )
}
