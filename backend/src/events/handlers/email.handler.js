const User = require('../../models/User');
const { sendMail } = require('../../services/mail.service');
const { EVENT_TYPES } = require('../eventTypes');

/**
 * Emails the ticket owner when an admin changes the status or resolves the ticket.
 * Uses SMTP when configured, otherwise logs the email (see mail.service).
 */
async function handleEmail({ type, payload }) {
  const { ticket, actor } = payload;
  if (String(actor.id) === String(ticket.createdBy)) return;

  const owner = await User.findById(ticket.createdBy).lean();
  if (!owner) return;

  if (type === EVENT_TYPES.TICKET_RESOLVED) {
    await sendMail({
      to: owner.email,
      subject: `[Helpdesk] Your ticket "${ticket.title}" has been resolved`,
      text: `Hi ${owner.name},\n\nYour support ticket "${ticket.title}" was marked as resolved. If the issue persists, reply with a comment on the ticket.\n\n- Helpdesk Team`,
    });
  } else if (type === EVENT_TYPES.STATUS_CHANGED && payload.to !== 'resolved') {
    await sendMail({
      to: owner.email,
      subject: `[Helpdesk] Ticket "${ticket.title}" is now ${payload.to.replace(/_/g, ' ')}`,
      text: `Hi ${owner.name},\n\nThe status of your ticket "${ticket.title}" changed from ${payload.from} to ${payload.to}.\n\n- Helpdesk Team`,
    });
  }
}

module.exports = { handleEmail };
