const http = require('http');
const log = require('./logger');

/**
 * Create a minimal health-check HTTP server.
 *
 * GET /health:
 *   - 200 OK + JSON { status, uptime, guilds } when the Discord client is ready.
 *   - 503 Service Unavailable when the client is not yet ready or disconnected.
 *
 * Any other path returns 404.
 *
 * The server uses Node's built-in `http` module — no extra dependencies.
 *
 * @param {import('discord.js').Client} client
 * @param {{ port?: number }} [options]
 * @returns {import('http').Server}
 */
function resolvePort(options) {
  if (options.port !== undefined) return options.port; // tests pass 0 for ephemeral
  const raw = process.env.HEALTH_PORT;
  if (raw === undefined || raw === '') return 3000;
  const parsed = Number(raw);
  // A typo like HEALTH_PORT=abc previously fell back to 3000 silently;
  // surface it so the operator finds out at startup, not from a wedged probe.
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid HEALTH_PORT="${raw}" — must be an integer in [0, 65535]`);
  }
  return parsed;
}

function createHealthServer(client, options = {}) {
  const port = resolvePort(options);

  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/health') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    const ready = client.isReady?.() ?? false;
    const status = ready ? 200 : 503;
    const body = {
      status: ready ? 'ok' : 'starting',
      uptime: process.uptime(),
      guilds: ready ? client.guilds.cache.size : 0,
    };

    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });

  server.on('error', (err) => {
    log.error('health', 'Health server error', { error: err.message });
  });

  function start() {
    return new Promise((resolve) => {
      server.listen(port, () => {
        log.info('health', `Health server listening on :${port}`);
        resolve(server);
      });
    });
  }

  function stop() {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  server.start = start;
  server.stop = stop;
  return server;
}

module.exports = { createHealthServer };
