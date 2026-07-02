const http = require('http');
const log = require('./logger');
const { errMsg } = require('./err');

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
  // Code-supplied port wins, but explicit null falls through to env/default
  // — `null` from a JSON loader's missing field should not silently bind
  // an ephemeral port via http.listen(null).
  if (options.port !== undefined && options.port !== null) return options.port;
  const raw = process.env.HEALTH_PORT;
  if (raw === undefined || raw === '') return 3000;
  // Strict decimal-integer match — rejects whitespace (' '), scientific
  // notation ('1e3'), hex ('0x80'), and trailing-junk ('3000abc'). The
  // previous `Number(raw) || 3000` silently coerced bad input to NaN→0→3000;
  // the post-PR-#38 `Number.isInteger(Number(raw))` still accepted those
  // surprising forms because Number() is lenient.
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid HEALTH_PORT="${raw}" — must be a decimal integer in [1, 65535]`);
  }
  const parsed = Number(raw);
  // 0 from env is rejected: the previous `Number('0') || 3000` mapped it to
  // 3000 because 0 is falsy. Preserve that behavior loudly (throw) rather
  // than silently binding an ephemeral port — operators almost never want
  // OS-assigned ports for a healthcheck. Tests still use options.port=0.
  if (parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid HEALTH_PORT="${raw}" — must be a decimal integer in [1, 65535]`);
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
    // Bind-time failures (EADDRINUSE/EACCES) are surfaced by start()'s
    // rejection below; only log here once the server is actually listening so
    // this handler covers post-startup runtime errors without double-logging.
    if (server.listening) {
      log.error('health', 'Health server error', { error: errMsg(err) });
    }
  });

  function start() {
    return new Promise((resolve, reject) => {
      const onError = (err) => {
        server.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.removeListener('error', onError);
        log.info('health', `Health server listening on :${port}`);
        resolve(server);
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port);
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
