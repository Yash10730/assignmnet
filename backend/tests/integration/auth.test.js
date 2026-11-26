const request = require('supertest');
const createApp = require('../../src/app');
const db = require('../helpers');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('Auth API', () => {
  const body = { name: 'Asha Rao', email: 'asha@test.com', password: 'Password1' };

  it('registers a user and returns a token (role cannot be self-assigned)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...body, role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toMatchObject({ email: 'asha@test.com', role: 'user' });
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects duplicate emails with 409', async () => {
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ASHA@test.com', password: 'Password1' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password with a generic message', async () => {
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: body.email, password: 'Wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns the current user from /me', async () => {
    const { auth, user } = await db.createUser();
    const res = await request(app).get('/api/auth/me').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
  });
});
