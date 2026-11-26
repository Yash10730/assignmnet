const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const ApiError = require('../utils/ApiError');
const { eventBus, EVENT_TYPES } = require('../events');
const { TICKET_STATUS } = require('../config/constants');
const { findAccessibleTicket, ticketRef, actorRef } = require('./ticket.service');

async function listComments(actor, ticketId) {
  const ticket = await findAccessibleTicket(actor, ticketId);
  return Comment.find({ ticket: ticket._id })
    .sort({ createdAt: 1 })
    .populate('author', 'name role');
}

/** Owners comment on their own tickets; admins can respond to any ticket. */
async function addComment(actor, ticketId, message) {
  const ticket = await findAccessibleTicket(actor, ticketId);
  if (ticket.status === TICKET_STATUS.CLOSED) {
    throw ApiError.conflict('Cannot comment on a closed ticket');
  }

  const comment = await Comment.create({
    ticket: ticket._id,
    author: actor.id,
    authorRole: actor.role,
    message,
  });
  await Ticket.updateOne({ _id: ticket._id }, { $inc: { commentCount: 1 } });

  eventBus.publish(EVENT_TYPES.COMMENT_ADDED, {
    ticket: ticketRef(ticket),
    actor: actorRef(actor),
    comment: { id: String(comment._id) },
  });

  return comment.populate('author', 'name role');
}

module.exports = { listComments, addComment };
