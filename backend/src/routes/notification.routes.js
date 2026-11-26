const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const schema = require('../validators/misc.validator');
const ctrl = require('../controllers/notification.controller');

router.use(authenticate);

router.get('/', validate(schema.notificationList), ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', validate(schema.notificationById), ctrl.markRead);

module.exports = router;
