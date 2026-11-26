const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { registerEventHandlers } = require('./events');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  registerEventHandlers();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // correct client IPs behind Render/Railway proxies (rate limiting)

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // allow non-browser clients (Postman, curl) and configured origins
        if (!origin || env.corsOrigin.includes('*') || env.corsOrigin.includes(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      },
    })
  );
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.get('/', (_req, res) =>
    res.json({ success: true, data: { name: 'Helpdesk API', docs: '/api/health' } })
  );
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
