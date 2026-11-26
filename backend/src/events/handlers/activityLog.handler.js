const ActivityLog = require('../../models/ActivityLog');
const { EVENT_TYPES } = require('../eventTypes');

const label = (s) => String(s).replace(/_/g, ' ');

/** Builds a human readable line for the audit trail. */
function describe(event) {
  const { type, payload } = event;
  const who = payload.actor ? `${payload.actor.name} (${payload.actor.role})` : 'System';
  const title = payload.ticket ? `"${payload.ticket.title}"` : '';

  switch (type) {
    case EVENT_TYPES.TICKET_CREATED:
      return `${who} created ticket ${title}`;
    case EVENT_TYPES.TICKET_UPDATED:
      return `${who} updated ${Object.keys(payload.changes || {}).join(', ') || 'details'} of ticket ${title}`;
    case EVENT_TYPES.TICKET_DELETED:
      return `${who} deleted ticket ${title}`;
    case EVENT_TYPES.STATUS_CHANGED:
      return `${who} changed status of ${title} from ${label(payload.from)} to ${label(payload.to)}`;
    case EVENT_TYPES.TICKET_RESOLVED:
      return `Ticket ${title} was marked as resolved by ${who}`;
    case EVENT_TYPES.COMMENT_ADDED:
      return `${who} commented on ticket ${title}`;
    default:
      return `${type} by ${who}`;
  }
}

function metadataFor({ type, payload }) {
  switch (type) {
    case EVENT_TYPES.TICKET_UPDATED:
      return { changes: payload.changes };
    case EVENT_TYPES.STATUS_CHANGED:
      return { from: payload.from, to: payload.to };
    case EVENT_TYPES.COMMENT_ADDED:
      return { commentId: payload.comment && payload.comment.id };
    default:
      return {};
  }
}

async function handleActivityLog(event) {
  const { payload } = event;
  await ActivityLog.create({
    event: event.type,
    ticket: payload.ticket ? payload.ticket.id : undefined,
    actor: payload.actor ? payload.actor.id : undefined,
    message: describe(event),
    metadata: metadataFor(event),
  });
}

module.exports = { handleActivityLog, describe };
