require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/helpdesk',
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev-only-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  admin: {
    name: process.env.ADMIN_NAME || 'Admin',
    email: process.env.ADMIN_EMAIL || 'admin@helpdesk.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Helpdesk <no-reply@helpdesk.com>',
  },
};

if (env.isProduction && !env.jwtSecret) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
