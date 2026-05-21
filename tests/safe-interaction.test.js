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
    expect(i.reply).toHaveBeenCalled();
    expect(i.editReply).not.toHaveBeenCalled();
    expect(i.followUp).not.toHaveBeenCalled();
    expect(r).toBe('reply-result');
  });

  test('uses editReply for deferred-but-not-replied (was the bug — used to followUp)', async () => {
    const i = fakeInteraction({ deferred: true, replied: false });
    const r = await safeRespond(i, { content: 'hi' });
    expect(i.editReply).toHaveBeenCalled();
    expect(i.followUp).not.toHaveBeenCalled();
    expect(r).toBe('editReply-result');
  });

  test('uses followUp once interaction is replied', async () => {
    const i = fakeInteraction({ replied: true });
    const r = await safeRespond(i, { content: 'hi' });
    expect(i.followUp).toHaveBeenCalled();
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

  test('swallows rate-limit error identified by code === 429 alone', async () => {
    // The dispatcher's other branch: a plain Error with .code = 429 and no
    // RateLimitError name. discord.js can throw both shapes depending on
    // where in the REST stack the limit is hit.
    const err = Object.assign(new Error('429'), { code: 429, timeToReset: 2.0 });
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
  });

  test('after deferReply + editReply, a second response routes through followUp', async () => {
    // {deferred:true, replied:true} is reached when a slow command defers,
    // sends the deferred reply (which flips replied:true), then needs to
    // send a follow-up message. The first if-branch (deferred && !replied)
    // is false, so the second if-branch (replied) takes over and calls followUp.
    const i = fakeInteraction({ deferred: true, replied: true });
    const r = await safeRespond(i, { content: 'second message' });
    expect(i.followUp).toHaveBeenCalled();
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
