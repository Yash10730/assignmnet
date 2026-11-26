const { z, idParam } = require('./common');

const create = {
  params: idParam,
  body: z.object({
    message: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
  }),
};

const list = { params: idParam };

module.exports = { create, list };
