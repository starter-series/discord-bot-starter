const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./commands');
const { loadEvents } = require('./events');
const { createHealthServer } = require('./lib/health');
const config = require('./config');
const log = require('./lib/logger');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

loadCommands(client);
loadEvents(client);

const healthServer = createHealthServer(client);

// Start the health server once the bot is ready so orchestrators (Fly.io,
// Railway, Docker HEALTHCHECK) only get a 200 after the gateway connects.
client.once(Events.ClientReady, () => {
  healthServer.start().catch((err) => {
    log.error('health', 'Failed to start health server', { error: err.message });
  });
});

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('lifecycle', 'Shutting down...', { signal });
  try {
    await healthServer.stop();
  } catch (err) {
    log.error('lifecycle', 'Error closing health server', { error: err.message });
  }
  try {
    await client.destroy();
  } catch (err) {
    log.error('lifecycle', 'Error destroying client', { error: err.message });
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Without these handlers an uncaught error would exit the process silently —
// orchestrators see only "container died," not the stack.
const fatalExit = (kind, err, extra = {}) => {
  log.fatal('lifecycle', kind, {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...extra,
  });
  process.exit(1);
};

process.on('uncaughtException', (err, origin) => fatalExit('uncaughtException', err, { origin }));
process.on('unhandledRejection', (reason) => fatalExit('unhandledRejection', reason));

client.login(config.token).catch((err) => fatalExit('Failed to log in', err));
