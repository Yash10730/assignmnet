const request = require('supertest');
const createApp = require('../../src/app');
const { eventBus } = require('../../src/events');
const ActivityLog = require('../../src/models/ActivityLog');
const Notification = require('../../src/models/Notification');
const Comment = require('../../src/models/Comment');
const db = require('../helpers');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const sample = {
  title: 'Cannot access my account',
  description: 'I get an error every time I try to log in to the portal.',
  category: 'account',
  priority: 'high',
};

async function createTicket(auth, data = {}) {
  const res = await request(app).post('/api/tickets').set(auth).send({ ...sample, ...data });
  expect(res.status).toBe(201);
  return res.body.data;
}

describe('Ticket API', () => {
  let user;
  let other;
  let admin;

  beforeEach(async () => {
    user = await db.createUser('user');
    other = await db.createUser('user');
    admin = await db.createUser('admin');
  });

  it('creates a ticket with defaults and fires TICKET_CREATED', async () => {
    const ticket = await createTicket(user.auth);
    expect(ticket).toMatchObject({ status: 'open', priority: 'high', category: 'account' });
    expect(ticket.createdBy.email).toBe(user.user.email);

    await eventBus.drain();
    const log = await ActivityLog.findOne({ event: 'ticket.created' });
    expect(log).not.toBeNull();
    const notes = await Notification.find({ recipient: admin.user._id });
    expect(notes).toHaveLength(1);
  });

  it('validates ticket input', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(user.auth)
      .send({ title: 'x', description: 'short', priority: 'critical' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
  });

  it('users only see their own tickets; admins see all', async () => {
    await createTicket(user.auth);
    await createTicket(other.auth);

    const mine = await request(app).get('/api/tickets').set(user.auth);
    expect(mine.body.data).toHaveLength(1);

    const all = await request(app).get('/api/tickets').set(admin.auth);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta).toMatchObject({ total: 2, page: 1 });
  });

  it("returns 404 when a user requests someone else's ticket", async () => {
    const ticket = await createTicket(other.auth);
    const res = await request(app).get(`/api/tickets/${ticket.id}`).set(user.auth);
    expect(res.status).toBe(404);
  });

  it('supports filtering, search, sorting and pagination for admins', async () => {
    await createTicket(user.auth, { title: 'Billing issue one', priority: 'low', category: 'billing' });
    await createTicket(user.auth, { title: 'Billing issue two', priority: 'urgent', category: 'billing' });
    await createTicket(other.auth, { title: 'Feature: export CSV', priority: 'medium' });

    const byPriority = await request(app).get('/api/tickets?priority=urgent').set(admin.auth);
    expect(byPriority.body.data).toHaveLength(1);

    const search = await request(app).get('/api/tickets?search=billing').set(admin.auth);
    expect(search.body.data).toHaveLength(2);

    const sorted = await request(app)
      .get('/api/tickets?sortBy=priority&order=desc')
      .set(admin.auth);
    expect(sorted.body.data.map((t) => t.priority)).toEqual(['urgent', 'medium', 'low']);

    const paged = await request(app).get('/api/tickets?limit=2&page=2').set(admin.auth);
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.meta.totalPages).toBe(2);

    const byUser = await request(app)
      .get(`/api/tickets?createdBy=${other.user._id}`)
      .set(admin.auth);
    expect(byUser.body.data).toHaveLength(1);
  });

  it('lets the owner edit while open and fires TICKET_UPDATED', async () => {
    const ticket = await createTicket(user.auth);
    const res = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set(user.auth)
      .send({ title: 'Cannot access my account at all' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Cannot access my account at all');

    await eventBus.drain();
    const log = await ActivityLog.findOne({ event: 'ticket.updated' });
    expect(log.metadata.changes.title.to).toBe('Cannot access my account at all');
  });

  it('blocks edits once the ticket is in progress', async () => {
    const ticket = await createTicket(user.auth);
    await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set(admin.auth)
      .send({ status: 'in_progress' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set(user.auth)
      .send({ title: 'Trying to edit later' });
    expect(res.status).toBe(409);
  });

  it('forbids users from changing status or priority', async () => {
    const ticket = await createTicket(user.auth);
    const s = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set(user.auth)
      .send({ status: 'resolved' });
    const p = await request(app)
      .patch(`/api/tickets/${ticket.id}/priority`)
      .set(user.auth)
      .send({ priority: 'low' });
    expect(s.status).toBe(403);
    expect(p.status).toBe(403);
  });

  it('admin resolves a ticket: STATUS_CHANGED + TICKET_RESOLVED + owner notified', async () => {
    const ticket = await createTicket(user.auth);
    const res = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set(admin.auth)
      .send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.data.resolvedAt).not.toBeNull();

    await eventBus.drain();
    const events = (await ActivityLog.find({ ticket: ticket.id })).map((l) => l.event);
    expect(events).toEqual(
      expect.arrayContaining(['ticket.created', 'ticket.status_changed', 'ticket.resolved'])
    );
    const ownerNotes = await Notification.find({ recipient: user.user._id });
    expect(ownerNotes.map((n) => n.event)).toContain('ticket.resolved');
  });

  it('enforces valid status transitions', async () => {
    const ticket = await createTicket(user.auth);
    await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set(admin.auth)
      .send({ status: 'closed' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/tickets/${ticket.id}/status`)
      .set(admin.auth)
      .send({ status: 'open' });
    expect(res.status).toBe(409);
  });

  it('admin updates priority', async () => {
    const ticket = await createTicket(user.auth);
    const res = await request(app)
      .patch(`/api/tickets/${ticket.id}/priority`)
      .set(admin.auth)
      .send({ priority: 'urgent' });
    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe('urgent');
  });

  it('owner deletes an open ticket and its comments are removed', async () => {
    const ticket = await createTicket(user.auth);
    await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set(user.auth)
      .send({ message: 'Any update?' })
      .expect(201);

    await request(app).delete(`/api/tickets/${ticket.id}`).set(user.auth).expect(204);
    expect(await Comment.countDocuments({ ticket: ticket.id })).toBe(0);
    await request(app).get(`/api/tickets/${ticket.id}`).set(user.auth).expect(404);
  });

  it('rejects malformed ids with 400', async () => {
    const res = await request(app).get('/api/tickets/123').set(user.auth);
    expect(res.status).toBe(400);
  });

  it('returns dashboard stats scoped by role', async () => {
    await createTicket(user.auth, { priority: 'low' });
    await createTicket(other.auth, { priority: 'urgent' });

    const mine = await request(app).get('/api/tickets/stats').set(user.auth);
    expect(mine.body.data.total).toBe(1);

    const all = await request(app).get('/api/tickets/stats').set(admin.auth);
    expect(all.body.data.total).toBe(2);
    expect(all.body.data.byPriority).toEqual({ low: 1, urgent: 1 });
    expect(all.body.data.byStatus).toEqual({ open: 2 });
  });
});
