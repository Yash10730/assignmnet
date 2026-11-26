const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const schema = require('../validators/auth.validator');
const ctrl = require('../controllers/auth.controller');

// Brute-force protection on credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, error: { message: 'Too many attempts, try again later' } },
});

router.post('/register', authLimiter, validate(schema.register), ctrl.register);
router.post('/login', authLimiter, validate(schema.login), ctrl.login);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
