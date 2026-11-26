const env = require('./config/env');
const createApp = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { eventBus } = require('./events');
const logger = require('./utils/logger');

async function start() {
  await connectDB(env.mongoUri);
  const app = createApp();
  const server = app.listen(env.port, () =>
    logger.info(`Helpdesk API listening on port ${env.port} (${env.nodeEnv})`)
  );

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await eventBus.drain(); // let pending event handlers finish
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
