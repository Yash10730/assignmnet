const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const schema = require('../validators/misc.validator');
const ctrl = require('../controllers/admin.controller');

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/activity', validate(schema.activityList), ctrl.activity);
router.get('/users', ctrl.users);

module.exports = router;
