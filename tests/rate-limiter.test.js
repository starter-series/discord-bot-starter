const { createRateLimiter } = require('../src/lib/rate-limiter');

describe('createRateLimiter', () => {
  test.each([
    [0, 60_000],
    [-1, 60_000],
    [5, 0],
    [5, -100],
    [1.5, 60_000],
    [5, 1000.5],
    ['five', 60_000],
    [5, null],
  ])('throws on invalid args (maxHits=%p, windowMs=%p)', (maxHits, windowMs) => {
    expect(() => createRateLimiter(maxHits, windowMs)).toThrow(
      /must be a positive integer/
    );
  });

  test('allows up to maxHits within the window', () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.check('u1').limited).toBe(false);
    expect(limiter.check('u1').limited).toBe(false);
    expect(limiter.check('u1').limited).toBe(false);
  });

  test('limits the (maxHits+1)th call and reports retryAfterMs > 0', () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.check('u1');
    limiter.check('u1');
    const result = limiter.check('u1');
    expect(result.limited).toBe(true);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  test('isolates per-key budgets', () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check('a').limited).toBe(false);
    expect(limiter.check('a').limited).toBe(true);
    // Different key gets a fresh window even though `a` is limited.
    expect(limiter.check('b').limited).toBe(false);
  });

  test('resets the budget after the window elapses', () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      const limiter = createRateLimiter(1, 1_000);
      expect(limiter.check('u1').limited).toBe(false);
      expect(limiter.check('u1').limited).toBe(true);
      now += 1_001; // step past the window
      expect(limiter.check('u1').limited).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });

  test('cleanup actually removes stale entries (not just check() resetting them)', () => {
    // The previous version of this test passed even when cleanup() was a no-op,
    // because check() already resets entries whose window has elapsed. Asserting
    // store size directly is the only way to observe cleanup's real effect.
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      const limiter = createRateLimiter(5, 1_000);
      limiter.check('u1');
      limiter.check('u2');
      expect(limiter.size()).toBe(2);

      now += 5_000; // way past the window
      limiter.cleanup();
      expect(limiter.size()).toBe(0);
    } finally {
      Date.now = realNow;
    }
  });

  test('cleanup keeps entries still inside the window', () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      const limiter = createRateLimiter(5, 10_000);
      limiter.check('u1');
      limiter.check('u2');

      now += 5_000; // half the window — entries are still live
      limiter.cleanup();
      expect(limiter.size()).toBe(2);
    } finally {
      Date.now = realNow;
    }
  });
});
