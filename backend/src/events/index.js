const eventBus = require('./eventBus');
const { EVENT_TYPES } = require('./eventTypes');
const { handleActivityLog } = require('./handlers/activityLog.handler');
const { handleNotification } = require('./handlers/notification.handler');
const { handleEmail } = require('./handlers/email.handler');

let registered = false;

/**
 * Wires event types to their actions. Called once at app start-up.
 *
 *   every event              -> activity log (audit trail)
 *   created/updated/status/
 *   resolved/comment         -> in-app notifications
 *   status changed/resolved  -> email to ticket owner
 */
function registerEventHandlers() {
  if (registered) return;
  registered = true;

  eventBus.subscribe('*', 'activityLog', handleActivityLog);

  [
    EVENT_TYPES.TICKET_CREATED,
    EVENT_TYPES.TICKET_UPDATED,
    EVENT_TYPES.STATUS_CHANGED,
    EVENT_TYPES.TICKET_RESOLVED,
    EVENT_TYPES.COMMENT_ADDED,
  ].forEach((type) => eventBus.subscribe(type, 'notification', handleNotification));

  [EVENT_TYPES.STATUS_CHANGED, EVENT_TYPES.TICKET_RESOLVED].forEach((type) =>
    eventBus.subscribe(type, 'email', handleEmail)
  );
}

module.exports = { eventBus, EVENT_TYPES, registerEventHandlers };
