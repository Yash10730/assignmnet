const ApiError = require('../utils/ApiError');

/**
 * Validates req.body / req.query / req.params against zod schemas.
 * Parsed values replace the originals, so unknown fields (e.g. "role" on
 * register, or "$gt" operator objects) are stripped before reaching services.
 */
const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  ['params', 'query', 'body'].forEach((part) => {
    if (!schemas[part]) return;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        errors.push({
          location: part,
          field: issue.path.join('.') || part,
          message: issue.message,
        })
      );
    } else if (part === 'query') {
      // req.query is a getter in some Express versions; store parsed copy
      req.validatedQuery = result.data;
    } else {
      req[part] = result.data;
    }
  });

  if (errors.length) return next(ApiError.badRequest('Validation failed', errors));
  return next();
};

module.exports = validate;
