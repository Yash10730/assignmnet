const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');

exports.activity = asyncHandler(async (req, res) => {
  const { items, meta } = await adminService.listActivity(req.validatedQuery || {});
  res.json({ success: true, data: items, meta });
});

exports.users = asyncHandler(async (req, res) => {
  const users = await adminService.listUsers();
  res.json({ success: true, data: users });
});
