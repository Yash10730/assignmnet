const request = require('supertest');
const createApp = require('../../src/app');
const { eventBus } = require('../../src/events');
const db = require('../helpers');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('Comments, activity & notifications', () => {
  let user;
  let other;
  let admin;
  let ticket;

  beforeEach(async () => {
    user = await db.createUser('user');
    other = await db.createUser('user');
    admin = await db.createUser('admin');
    const res = await request(app).post('/api/tickets').set(user.auth).send({
      title: 'VPN keeps disconnecting',
      description: 'The VPN drops every 10 minutes while working from home.',
      category: 'technical',
    });
    ticket = res.body.data;
    await eventBus.drain();
  });

  it('owner and admin can comment; comments are linked to ticket and author', async () => {
    await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set(user.auth)
      .send({ message: 'Happens on Wi-Fi only.' })
      .expect(201);
    const reply = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set(admin.auth)
      .send({ message: 'Please update your VPN client to v5.' });
    expect(reply.status).toBe(201);
    expect(reply.body.data).toMatchObject({ authorRole: 'admin', ticket: ticket.id });

    const list = await request(app).get(`/api/tickets/${ticket.id}/comments`).set(user.auth);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[1].author.role).toBe('admin');

    const detail = await request(app).get(`/api/tickets/${ticket.id}`).set(user.auth);
    expect(detail.body.data.commentCount).toBe(2);
  });

  it("other users cannot comment on someone else's ticket", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set(other.auth)
      .send({ message: 'Hello' });
    expect(res.status).toBe(404);
  });

  it('blocks comments on closed tickets', async () => {
    await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set(admin.auth)
      .send({ status: 'closed' })
      .expect(200);
    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set(user.auth)
      .send({ message: 'Reopen please' });
    expect(res.status).toBe(409);
  });

  it('admin reply notifies the owner; notifications can be read', async () => {
    await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set(admin.auth)
      .send({ message: 'Looking into it.' })
      .expect(201);
    await eventBus.drain();

    const count = await request(app).get('/api/notifications/unread-count').set(user.auth);
    expect(count.body.data.count).toBe(1);

    const list = await request(app).get('/api/notifications').set(user.auth);
    expect(list.body.data[0].event).toBe('comment.added');

    await request(app)
      .patch(`/api/notifications/${list.body.data[0].id}/read`)
      .set(user.auth)
      .expect(200);
    const after = await request(app).get('/api/notifications/unread-count').set(user.auth);
    expect(after.body.data.count).toBe(0);
  });

  it('users cannot mark other users notifications as read', async () => {
    // admin got a notification for the ticket creation
    const adminList = await request(app).get('/api/notifications').set(admin.auth);
    const id = adminList.body.data[0].id;
    const res = await request(app).patch(`/api/notifications/${id}/read`).set(user.auth);
    expect(res.status).toBe(404);
  });

  it('mark all as read', async () => {
    const res = await request(app).patch('/api/notifications/read-all').set(admin.auth);
    expect(res.body.data.updated).toBe(1);
  });

  it('exposes the ticket activity timeline to owner and admin', async () => {
    await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set(admin.auth)
      .send({ status: 'in_progress' })
      .expect(200);
    await eventBus.drain();

    const res = await request(app).get(`/api/tickets/${ticket.id}/activity`).set(user.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.map((a) => a.event)).toEqual([
      'ticket.status_changed',
      'ticket.created',
    ]);
  });

  it('admin-only endpoints are protected', async () => {
    await request(app).get('/api/admin/activity').set(user.auth).expect(403);
    const users = await request(app).get('/api/admin/users').set(admin.auth);
    expect(users.status).toBe(200);
    const owner = users.body.data.find((u) => u.email === user.user.email);
    expect(owner.ticketCount).toBe(1);
    expect(owner.password).toBeUndefined();
  });
});
