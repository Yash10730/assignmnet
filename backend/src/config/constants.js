const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin' });

const TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
});

const TICKET_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

// Numeric rank so tickets can be sorted by priority meaningfully
const PRIORITY_RANK = Object.freeze({ low: 1, medium: 2, high: 3, urgent: 4 });

const TICKET_CATEGORY = Object.freeze({
  TECHNICAL: 'technical',
  BILLING: 'billing',
  ACCOUNT: 'account',
  FEATURE_REQUEST: 'feature_request',
  GENERAL: 'general',
});

// Allowed status transitions (admin workflow)
const STATUS_TRANSITIONS = Object.freeze({
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['open', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'], // can be re-opened into progress
  closed: [], // terminal state
});

const PAGINATION = Object.freeze({ DEFAULT_LIMIT: 10, MAX_LIMIT: 100 });

module.exports = {
  ROLES,
  TICKET_STATUS,
  TICKET_PRIORITY,
  PRIORITY_RANK,
  TICKET_CATEGORY,
  STATUS_TRANSITIONS,
  PAGINATION,
};
