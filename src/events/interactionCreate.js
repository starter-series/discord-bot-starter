const { Events, MessageFlags } = require('discord.js');
const logger = require('../lib/logger');
const { createRateLimiter } = require('../lib/rate-limiter');
const { safeRespond } = require('../lib/safe-interaction');

// Global per-user limiter: 5 invocations per minute across all commands.
// Used when a command does not declare its own `rateLimit` field.
const globalLimiter = createRateLimiter(5, 60_000);
const perCommandLimiters = new Map();

function limiterFor(command) {
  const cfg = command.rateLimit;
  if (!cfg) return globalLimiter;
  const name = command.data.name;
  let limiter = perCommandLimiters.get(name);
  if (!limiter) {
    limiter = createRateLimiter(cfg.max, cfg.window);
    perCommandLimiters.set(name, limiter);
  }
  return limiter;
}

// Periodic cleanup of all limiter stores. unref so the timer never blocks
// process exit (e.g. in Jest).
setInterval(() => {
  globalLimiter.cleanup();
  for (const limiter of perCommandLimiters.values()) limiter.cleanup();
}, 120_000).unref();

// Extract a human message from an unknown thrown value (Error, string, null).
const errMsg = (e) => (e instanceof Error ? e.message : String(e));

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Autocomplete runs before the command is submitted — dispatch separately.
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || typeof command.autocomplete !== 'function') return;
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error('interactionCreate', `Autocomplete failed for ${interaction.commandName}`, { error: errMsg(error) });
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn('interactionCreate', `Unknown command: ${interaction.commandName}`);
      await safeRespond(interaction, {
        content: `Unknown command: \`${interaction.commandName}\`. It may have been removed.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { limited, retryAfterMs } = limiterFor(command).check(interaction.user.id);
    if (limited) {
      logger.warn('interactionCreate', `Rate-limited user ${interaction.user.id} on ${command.data.name}`);
      await safeRespond(interaction, {
        content: `You're sending commands too fast. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('interactionCreate', `Error executing ${interaction.commandName}`, { error: errMsg(error) });
      await safeRespond(interaction, {
        content: 'Something went wrong.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
