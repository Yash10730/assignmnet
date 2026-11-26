const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const schema = require('../validators/ticket.validator');
const commentSchema = require('../validators/comment.validator');
const ctrl = require('../controllers/ticket.controller');
const commentCtrl = require('../controllers/comment.controller');

router.use(authenticate);

router
  .route('/')
  .get(validate(schema.list), ctrl.list)
  .post(validate(schema.create), ctrl.create);

router.get('/stats', ctrl.stats);

router
  .route('/:id')
  .get(validate(schema.byId), ctrl.getById)
  .patch(validate(schema.update), ctrl.update)
  .delete(validate(schema.byId), ctrl.remove);

// Admin-only workflow actions
router.patch('/:id/status', authorize(ROLES.ADMIN), validate(schema.updateStatus), ctrl.updateStatus);
router.patch(
  '/:id/priority',
  authorize(ROLES.ADMIN),
  validate(schema.updatePriority),
  ctrl.updatePriority
);

// Nested resources
router
  .route('/:id/comments')
  .get(validate(commentSchema.list), commentCtrl.list)
  .post(validate(commentSchema.create), commentCtrl.create);

router.get('/:id/activity', validate(schema.byId), ctrl.activity);

module.exports = router;
