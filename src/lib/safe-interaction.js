const { DiscordAPIError } = require('discord.js');
const logger = require('./logger');

// Discord interaction tokens expire 15 minutes after creation, but the
// initial response window is only 3 seconds. A reply attempt after the
// window has closed surfaces as `DiscordAPIError` with a 10062
// "Unknown interaction" or 40060 "Already acknowledged" code.
const TRANSIENT_API_CODES = new Set([
  10062, // Unknown interaction
  40060, // Interaction has already been acknowledged
]);

// instanceof DiscordAPIError fails across realm boundaries (two copies of
// discord.js in the dep tree from hoisting failure or peerDep mismatch).
// Match by class name as a fallback so cross-realm errors are still
// classified correctly. Same rationale for RateLimitError below.
const isDiscordAPIError = (e) => e instanceof DiscordAPIError || e?.name === 'DiscordAPIError';
const isRateLimitError = (e) => e?.name === 'RateLimitError';

/**
 * Reply to an interaction, choosing reply vs. followUp based on whether
 * the interaction has already been answered. Swallows transient API errors
 * (token expired, already acknowledged, rate-limited) so a failed UX reply
 * never crashes the worker.
 *
 * The discord.js REST manager already retries 429 internally with
 * Retry-After honoured. By the time a 429 reaches us it's a hard limit;
 * we log and drop.
 */
async function safeRespond(interaction, payload) {
  try {
    // After deferReply() the interaction is `deferred=true, replied=false`.
    // The correct method to fill the deferred placeholder is editReply —
    // calling followUp would create a *second* message and leave the
    // "Bot is thinking…" placeholder dangling forever. After the first
    // reply (or first followUp), `replied=true` and we use followUp.
    if (interaction.deferred && !interaction.replied) {
      return await interaction.editReply(payload);
    }
    if (interaction.replied) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch (error) {
    if (isDiscordAPIError(error) && TRANSIENT_API_CODES.has(error.code)) {
      logger.warn('safe-interaction', 'transient API error, dropping reply', {
        code: error.code,
        message: error.message,
      });
      return null;
    }
    // Narrow to Discord-specific shapes — a stray middleware error with
    // code === 429 unrelated to Discord rate limiting was being silently
    // swallowed before this guard (caught in /code-review 2026-05-21).
    if (isRateLimitError(error) || (isDiscordAPIError(error) && error.code === 429)) {
      logger.warn('safe-interaction', 'rate-limited by Discord, dropping reply', {
        retryAfter: error.retryAfter ?? error.timeToReset ?? null,
      });
      return null;
    }
    logger.error('safe-interaction', 'Reply failed', {
      error: error?.message ?? String(error),
    });
    return null;
  }
}

module.exports = { safeRespond };
