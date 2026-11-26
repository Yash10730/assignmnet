const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/** Converts known error types into consistent JSON responses. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let error = err;

  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}`);
  } else if (err.name === 'ValidationError' && err.errors) {
    error = ApiError.badRequest(
      'Validation failed',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`An account with this ${field} already exists`);
  } else if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  } else if (err.type === 'entity.too.large') {
    error = new ApiError(413, 'Request body too large');
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) logger.error(err);

  res.status(statusCode).json({
    success: false,
    error: {
      message:
        statusCode >= 500 && env.isProduction ? 'Internal server error' : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
