const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');

async function listNotifications(actor, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { recipient: actor.id };
  if (query.unread === 'true') filter.read = false;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: actor.id, read: false }),
  ]);
  return { items, meta: { ...buildMeta({ page, limit }, total), unread } };
}

async function unreadCount(actor) {
  return Notification.countDocuments({ recipient: actor.id, read: false });
}

async function markRead(actor, id) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: actor.id },
    { read: true },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  return notification;
}

async function markAllRead(actor) {
  const res = await Notification.updateMany({ recipient: actor.id, read: false }, { read: true });
  return { updated: res.modifiedCount };
}

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
