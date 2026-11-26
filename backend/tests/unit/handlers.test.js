jest.mock('../../src/models/User', () => ({
  find: jest.fn(() => ({
    select: () => ({ lean: () => Promise.resolve([{ _id: 'admin1' }, { _id: 'admin2' }]) }),
  })),
}));

const { resolveNotification } = require('../../src/events/handlers/notification.handler');
const { describe: describeEvent } = require('../../src/events/handlers/activityLog.handler');
const { EVENT_TYPES } = require('../../src/events/eventTypes');

const ticket = { id: 't1', title: 'Printer broken', createdBy: 'owner1' };
const owner = { id: 'owner1', name: 'Asha', role: 'user' };
const admin = { id: 'admin1', name: 'Ravi', role: 'admin' };

describe('notification rules', () => {
  it('notifies all admins when a ticket is created', async () => {
    const r = await resolveNotification({
      type: EVENT_TYPES.TICKET_CREATED,
      payload: { ticket, actor: owner },
    });
    expect(r.recipients).toEqual(['admin1', 'admin2']);
    expect(r.message).toContain('Printer broken');
  });

  it('notifies the owner when an admin comments', async () => {
    const r = await resolveNotification({
      type: EVENT_TYPES.COMMENT_ADDED,
      payload: { ticket, actor: admin },
    });
    expect(r.recipients).toEqual(['owner1']);
  });

  it('notifies admins when the owner comments', async () => {
    const r = await resolveNotification({
      type: EVENT_TYPES.COMMENT_ADDED,
      payload: { ticket, actor: owner },
    });
    expect(r.recipients).toEqual(['admin1', 'admin2']);
  });

  it('uses a dedicated resolved notification instead of a status one', async () => {
    const status = await resolveNotification({
      type: EVENT_TYPES.STATUS_CHANGED,
      payload: { ticket, actor: admin, from: 'open', to: 'resolved' },
    });
    const resolved = await resolveNotification({
      type: EVENT_TYPES.TICKET_RESOLVED,
      payload: { ticket, actor: admin },
    });
    expect(status).toBeNull();
    expect(resolved.message).toMatch(/resolved/);
  });

  it('does not notify when the owner edits their own ticket', async () => {
    const r = await resolveNotification({
      type: EVENT_TYPES.TICKET_UPDATED,
      payload: { ticket, actor: owner, changes: { title: {} } },
    });
    expect(r).toBeNull();
  });
});

describe('activity log messages', () => {
  it('describes status changes', () => {
    const msg = describeEvent({
      type: EVENT_TYPES.STATUS_CHANGED,
      payload: { ticket, actor: admin, from: 'open', to: 'in_progress' },
    });
    expect(msg).toBe('Ravi (admin) changed status of "Printer broken" from open to in progress');
  });

  it('describes updated fields', () => {
    const msg = describeEvent({
      type: EVENT_TYPES.TICKET_UPDATED,
      payload: { ticket, actor: owner, changes: { title: {}, priority: {} } },
    });
    expect(msg).toContain('updated title, priority');
  });
});
