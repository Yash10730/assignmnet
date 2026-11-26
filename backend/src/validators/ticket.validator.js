const { z, idParam, objectId, paginationQuery } = require('./common');
const {
  TICKET_STATUS,
  TICKET_PRIORITY,
  TICKET_CATEGORY,
} = require('../config/constants');

const status = z.enum(Object.values(TICKET_STATUS));
const priority = z.enum(Object.values(TICKET_PRIORITY));
const category = z.enum(Object.values(TICKET_CATEGORY));

const title = z.string().trim().min(5, 'Title must be at least 5 characters').max(150);
const description = z
  .string()
  .trim()
  .min(10, 'Description must be at least 10 characters')
  .max(5000);

const create = {
  body: z.object({
    title,
    description,
    category: category.optional(),
    priority: priority.optional(),
  }),
};

const update = {
  params: idParam,
  body: z
    .object({
      title: title.optional(),
      description: description.optional(),
      category: category.optional(),
      priority: priority.optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one field to update' }),
};

const updateStatus = { params: idParam, body: z.object({ status }) };
const updatePriority = { params: idParam, body: z.object({ priority }) };

const list = {
  query: z.object({
    ...paginationQuery,
    status: status.optional(),
    priority: priority.optional(),
    category: category.optional(),
    createdBy: objectId.optional(), // admin only, ignored for users
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'title']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
};

const byId = { params: idParam };

module.exports = { create, update, updateStatus, updatePriority, list, byId };
