const asyncHandler = require('../utils/asyncHandler');
const commentService = require('../services/comment.service');

exports.list = asyncHandler(async (req, res) => {
  const comments = await commentService.listComments(req.user, req.params.id);
  res.json({ success: true, data: comments });
});

exports.create = asyncHandler(async (req, res) => {
  const comment = await commentService.addComment(req.user, req.params.id, req.body.message);
  res.status(201).json({ success: true, data: comment });
});
