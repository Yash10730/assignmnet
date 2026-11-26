const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const { signToken } = require('../src/services/auth.service');
const { eventBus } = require('../src/events');

let mongod;

/** Starts an in-memory MongoDB (downloaded automatically on first run). */
async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function clear() {
  await eventBus.drain();
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function close() {
  await eventBus.drain();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

let counter = 0;
/** Creates a user directly in the DB and returns { user, token, auth } */
async function createUser(role = 'user', overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.com`,
    password: 'Password1',
    role,
    ...overrides,
  });
  const token = signToken(user);
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

module.exports = { connect, clear, close, createUser };
