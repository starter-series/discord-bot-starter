const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./commands');
const { loadEvents } = require('./events');
const { createHealthServer } = require('./lib/health');
const { loadConfig } = require('./config');
const log = require('./lib/logger');
const { errMsg, errStack } = require('./lib/err');

// fatalExit + handlers must be registered BEFORE any code that can throw
// during module evaluation (loadCommands, loadEvents, createHealthServer).
// Otherwise a startup throw exits with a raw V8 stack and the operator
// loses the structured 'lifecycle' log line the rest of this file promises.
const fatalExit = (kind, err, extra = {}) => {
  log.fatal('lifecycle', kind, { error: errMsg(err), stack: errStack(err), ...extra });
  process.exit(1);
};

process.on('uncaughtException', (err, origin) => fatalExit('uncaughtException', err, { origin }));
process.on('unhandledRejection', (reason) => fatalExit('unhandledRejection', reason));

const config = loadConfig();

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
  healthServer.start().catch((err) => fatalExit('Failed to start health server', err));
});

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('lifecycle', 'Shutting down...', { signal });
  try {
    await healthServer.stop();
  } catch (err) {
    log.error('lifecycle', 'Error closing health server', { error: errMsg(err) });
  }
  try {
    await client.destroy();
  } catch (err) {
    log.error('lifecycle', 'Error destroying client', { error: errMsg(err) });
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(config.token).catch((err) => fatalExit('Failed to log in', err));
