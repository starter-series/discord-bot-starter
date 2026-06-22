const fs = require('fs');
const path = require('path');
const { buildCommandPayloads, getCommandFiles } = require('./deploy-commands');

const root = path.join(__dirname, '..');

function readEnvExampleKeys() {
  const file = path.join(root, '.env.example');
  const text = fs.readFileSync(file, 'utf8');
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.split('=')[0])
  );
}

function validateEnvExample() {
  const keys = readEnvExampleKeys();
  const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
  const missing = required.filter((key) => !keys.has(key));
  if (missing.length > 0) {
    throw new Error(`.env.example is missing required keys: ${missing.join(', ')}`);
  }
}

function validateEvents() {
  const eventsPath = path.join(root, 'src', 'events');
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'))
    .sort();

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (!event.name) {
      throw new Error(`Event ${file} must export a Discord event name`);
    }
    if (typeof event.execute !== 'function') {
      throw new Error(`Event ${file} must export execute()`);
    }
    if (event.once !== undefined && typeof event.once !== 'boolean') {
      throw new Error(`Event ${file} once must be boolean when provided`);
    }
  }

  return eventFiles;
}

function validateCommands() {
  const commands = buildCommandPayloads();
  const commandFiles = getCommandFiles();
  if (commands.length === 0) {
    throw new Error('At least one slash command is required');
  }
  return { commandFiles, commands };
}

function main() {
  validateEnvExample();
  const { commandFiles, commands } = validateCommands();
  const eventFiles = validateEvents();
  console.log(
    `Smoke check passed: ${commands.length} commands (${commandFiles.join(', ')}) and ` +
    `${eventFiles.length} events (${eventFiles.join(', ')}).`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = {
  main,
  readEnvExampleKeys,
  validateCommands,
  validateEnvExample,
  validateEvents,
};
