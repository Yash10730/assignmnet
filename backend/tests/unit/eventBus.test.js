const { EventEmitter } = require('events');

// Fresh instance per test (the module exports a singleton)
function newBus() {
  jest.resetModules();
  return require('../../src/events/eventBus');
}

describe('EventBus', () => {
  it('delivers events to type subscribers and wildcard subscribers', async () => {
    const bus = newBus();
    const typed = jest.fn();
    const wildcard = jest.fn();
    bus.subscribe('ticket.created', 'typed', typed);
    bus.subscribe('*', 'wild', wildcard);

    bus.publish('ticket.created', { a: 1 });
    bus.publish('comment.added', { b: 2 });
    await bus.drain();

    expect(typed).toHaveBeenCalledTimes(1);
    expect(typed.mock.calls[0][0]).toMatchObject({ type: 'ticket.created', payload: { a: 1 } });
    expect(wildcard).toHaveBeenCalledTimes(2);
  });

  it('isolates failing handlers so other handlers still run', async () => {
    const bus = newBus();
    const ok = jest.fn();
    bus.subscribe('x', 'boom', () => {
      throw new Error('boom');
    });
    bus.subscribe('x', 'ok', ok);

    expect(() => bus.publish('x', {})).not.toThrow();
    await bus.drain();
    expect(ok).toHaveBeenCalled();
  });

  it('runs handlers asynchronously (does not block the publisher)', async () => {
    const bus = newBus();
    const order = [];
    bus.subscribe('x', 'h', () => order.push('handler'));
    bus.publish('x', {});
    order.push('after-publish');
    await bus.drain();
    expect(order).toEqual(['after-publish', 'handler']);
  });

  it('drain waits for async handlers', async () => {
    const bus = newBus();
    let done = false;
    bus.subscribe('x', 'slow', () => new Promise((r) => setTimeout(() => { done = true; r(); }, 20)));
    bus.publish('x', {});
    await bus.drain();
    expect(done).toBe(true);
  });

  it('supports unsubscribe', async () => {
    const bus = newBus();
    const fn = jest.fn();
    const off = bus.subscribe('x', 'h', fn);
    off();
    bus.publish('x', {});
    await bus.drain();
    expect(fn).not.toHaveBeenCalled();
  });

  it('is not a raw EventEmitter (errors cannot crash the process)', () => {
    expect(newBus()).not.toBeInstanceOf(EventEmitter);
  });
});
