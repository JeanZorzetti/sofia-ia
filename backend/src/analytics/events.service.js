const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

// Helper to create a new LowDB instance
const createDb = (fileName) => {
  const filePath = path.join(__dirname, '../../logs', fileName);
  const adapter = new JSONFile(filePath);
  return new Low(adapter);
};

class AnalyticsEventsService {
  constructor() {
    this.eventsDb = createDb('analytics_events.json');
    this.sessionsDb = createDb('user_sessions.json');
    this.metricsDb = createDb('business_metrics.json');

    this.eventsBuffer = [];
    this.init();

    // Flush buffer to disk periodically
    this.flushInterval = setInterval(() => this.flushEventsToDisk(), 30000);
    console.log('🚀 Analytics Service Initialized with LowDB');
  }

  async init() {
    // Initialize databases with default empty structures
    await this.eventsDb.read();
    this.eventsDb.data = this.eventsDb.data || { events: [] };
    await this.eventsDb.write();

    await this.sessionsDb.read();
    this.sessionsDb.data = this.sessionsDb.data || { sessions: [] };
    await this.sessionsDb.write();

    await this.metricsDb.read();
    this.metricsDb.data = this.metricsDb.data || { metrics: [] };
    await this.metricsDb.write();

    console.log('[Analytics] Databases initialized.');
  }

  // --- Event Processing ---

  async processEvents(eventsData) {
    const { events, session_id, user_id } = eventsData;
    console.log(
      `[Analytics] Processing ${events.length} events for session ${session_id}`
    );

    const enrichedEvents = events.map((event) => ({
      ...event,
      processed_at: new Date().toISOString(),
      server_timestamp: Date.now(),
      session_id,
      user_id,
    }));

    this.eventsBuffer.push(...enrichedEvents);

    // These can still be processed in real-time
    await this.processBusinessIntelligence(enrichedEvents);
    await this.updateUserSession(session_id, user_id, enrichedEvents);

    return { success: true, events_processed: events.length };
  }

  async flushEventsToDisk() {
    if (this.eventsBuffer.length === 0) return;

    try {
      await this.eventsDb.read();
      this.eventsDb.data.events.push(...this.eventsBuffer);
      await this.eventsDb.write();

      console.log(
        `[Analytics] Flushed ${this.eventsBuffer.length} events to disk.`
      );
      this.eventsBuffer = []; // Clear buffer after writing
    } catch (error) {
      console.error('[Analytics] Error flushing events to disk:', error);
    }
  }

  // --- Persistence (using LowDB) ---

  async updateUserSession(sessionId, userId, events) {
    await this.sessionsDb.read();
    const { sessions } = this.sessionsDb.data;

    const sessionData = {
      session_id: sessionId,
      user_id: userId,
      start_time: Math.min(...events.map((e) => e.timestamp)),
      last_activity: Math.max(...events.map((e) => e.timestamp)),
      events_count: events.length,
      event_types: [...new Set(events.map((e) => e.event_name))],
      updated_at: new Date().toISOString(),
    };

    const existingIndex = sessions.findIndex((s) => s.session_id === sessionId);
    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...sessions[existingIndex], ...sessionData };
    } else {
      sessions.push(sessionData);
    }
    await this.sessionsDb.write();
  }

  async saveBusinessMetrics(metrics) {
    await this.metricsDb.read();
    const { metrics: existingMetrics } = this.metricsDb.data;
    existingMetrics.push(metrics);

    // Optional: Keep only the last 100 metric entries
    if (existingMetrics.length > 100) {
      this.metricsDb.data.metrics = existingMetrics.slice(-100);
    }

    await this.metricsDb.write();
  }

  // --- Insight Generation (logic is the same, data source changes) ---

  async generateInsights() {
    await this.eventsDb.read();
    await this.sessionsDb.read();

    const events = this.eventsDb.data.events || [];
    const sessions = this.sessionsDb.data.sessions || [];

    // All the calculation methods below this point remain the same
    // as they operate on the arrays, not the storage mechanism.
    // ... (keep all calculation helpers like calculateAvgSessionDuration, etc.)
    return {
      /* ... insights data ... */
    };
  }

  // --- Cleanup ---

  async cleanup() {
    // Stop the interval to prevent writes during cleanup
    clearInterval(this.flushInterval);
    // Ensure any remaining events in the buffer are written
    await this.flushEventsToDisk();
    console.log('[Analytics] Service cleanup complete.');
  }

  // NOTE: All the helper methods for calculating metrics (calculateAvgSessionDuration, getMostActiveHour, etc.)
  // would be pasted here as they were, since their logic is independent of the data storage.
  // For brevity, they are omitted from this generated code block.
}

module.exports = new AnalyticsEventsService();
