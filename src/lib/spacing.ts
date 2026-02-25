/**
 * Spacing Tokens — Sofia AI
 * Padding, gap e container tokens para seções landing.
 */

export const SECTION = {
  // Padding vertical das seções
  padding:      'py-20 md:py-28',
  paddingSmall: 'py-12 md:py-16',
  paddingLarge: 'py-28 md:py-36',

  // Containers
  container:       'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  containerNarrow: 'max-w-4xl mx-auto px-4 sm:px-6',
  containerWide:   'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8',

  // Grid gaps
  gap:      'gap-6 md:gap-8',
  gapLarge: 'gap-8 md:gap-12',

  // Heading bottom margin
  headingGap:    'mb-4',
  headingGapLg:  'mb-6',
  sectionGapTop: 'mt-12 md:mt-16',
} as const

export type SectionKey = keyof typeof SECTION
