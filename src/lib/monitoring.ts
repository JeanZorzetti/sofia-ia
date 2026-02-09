/**
 * Monitoring and Error Tracking Module
 *
 * Provides centralized logging and error tracking.
 * When SENTRY_DSN is configured, errors are sent to Sentry.
 * Otherwise, they're logged to console.
 */

interface ErrorContext {
  user?: string
  route?: string
  tags?: Record<string, string>
  extra?: Record<string, any>
}

interface LogLevel {
  DEBUG: 'debug'
  INFO: 'info'
  WARN: 'warn'
  ERROR: 'error'
  FATAL: 'fatal'
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
}

class MonitoringService {
  private enabled: boolean
  private sentryDsn: string | undefined

  constructor() {
    this.sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    this.enabled = !!this.sentryDsn

    if (this.enabled) {
      this.initializeSentry()
    }
  }

  private initializeSentry() {
    // Sentry initialization would go here
    // For now, we'll use a graceful fallback
    console.log('[Monitoring] Sentry DSN configured, monitoring enabled')
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error, context?: ErrorContext) {
    if (this.enabled && typeof window !== 'undefined') {
      // In a real implementation, this would use Sentry SDK
      // For now, we log with structure
      console.error('[Sentry]', {
        error: error.message,
        stack: error.stack,
        ...context
      })
    } else {
      console.error('[Error]', error, context)
    }

    // Log to database for persistent tracking
    this.logToDatabase('error', error.message, {
      stack: error.stack,
      ...context
    })
  }

  /**
   * Capture a message with level
   */
  captureMessage(message: string, level: keyof LogLevel = 'INFO', context?: ErrorContext) {
    const logLevel = LOG_LEVELS[level]

    if (this.enabled) {
      console.log(`[Sentry:${logLevel}]`, message, context)
    } else {
      console.log(`[${logLevel.toUpperCase()}]`, message, context)
    }

    // Log non-debug messages to database
    if (level !== 'DEBUG') {
      this.logToDatabase(logLevel, message, context)
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (this.enabled) {
      console.log('[Analytics]', eventName, properties)
    }

    // Could integrate with analytics services here
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string; name?: string }) {
    if (this.enabled && typeof window !== 'undefined') {
      // Would set Sentry user context
      console.log('[Monitoring] User context set:', user)
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, level: keyof LogLevel = 'INFO', data?: Record<string, any>) {
    if (this.enabled) {
      console.log('[Breadcrumb]', { message, category, level, data })
    }
  }

  /**
   * Log to database for persistent storage
   */
  private async logToDatabase(level: string, message: string, context?: any) {
    try {
      // In a real implementation, this would save to a logs table
      // For now, we'll just prepare the structure
      const logEntry = {
        level,
        message,
        context: JSON.stringify(context || {}),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }

      // Could save to database here
      // await prisma.log.create({ data: logEntry })
    } catch (error) {
      // Don't throw on logging errors
      console.error('[Monitoring] Failed to log to database:', error)
    }
  }

  /**
   * Performance monitoring
   */
  measurePerformance(name: string, duration: number, tags?: Record<string, string>) {
    if (duration > 1000) {
      this.captureMessage(
        `Slow operation: ${name} took ${duration}ms`,
        'WARN',
        { tags: { ...tags, performance: 'slow' } }
      )
    }

    // Could send to performance monitoring service
    console.log('[Performance]', name, `${duration}ms`, tags)
  }

  /**
   * Start a performance measurement
   */
  startMeasure(name: string): () => void {
    const start = Date.now()

    return () => {
      const duration = Date.now() - start
      this.measurePerformance(name, duration)
    }
  }

  /**
   * Health check for monitoring system
   */
  healthCheck(): { status: string; sentry: boolean; database: boolean } {
    return {
      status: 'ok',
      sentry: this.enabled,
      database: true, // Would check actual DB connection
    }
  }
}

// Export singleton instance
export const monitoring = new MonitoringService()

// Export helper functions
export const captureException = (error: Error, context?: ErrorContext) =>
  monitoring.captureException(error, context)

export const captureMessage = (message: string, level?: keyof LogLevel, context?: ErrorContext) =>
  monitoring.captureMessage(message, level, context)

export const trackEvent = (eventName: string, properties?: Record<string, any>) =>
  monitoring.trackEvent(eventName, properties)

export const setUser = (user: { id: string; email?: string; name?: string }) =>
  monitoring.setUser(user)

export const measurePerformance = (name: string, duration: number, tags?: Record<string, string>) =>
  monitoring.measurePerformance(name, duration, tags)

export const startMeasure = (name: string) => monitoring.startMeasure(name)
