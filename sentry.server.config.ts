/**
 * Sentry server-side configuration
 * Runs in Node.js — captures API route errors, server component errors, and unhandled exceptions
 */
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,

    environment: process.env.NODE_ENV,

    // Capture unhandled promise rejections and exceptions in API routes
    integrations: [
      Sentry.prismaIntegration(),
    ],

    // Do not send events unless DSN is set
    enabled: !!SENTRY_DSN,
  })
}
