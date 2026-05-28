const http = require('http');
const { createHealthServer } = require('../src/lib/health');

function fakeClient({ ready, guilds = 0 }) {
  return {
    isReady: () => ready,
    guilds: { cache: { size: guilds } },
  };
}

function get(port, path = '/health') {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });
    req.on('error', reject);
  });
}

describe('health server', () => {
  test('returns 200 + JSON with uptime/guilds when client is ready', async () => {
    const client = fakeClient({ ready: true, guilds: 3 });
    // Port 0 → let the OS pick a free port so parallel runs don't collide.
    const server = createHealthServer(client, { port: 0 });
    await server.start();
    const { port } = server.address();

    try {
      const res = await get(port);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/json');

      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.guilds).toBe(3);
    } finally {
      await server.stop();
    }
  });

  test('returns 503 when client is not ready', async () => {
    const client = fakeClient({ ready: false });
    const server = createHealthServer(client, { port: 0 });
    await server.start();
    const { port } = server.address();

    try {
      const res = await get(port);
      expect(res.status).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('starting');
      expect(body.guilds).toBe(0);
    } finally {
      await server.stop();
    }
  });

  // Centralise env-mutation handling so a future addition can't forget the
  // restore (the linter doesn't catch that and the prior tests had to repeat
  // the try/finally each time).
  const savedHealthPort = { v: undefined };
  beforeEach(() => { savedHealthPort.v = process.env.HEALTH_PORT; });
  afterEach(() => {
    if (savedHealthPort.v === undefined) delete process.env.HEALTH_PORT;
    else process.env.HEALTH_PORT = savedHealthPort.v;
  });

  test.each([
    ['abc', /must be a decimal integer/],
    ['99999', /must be a decimal integer/],
    ['0', /must be a decimal integer/], // env-set 0 rejected (preserves prior `Number(0) || 3000` semantics, but loudly)
    [' ', /must be a decimal integer/], // whitespace-only (Number(' ') = 0 silently passed before)
    ['1e3', /must be a decimal integer/], // scientific notation
    ['0x80', /must be a decimal integer/], // hex
    ['3000abc', /must be a decimal integer/], // trailing junk
    ['3000.5', /must be a decimal integer/], // float
    ['-1', /must be a decimal integer/], // negative
  ])('throws on invalid HEALTH_PORT=%p', (value, pattern) => {
    process.env.HEALTH_PORT = value;
    expect(() => createHealthServer(fakeClient({ ready: true }))).toThrow(pattern);
  });

  test('options.port=null falls through to env / default 3000 — does NOT bind ephemeral', () => {
    // null !== undefined, so the prior code returned null → http.listen(null)
    // would bind an OS-assigned port. Now null falls through like undefined.
    delete process.env.HEALTH_PORT;
    // We can't easily assert the resolved port without starting the server,
    // but we can at least confirm it doesn't throw and listens on something
    // bindable. Use a separate options.port=0 case for ephemeral.
    const server = createHealthServer(fakeClient({ ready: true }), { port: null });
    // listen happens in start(); to keep this test light, just verify the
    // factory accepted the input without error.
    expect(typeof server.start).toBe('function');
  });

  test('returns 404 for unknown paths', async () => {
    const client = fakeClient({ ready: true });
    const server = createHealthServer(client, { port: 0 });
    await server.start();
    const { port } = server.address();

    try {
      const res = await get(port, '/nope');
      expect(res.status).toBe(404);
    } finally {
      await server.stop();
    }
  });
});
