import Image from 'next/image'

interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <Image
      src="/logos/polaris-icon.png"
      alt="Polaris IA"
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}

interface LogoProps {
  size?: number
  className?: string
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
        Polaris IA
      </span>
    </div>
  )
}
