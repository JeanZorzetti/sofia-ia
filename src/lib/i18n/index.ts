export { pt } from './pt'
export { es } from './es'
export { en } from './en'
export type { I18nStrings } from './pt'

export type Locale = 'pt' | 'es' | 'en'

export const locales: Locale[] = ['pt', 'es', 'en']

export const localeNames: Record<Locale, string> = {
  pt: 'Português',
  es: 'Español',
  en: 'English',
}

export const localeFlags: Record<Locale, string> = {
  pt: 'BR',
  es: 'ES',
  en: 'US',
}

export const localePaths: Record<Locale, string> = {
  pt: '/',
  es: '/es',
  en: '/en',
}
