const fs = require('fs');
const path = require('path');
const logger = require('../lib/logger');
const { errMsg } = require('../lib/err');

function loadEvents(client) {
  const eventFiles = fs
    .readdirSync(__dirname)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(__dirname, file));
    // Normalize sync- and async-returning handlers and catch rejections here,
    // so one failing event handler is logged instead of escaping to the global
    // unhandledRejection handler (which fatally exits the whole process).
    const run = (...args) =>
      Promise.resolve(event.execute(...args)).catch((err) =>
        logger.error('events', `Handler ${event.name} failed`, { error: errMsg(err) })
      );
    if (event.once) {
      client.once(event.name, run);
    } else {
      client.on(event.name, run);
    }
  }
}

module.exports = { loadEvents };
