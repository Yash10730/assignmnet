const asyncHandler = require('../utils/asyncHandler');
const ticketService = require('../services/ticket.service');

exports.create = asyncHandler(async (req, res) => {
  const ticket = await ticketService.createTicket(req.user, req.body);
  res.status(201).json({ success: true, data: ticket });
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await ticketService.listTickets(req.user, req.validatedQuery || {});
  res.json({ success: true, data: items, meta });
});

exports.stats = asyncHandler(async (req, res) => {
  const stats = await ticketService.getStats(req.user);
  res.json({ success: true, data: stats });
});

exports.getById = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicket(req.user, req.params.id);
  res.json({ success: true, data: ticket });
});

exports.update = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateTicket(req.user, req.params.id, req.body);
  res.json({ success: true, data: ticket });
});

exports.remove = asyncHandler(async (req, res) => {
  await ticketService.deleteTicket(req.user, req.params.id);
  res.status(204).send();
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateStatus(req.user, req.params.id, req.body.status);
  res.json({ success: true, data: ticket });
});

exports.updatePriority = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updatePriority(req.user, req.params.id, req.body.priority);
  res.json({ success: true, data: ticket });
});

exports.activity = asyncHandler(async (req, res) => {
  const logs = await ticketService.getTicketActivity(req.user, req.params.id);
  res.json({ success: true, data: logs });
});
