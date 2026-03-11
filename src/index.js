const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./commands');
const { loadEvents } = require('./events');
const config = require('./config');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

loadCommands(client);
loadEvents(client);

client.login(config.token);
