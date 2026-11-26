/* Minimal logger: silent during tests, timestamped otherwise. */
const silent = process.env.NODE_ENV === 'test';

const ts = () => new Date().toISOString();

const logger = {
  info: (...args) => !silent && console.log(`[${ts()}] INFO `, ...args),
  warn: (...args) => !silent && console.warn(`[${ts()}] WARN `, ...args),
  error: (...args) => !silent && console.error(`[${ts()}] ERROR`, ...args),
};

module.exports = logger;
