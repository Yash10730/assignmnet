const request = require('supertest');
const createApp = require('../../src/app');
const { escapeRegex, getPagination } = require('../../src/utils/pagination');

// These requests are rejected before any database access, so no DB is needed.
const app = createApp();

describe('request validation & error handling (no DB)', () => {
  it('GET /api/health responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid registration payloads with field errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('rejects NoSQL operator injection in login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON body');
  });

  it('requires a bearer token on protected routes', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/tickets').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid token');
  });
});

describe('utils', () => {
  it('escapes regex special characters', () => {
    expect(escapeRegex('a.*(b)')).toBe('a\\.\\*\\(b\\)');
  });

  it('clamps pagination values', () => {
    expect(getPagination({ page: '0', limit: '1000' })).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(getPagination({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20, skip: 40 });
  });
});
