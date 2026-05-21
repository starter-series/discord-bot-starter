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

  test('throws on invalid HEALTH_PORT — silent fallback was hiding operator typos', () => {
    const client = fakeClient({ ready: true });
    const prev = process.env.HEALTH_PORT;
    process.env.HEALTH_PORT = 'abc';
    try {
      expect(() => createHealthServer(client)).toThrow(/Invalid HEALTH_PORT/);
    } finally {
      if (prev === undefined) delete process.env.HEALTH_PORT;
      else process.env.HEALTH_PORT = prev;
    }
  });

  test('throws on out-of-range HEALTH_PORT', () => {
    const client = fakeClient({ ready: true });
    const prev = process.env.HEALTH_PORT;
    process.env.HEALTH_PORT = '99999';
    try {
      expect(() => createHealthServer(client)).toThrow(/Invalid HEALTH_PORT/);
    } finally {
      if (prev === undefined) delete process.env.HEALTH_PORT;
      else process.env.HEALTH_PORT = prev;
    }
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
