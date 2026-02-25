/**
 * Typography Scale — Sofia AI
 * Classes Tailwind para cada nível tipográfico.
 */

export const TYPOGRAPHY = {
  // Headings
  h1:      'text-5xl md:text-6xl font-bold tracking-tight leading-tight',
  h2:      'text-3xl md:text-4xl font-bold tracking-tight',
  h3:      'text-xl md:text-2xl font-semibold tracking-tight',
  h4:      'text-lg font-semibold',

  // Body
  body:      'text-base leading-relaxed',
  bodySmall: 'text-sm leading-relaxed',
  bodyXs:    'text-xs leading-relaxed',

  // Special
  label:   'text-xs font-medium uppercase tracking-widest',
  badge:   'text-xs px-2 py-0.5 rounded-full',
  caption: 'text-xs text-foreground-tertiary',

  // Section
  sectionTitle:    'text-3xl md:text-4xl font-bold tracking-tight text-white',
  sectionSubtitle: 'text-lg text-foreground-secondary max-w-2xl mx-auto',
} as const

export type TypographyKey = keyof typeof TYPOGRAPHY
