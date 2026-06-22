const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadConfig, readConfig } = require('../src/config');

function getCommandFiles(commandsPath = path.join(__dirname, '..', 'src', 'commands')) {
  return fs
    .readdirSync(commandsPath)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'))
    .sort();
}

function buildCommandPayloads(commandsPath = path.join(__dirname, '..', 'src', 'commands')) {
  const commands = [];

  for (const file of getCommandFiles(commandsPath)) {
    const command = require(path.join(commandsPath, file));
    if (!command.data || typeof command.data.toJSON !== 'function') {
      throw new Error(`Command ${file} must export data with toJSON()`);
    }
    commands.push(command.data.toJSON());
  }

  return commands;
}

async function registerCommands(config, commands) {
  const rest = new REST().setToken(config.token);
  if (config.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    return 'guild';
  }

  await rest.put(
    Routes.applicationCommands(config.clientId),
    { body: commands }
  );
  return 'global';
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const dryRun = argv.includes('--dry-run');
  const commands = buildCommandPayloads();

  if (dryRun) {
    const config = readConfig(env);
    const scope = config.guildId ? 'guild' : 'global';
    console.log(`Dry run: validated ${commands.length} slash commands for ${scope} registration.`);
    if (!config.token || !config.clientId) {
      console.log('Set DISCORD_TOKEN and DISCORD_CLIENT_ID before running without --dry-run.');
    }
    return { dryRun: true, commands };
  }

  const config = loadConfig({ env });
  console.log(`Registering ${commands.length} slash commands...`);
  const scope = await registerCommands(config, commands);
  if (scope === 'guild') {
    console.log('Registered guild commands (available instantly).');
  } else {
    console.log('Registered global commands (may take up to 1 hour).');
  }
  return { dryRun: false, scope, commands };
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildCommandPayloads,
  getCommandFiles,
  main,
  registerCommands,
};
