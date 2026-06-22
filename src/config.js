require('dotenv').config({ quiet: true });

const REQUIRED_KEYS = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];

function readConfig(env = process.env) {
  return {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.DISCORD_GUILD_ID,
  };
}

function validateConfig(config, requiredKeys = REQUIRED_KEYS) {
  const errors = [];
  const values = {
    DISCORD_TOKEN: config.token,
    DISCORD_CLIENT_ID: config.clientId,
    DISCORD_GUILD_ID: config.guildId,
  };

  for (const key of requiredKeys) {
    if (!values[key] || String(values[key]).trim() === '') {
      errors.push(`Missing ${key}`);
    }
  }

  return errors;
}

function loadConfig(options = {}) {
  const {
    env = process.env,
    requiredKeys = REQUIRED_KEYS,
    exitOnError = true,
  } = options;
  const config = readConfig(env);
  const errors = validateConfig(config, requiredKeys);

  if (errors.length > 0) {
    const message = `${errors.join(', ')}. Copy .env.example to .env and fill in the required values.`;
    if (exitOnError) {
      console.error(message);
      process.exit(1);
    }
    throw new Error(message);
  }

  return config;
}

module.exports = {
  REQUIRED_KEYS,
  readConfig,
  validateConfig,
  loadConfig,
};
