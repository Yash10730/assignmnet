/**
 * Creates the admin account (from ADMIN_* env vars) and, with --demo,
 * a demo user with a few sample tickets.
 *
 *   npm run seed            -> admin only
 *   npm run seed -- --demo  -> admin + demo data
 */
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { ROLES } = require('../config/constants');

async function seed() {
  await connectDB(env.mongoUri);

  let admin = await User.findOne({ email: env.admin.email.toLowerCase() });
  if (!admin) {
    admin = await User.create({ ...env.admin, role: ROLES.ADMIN });
    console.log(`Admin created: ${admin.email}`);
  } else {
    console.log(`Admin already exists: ${admin.email}`);
  }

  if (process.argv.includes('--demo')) {
    let demo = await User.findOne({ email: 'user@helpdesk.com' });
    if (!demo) {
      demo = await User.create({ name: 'Demo User', email: 'user@helpdesk.com', password: 'User@1234' });
      console.log('Demo user created: user@helpdesk.com / User@1234');
    }
    if (!(await Ticket.exists({ createdBy: demo._id }))) {
      await Ticket.create([
        {
          title: 'Unable to reset my password',
          description: 'The reset email never arrives in my inbox or spam folder.',
          category: 'account',
          priority: 'high',
          createdBy: demo._id,
        },
        {
          title: 'Charged twice for subscription',
          description: 'My card was charged twice for the November subscription.',
          category: 'billing',
          priority: 'urgent',
          status: 'in_progress',
          createdBy: demo._id,
        },
        {
          title: 'Add dark mode to dashboard',
          description: 'It would be great to have a dark theme for late night work.',
          category: 'feature_request',
          priority: 'low',
          createdBy: demo._id,
        },
      ]);
      console.log('Demo tickets created');
    }
  }

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
