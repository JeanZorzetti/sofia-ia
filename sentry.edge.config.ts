/**
 * Sentry edge runtime configuration
 * Runs in Vercel Edge Functions / Next.js middleware — captures middleware errors
 */
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Lower sample rate for edge — high volume
    tracesSampleRate: 0.05,

    environment: process.env.NODE_ENV,

    // Do not send events unless DSN is set
    enabled: !!SENTRY_DSN,
  })
}
