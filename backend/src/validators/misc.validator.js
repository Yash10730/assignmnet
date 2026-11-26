const { z, idParam, paginationQuery } = require('./common');
const { EVENT_TYPES } = require('../events/eventTypes');

const notificationList = {
  query: z.object({
    ...paginationQuery,
    unread: z.enum(['true', 'false']).optional(),
  }),
};

const notificationById = { params: idParam };

const activityList = {
  query: z.object({
    ...paginationQuery,
    event: z.enum(Object.values(EVENT_TYPES)).optional(),
  }),
};

module.exports = { notificationList, notificationById, activityList };
