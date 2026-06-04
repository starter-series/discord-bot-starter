const { DiscordAPIError } = require('discord.js');
const { safeRespond } = require('../src/lib/safe-interaction');
const logger = require('../src/lib/logger');

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
  let warnSpy;
  let errorSpy;
  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  test('Discord 429 is classified as rate-limit: logged at WARN, not ERROR', async () => {
    // discord.js throws RateLimitError in some REST paths and DiscordAPIError
    // with code 429 in others. Both take the rate-limit branch → warn log.
    const err = new DiscordAPIError({ code: 429, message: 'Rate limit' }, 429, 429, 'POST', 'url', {});
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
    // The discriminator: a *real* Discord rate-limit is expected/transient, so
    // it goes to warn. If this regresses to the generic error branch, the
    // toHaveBeenCalled assertions below flip.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][1]).toMatch(/rate-limited by Discord/);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('unrelated error with code 429 is NOT treated as a rate-limit: logged at ERROR, not WARN', async () => {
    // The previous bare `error?.code === 429` check swallowed this into the
    // rate-limit (warn) branch and hid a real upstream bug. The fix narrows
    // the rate-limit branch to Discord-specific shapes, so a stray middleware
    // error with code 429 must fall through to the generic ERROR branch.
    //
    // This assertion is non-tautological: it distinguishes the error branch
    // (logger.error, the bug-surfacing path) from the rate-limit branch
    // (logger.warn, the silent-drop path). If the narrowing regresses, this
    // error lands in warn and the test fails — even though both branches
    // return null.
    const err = Object.assign(new Error('upstream proxy 429'), { code: 429 });
    const i = fakeInteraction({ reply: jest.fn().mockRejectedValue(err) });
    const r = await safeRespond(i, { content: 'hi' });
    expect(r).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][1]).toMatch(/Reply failed/);
    // Crucially: it must NOT have gone down the rate-limit warn path.
    expect(warnSpy).not.toHaveBeenCalled();
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
