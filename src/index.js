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

// Without these handlers, an uncaught error or unhandled promise rejection
// would exit the process silently — orchestrators see only "container died,"
// not the stack. Log the structured entry first, then let the default Node
// behavior kill the process so Railway/Fly.io restarts the container.
process.on('uncaughtException', (err, origin) => {
  log.error('lifecycle', 'uncaughtException', {
    error: err?.message ?? String(err),
    stack: err?.stack,
    origin,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('lifecycle', 'unhandledRejection', {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

client.login(config.token).catch((err) => {
  log.error('lifecycle', 'Failed to log in', { error: err.message });
  process.exit(1);
});
