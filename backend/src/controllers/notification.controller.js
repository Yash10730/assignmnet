const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification.service');

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await notificationService.listNotifications(
    req.user,
    req.validatedQuery || {}
  );
  res.json({ success: true, data: items, meta });
});

exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.unreadCount(req.user);
  res.json({ success: true, data: { count } });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.user, req.params.id);
  res.json({ success: true, data: notification });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user);
  res.json({ success: true, data: result });
});
