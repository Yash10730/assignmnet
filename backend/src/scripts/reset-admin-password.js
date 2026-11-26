const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

async function resetAdminPassword() {
  try {
    if (env.admin.password.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    }

    await connectDB(env.mongoUri);

    const admin = await User.findOne({
      email: env.admin.email.toLowerCase(),
      role: ROLES.ADMIN,
    });

    if (!admin) {
      throw new Error(`Admin account not found for ${env.admin.email}`);
    }

    admin.password = env.admin.password;
    await admin.save();
    console.log(`Admin password reset for ${admin.email}`);
  } finally {
    await disconnectDB();
  }
}

resetAdminPassword().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
