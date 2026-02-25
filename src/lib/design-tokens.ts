/**
 * Design Tokens — Sofia AI
 * Fonte única de verdade para cores, status e brand.
 * Use estes tokens em vez de classes Tailwind hardcoded.
 */

// Feature card gradient classes
export const FEATURE_COLORS = {
  blue:    'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  purple:  'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
  green:   'from-green-500/20 to-green-600/20 border-green-500/30',
  yellow:  'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  pink:    'from-pink-500/20 to-pink-600/20 border-pink-500/30',
  cyan:    'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
  orange:  'from-orange-500/20 to-orange-600/20 border-orange-500/30',
} as const

export type FeatureColor = keyof typeof FEATURE_COLORS

// Status/feedback colors
export const STATUS_COLORS = {
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error:   'text-red-400',
  info:    'text-blue-400',
  neutral: 'text-white/50',
} as const

export type StatusColor = keyof typeof STATUS_COLORS

// Brand color tokens
export const BRAND = {
  gradient:        'from-blue-400 to-purple-400',
  gradientText:    'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent',
  iconBg:          'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
  iconColor:       'text-blue-400',
  highlightCard:   'bg-gradient-to-b from-blue-500/20 to-purple-500/20 border-2 border-blue-500/40',
  // blue-600 (#2563eb) atinge ratio 4.5:1 com branco — WCAG AA
  highlightBadge:  'bg-blue-600',
  highlightButton: 'bg-blue-600 hover:bg-blue-500 text-white',
  mutedButton:     'border border-white/20 hover:bg-white/5 text-white',
} as const
