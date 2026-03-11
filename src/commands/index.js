const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  const commandFiles = fs
    .readdirSync(__dirname)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(__dirname, file));
    client.commands.set(command.data.name, command);
  }
}

module.exports = { loadCommands };
