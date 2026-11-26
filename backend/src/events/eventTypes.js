const EVENT_TYPES = Object.freeze({
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_DELETED: 'ticket.deleted',
  STATUS_CHANGED: 'ticket.status_changed',
  TICKET_RESOLVED: 'ticket.resolved',
  COMMENT_ADDED: 'comment.added',
});

module.exports = { EVENT_TYPES };
