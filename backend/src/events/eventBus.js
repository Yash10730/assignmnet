const logger = require('../utils/logger');

/**
 * In-process publish/subscribe event bus.
 *
 * - Services publish domain events after a successful DB write.
 * - Handlers (activity log, notifications, email) subscribe to event types.
 * - Handlers run asynchronously and are isolated: a failing handler is logged
 *   and never breaks the HTTP request or the other handlers.
 * - `drain()` awaits all in-flight handlers (used by tests and graceful shutdown).
 *
 * The bus is the single seam to swap for a real broker (Redis, RabbitMQ, SQS)
 * later without touching services or handlers.
 */
class EventBus {
  constructor() {
    this.handlers = new Map(); // eventType -> [{ name, fn }]
    this.pending = new Set();
  }

  /** Subscribe to one event type, or '*' for all events. */
  subscribe(eventType, name, fn) {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, []);
    this.handlers.get(eventType).push({ name, fn });
    return () => this.unsubscribe(eventType, name);
  }

  unsubscribe(eventType, name) {
    const list = this.handlers.get(eventType) || [];
    this.handlers.set(
      eventType,
      list.filter((h) => h.name !== name)
    );
  }

  clear() {
    this.handlers.clear();
  }

  publish(type, payload = {}) {
    const event = { type, payload, occurredAt: new Date() };
    const targets = [...(this.handlers.get(type) || []), ...(this.handlers.get('*') || [])];

    targets.forEach(({ name, fn }) => {
      const run = Promise.resolve()
        .then(() => fn(event))
        .catch((err) => logger.error(`Event handler "${name}" failed for ${type}:`, err.message))
        .finally(() => this.pending.delete(run));
      this.pending.add(run);
    });

    return event;
  }

  /** Wait until every in-flight handler has settled. */
  async drain() {
    while (this.pending.size) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.allSettled([...this.pending]);
    }
  }
}

module.exports = new EventBus();
