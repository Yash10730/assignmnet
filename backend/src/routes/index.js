const router = require('express').Router();
const mongoose = require('mongoose');

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    },
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/tickets', require('./ticket.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
