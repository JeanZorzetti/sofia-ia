/**
 * Sentry client-side configuration
 * Runs in the browser — captures JS errors, unhandled rejections, and performance data
 */
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,

    // Replay 1% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    // Enable session replay
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    environment: process.env.NODE_ENV,

    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],

    // Do not send events in development unless DSN is explicitly set
    enabled: !!SENTRY_DSN,
  })
}
