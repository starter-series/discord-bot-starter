const fs = require('fs');
const path = require('path');

function loadEvents(client) {
  const eventFiles = fs
    .readdirSync(__dirname)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(__dirname, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

module.exports = { loadEvents };
