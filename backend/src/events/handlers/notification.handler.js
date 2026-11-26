const Notification = require('../../models/Notification');
const User = require('../../models/User');
const { EVENT_TYPES } = require('../eventTypes');
const { ROLES } = require('../../config/constants');

const label = (s) => String(s).replace(/_/g, ' ');

async function adminIds() {
  const admins = await User.find({ role: ROLES.ADMIN }).select('_id').lean();
  return admins.map((a) => String(a._id));
}

/**
 * Decides WHO should be notified and WHAT they see for each event.
 * Returns { recipients: string[], message: string } or null.
 */
async function resolveNotification({ type, payload }) {
  const { ticket, actor } = payload;
  const owner = String(ticket.createdBy);
  const title = `"${ticket.title}"`;

  switch (type) {
    case EVENT_TYPES.TICKET_CREATED:
      return { recipients: await adminIds(), message: `New ticket ${title} submitted by ${actor.name}` };

    case EVENT_TYPES.COMMENT_ADDED:
      // Admin replied -> tell the owner. Owner commented -> tell the admins.
      return actor.role === ROLES.ADMIN
        ? { recipients: [owner], message: `Support replied on your ticket ${title}` }
        : { recipients: await adminIds(), message: `${actor.name} commented on ticket ${title}` };

    case EVENT_TYPES.STATUS_CHANGED:
      // "resolved" gets its own dedicated notification (TICKET_RESOLVED)
      if (payload.to === 'resolved') return null;
      return {
        recipients: [owner],
        message: `Status of your ticket ${title} changed to ${label(payload.to)}`,
      };

    case EVENT_TYPES.TICKET_RESOLVED:
      return { recipients: [owner], message: `Your ticket ${title} has been resolved` };

    case EVENT_TYPES.TICKET_UPDATED:
      if (actor.role !== ROLES.ADMIN) return null;
      return {
        recipients: [owner],
        message: `Support updated ${Object.keys(payload.changes).join(', ')} of your ticket ${title}`,
      };

    default:
      return null;
  }
}

async function handleNotification(event) {
  const result = await resolveNotification(event);
  if (!result) return;

  const actorId = String(event.payload.actor.id);
  // Never notify people about their own actions; de-duplicate recipients
  const recipients = [...new Set(result.recipients)].filter((id) => id !== actorId);
  if (!recipients.length) return;

  await Notification.insertMany(
    recipients.map((recipient) => ({
      recipient,
      ticket: event.payload.ticket.id,
      event: event.type,
      message: result.message,
    }))
  );
}

module.exports = { handleNotification, resolveNotification };
