const { Events, MessageFlags } = require('discord.js');
const logger = require('../lib/logger');
const { createRateLimiter } = require('../lib/rate-limiter');
const { safeRespond } = require('../lib/safe-interaction');
const { errMsg } = require('../lib/err');

// Global per-user limiter: 5 invocations per minute across all commands.
// Used when a command does not declare its own `rateLimit` field.
const globalLimiter = createRateLimiter(5, 60_000);
// Bounded today by the static src/commands/ directory. If a future plugin
// loader registers commands dynamically, add an upper-bound assertion here
// — Map has no eviction by design.
const perCommandLimiters = new Map();
// Command names whose rateLimit we've already rejected, so a bad config logs
// exactly once instead of on every interaction (log-flood on a hot command).
const warnedBadConfig = new Set();

// A well-formed override is `{ window: positive int ms, max: positive int }`.
// Partial { max } or {} previously silently fell back to createRateLimiter's
// parameter defaults (5, 60_000), so the user's attempt to override looked
// active but matched the global — a stricter check rejects those.
function isValidRateLimit(cfg) {
  return (
    typeof cfg === 'object' && cfg !== null &&
    Number.isInteger(cfg.max) && cfg.max >= 1 &&
    Number.isInteger(cfg.window) && cfg.window >= 1
  );
}

// Resolve the limiter for a command WITHOUT throwing. A command that declares
// no rateLimit uses the global limiter; one with a malformed rateLimit is
// logged once and degrades to the global limiter rather than crashing the
// dispatcher (a throw here escapes the per-command try/catch below and bubbles
// to an unhandledRejection → process exit).
function limiterFor(command) {
  const cfg = command.rateLimit;
  if (cfg === undefined || cfg === null) return globalLimiter;
  const name = command.data?.name ?? '<unnamed>';
  if (!isValidRateLimit(cfg)) {
    if (!warnedBadConfig.has(name)) {
      warnedBadConfig.add(name);
      logger.error('interactionCreate',
        `Command "${name}" has invalid rateLimit ${JSON.stringify(cfg)} ` +
        `— must be { window: positive integer ms, max: positive integer }. ` +
        `Falling back to the global limit.`);
    }
    return globalLimiter;
  }
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

    // limiterFor + check() and execute() share one try/catch: any throw here
    // (a malformed config slipped past validation, an exotic limiter store
    // error, or a command body that rejects) must surface as a graceful
    // ephemeral reply — never an unhandledRejection that exits the process.
    try {
      const { limited, retryAfterMs } = limiterFor(command).check(interaction.user.id);
      if (limited) {
        logger.warn('interactionCreate', `Rate-limited user ${interaction.user.id} on ${command.data.name}`);
        await safeRespond(interaction, {
          content: `You're sending commands too fast. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

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
