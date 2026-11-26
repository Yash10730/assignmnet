const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { eventBus, EVENT_TYPES } = require('../events');
const { ROLES, TICKET_STATUS, STATUS_TRANSITIONS } = require('../config/constants');

const isAdmin = (actor) => actor.role === ROLES.ADMIN;
const ownerId = (ticket) => String(ticket.createdBy?._id ?? ticket.createdBy);
const isOwner = (actor, ticket) => ownerId(ticket) === String(actor.id);

/** Minimal, serialisable snapshots passed along with events. */
const ticketRef = (ticket) => ({
  id: String(ticket._id),
  title: ticket.title,
  createdBy: ownerId(ticket),
});
const actorRef = (actor) => ({ id: String(actor.id), name: actor.name, role: actor.role });

const AUTHOR_FIELDS = 'name email role';

/**
 * Loads a ticket the actor is allowed to see.
 * Users get 404 (not 403) for other people's tickets so ticket ids can't be probed.
 */
async function findAccessibleTicket(actor, id) {
  const ticket = await Ticket.findById(id);
  if (!ticket || (!isAdmin(actor) && !isOwner(actor, ticket))) {
    throw ApiError.notFound('Ticket not found');
  }
  return ticket;
}

async function createTicket(actor, data) {
  const ticket = await Ticket.create({ ...data, createdBy: actor.id });
  eventBus.publish(EVENT_TYPES.TICKET_CREATED, {
    ticket: ticketRef(ticket),
    actor: actorRef(actor),
  });
  return ticket.populate('createdBy', AUTHOR_FIELDS);
}

async function listTickets(actor, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  // Data protection: users only ever see their own tickets
  if (!isAdmin(actor)) filter.createdBy = actor.id;
  else if (query.createdBy) filter.createdBy = query.createdBy;

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const sortField = query.sortBy === 'priority' ? 'priorityRank' : query.sortBy || 'createdAt';
  const sort = { [sortField]: query.order === 'asc' ? 1 : -1, _id: -1 };

  const [items, total] = await Promise.all([
    Ticket.find(filter).sort(sort).skip(skip).limit(limit).populate('createdBy', AUTHOR_FIELDS),
    Ticket.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit }, total) };
}

async function getTicket(actor, id) {
  const ticket = await findAccessibleTicket(actor, id);
  return ticket.populate('createdBy', AUTHOR_FIELDS);
}

/** Owner edits ticket content. Only allowed while the ticket is still open. */
async function updateTicket(actor, id, data) {
  const ticket = await findAccessibleTicket(actor, id);
  if (!isOwner(actor, ticket)) throw ApiError.forbidden('Only the ticket owner can edit ticket details');
  if (ticket.status !== TICKET_STATUS.OPEN) {
    throw ApiError.conflict('Ticket can only be edited while its status is open');
  }

  const changes = {};
  Object.entries(data).forEach(([field, value]) => {
    if (value !== undefined && ticket[field] !== value) {
      changes[field] = { from: ticket[field], to: value };
      ticket[field] = value;
    }
  });

  if (Object.keys(changes).length) {
    await ticket.save();
    eventBus.publish(EVENT_TYPES.TICKET_UPDATED, {
      ticket: ticketRef(ticket),
      actor: actorRef(actor),
      changes,
    });
  }
  return ticket.populate('createdBy', AUTHOR_FIELDS);
}

/** Owner may delete while open; admins may delete any ticket. Comments/notifications cascade. */
async function deleteTicket(actor, id) {
  const ticket = await findAccessibleTicket(actor, id);
  if (!isAdmin(actor)) {
    if (!isOwner(actor, ticket)) throw ApiError.forbidden();
    if (ticket.status !== TICKET_STATUS.OPEN) {
      throw ApiError.conflict('Ticket can only be deleted while its status is open');
    }
  }

  await Promise.all([
    Comment.deleteMany({ ticket: ticket._id }),
    Notification.deleteMany({ ticket: ticket._id }),
    ticket.deleteOne(),
  ]);

  // Activity log is kept as an audit trail even after deletion
  eventBus.publish(EVENT_TYPES.TICKET_DELETED, {
    ticket: ticketRef(ticket),
    actor: actorRef(actor),
  });
}

/** Admin workflow: validated status transitions. */
async function updateStatus(actor, id, status) {
  const ticket = await findAccessibleTicket(actor, id);
  const from = ticket.status;

  if (from === status) throw ApiError.badRequest(`Ticket is already ${status}`);
  if (!STATUS_TRANSITIONS[from].includes(status)) {
    throw ApiError.conflict(`Cannot change status from ${from} to ${status}`);
  }

  ticket.status = status;
  await ticket.save();

  const payload = { ticket: ticketRef(ticket), actor: actorRef(actor) };
  eventBus.publish(EVENT_TYPES.STATUS_CHANGED, { ...payload, from, to: status });
  if (status === TICKET_STATUS.RESOLVED) eventBus.publish(EVENT_TYPES.TICKET_RESOLVED, payload);

  return ticket.populate('createdBy', AUTHOR_FIELDS);
}

async function updatePriority(actor, id, priority) {
  const ticket = await findAccessibleTicket(actor, id);
  if (ticket.status === TICKET_STATUS.CLOSED) {
    throw ApiError.conflict('Cannot change priority of a closed ticket');
  }
  if (ticket.priority !== priority) {
    const changes = { priority: { from: ticket.priority, to: priority } };
    ticket.priority = priority;
    await ticket.save();
    eventBus.publish(EVENT_TYPES.TICKET_UPDATED, {
      ticket: ticketRef(ticket),
      actor: actorRef(actor),
      changes,
    });
  }
  return ticket.populate('createdBy', AUTHOR_FIELDS);
}

/** Dashboard statistics. Admin: all tickets. User: own tickets. */
async function getStats(actor) {
  const match = isAdmin(actor) ? {} : { createdBy: new mongoose.Types.ObjectId(actor.id) };

  const [result] = await Ticket.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        avgResolutionMs: [
          { $match: { resolvedAt: { $ne: null } } },
          { $group: { _id: null, avg: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } },
        ],
      },
    },
  ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const avgMs = result.avgResolutionMs[0]?.avg;

  const recent = await Ticket.find(match)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('createdBy', AUTHOR_FIELDS);

  return {
    total: result.total[0]?.count || 0,
    byStatus: toMap(result.byStatus),
    byPriority: toMap(result.byPriority),
    byCategory: toMap(result.byCategory),
    avgResolutionHours: avgMs ? Math.round((avgMs / 36e5) * 10) / 10 : null,
    recent,
  };
}

async function getTicketActivity(actor, id) {
  const ticket = await findAccessibleTicket(actor, id);
  return ActivityLog.find({ ticket: ticket._id })
    .sort({ createdAt: -1, _id: -1 })
    .populate('actor', 'name role');
}

module.exports = {
  findAccessibleTicket,
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  deleteTicket,
  updateStatus,
  updatePriority,
  getStats,
  getTicketActivity,
  ticketRef,
  actorRef,
};
