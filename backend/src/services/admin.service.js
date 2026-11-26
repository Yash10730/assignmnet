const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { getPagination, buildMeta } = require('../utils/pagination');

async function listActivity(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = query.event ? { event: query.event } : {};

  const [items, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name role')
      .populate('ticket', 'title status'),
    ActivityLog.countDocuments(filter),
  ]);
  return { items, meta: buildMeta({ page, limit }, total) };
}

/** Users with their ticket counts — used by admins to filter tickets per user. */
async function listUsers() {
  return User.aggregate([
    {
      $lookup: {
        from: 'tickets',
        localField: '_id',
        foreignField: 'createdBy',
        as: 'tickets',
      },
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        email: 1,
        role: 1,
        createdAt: 1,
        ticketCount: { $size: '$tickets' },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);
}

module.exports = { listActivity, listUsers };
