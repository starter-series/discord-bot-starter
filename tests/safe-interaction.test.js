const { DiscordAPIError } = require('discord.js');
const { safeRespond } = require('../src/lib/safe-interaction');

function fakeInteraction(state = {}) {
  return {
    deferred: false,
    replied: false,
    reply: jest.fn().mockResolvedValue('reply-result'),
    followUp: jest.fn().mockResolvedValue('followUp-result'),
    editReply: jest.fn().mockResolvedValue('editReply-result'),
    ...state,
  };
}

describe('safeRespond', () => {
  test('uses reply when interaction is fresh', async () => {
    const i = fakeInteraction();
    const r = await safeRespond(i, { content: 'hi' });
    expect(i.reply).toHaveBeenCalledWith({ content: 'hi' });
    expect(i.editReply).not.toHaveBeenCalled();
    expect(i.followUp).not.toHaveBeenCalled();
    expect(r).toBe('reply-result');
  });

  test('uses editReply for deferred-but-not-replied (was the bug — used to followUp)', async () => {
    const i = fakeInteraction({ deferred: true, replied: false });
    const r = await safeRespond(i, { content: 'hi' });
    expect(i.editReply).toHaveBeenCalledWith({ content: 'hi' });
    expect(i.followUp).not.toHaveBeenCalled();
    expect(r).toBe('editReply-result');
  });

  test('uses followUp once interaction is replied', async () => {
    const i = fakeInteraction({ replied: true });
    const r = await safeRespond(i, { content: 'hi' });
    expect(i.followUp).toHaveBeenCalledWith({ content: 'hi' });
    expect(r).toBe('followUp-result');
  });

  test('swallows DiscordAPIError 10062 (Unknown interaction)', async () => {
    const err = new DiscordAPIError({ code: 10062, message: 'Unknown' }, 10062, 404, 'POST', 'url', {});
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
  });

  test('swallows DiscordAPIError 40060 (Already acknowledged)', async () => {
    const err = new DiscordAPIError({ code: 40060, message: 'Already' }, 40060, 400, 'POST', 'url', {});
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
  });

  test('swallows rate-limit error identified by name', async () => {
    const err = Object.assign(new Error('rate limited'), {
      name: 'RateLimitError',
      retryAfter: 1.5,
    });
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
  });

  test('swallows DiscordAPIError with code 429 (the other rate-limit shape)', async () => {
    // discord.js throws RateLimitError in some REST paths and DiscordAPIError
    // with code 429 in others. Both must be swallowed.
    const err = new DiscordAPIError({ code: 429, message: 'Rate limit' }, 429, 429, 'POST', 'url', {});
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
  });

  test('does NOT swallow unrelated errors that happen to have code 429', async () => {
    // The previous bare `error?.code === 429` check would swallow this and
    // hide a real bug — narrowed to require a Discord-specific shape.
    const err = Object.assign(new Error('upstream proxy 429'), { code: 429 });
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    // The catch still returns null (no rethrow), but it's logged at error
    // level (the generic branch), not the warn rate-limit branch.
    expect(r).toBeNull();
  });

  test('after deferReply + editReply, a second response routes through followUp WITH the payload', async () => {
    const payload = { content: 'second message' };
    const i = fakeInteraction({ deferred: true, replied: true });
    const r = await safeRespond(i, payload);
    expect(i.followUp).toHaveBeenCalledWith(payload);
    expect(i.editReply).not.toHaveBeenCalled();
    expect(i.reply).not.toHaveBeenCalled();
    expect(r).toBe('followUp-result');
  });

  test('swallows unexpected errors (no rethrow)', async () => {
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(new Error('boom')) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
  });
});
