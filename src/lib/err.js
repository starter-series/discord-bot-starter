/**
 * Shared error-extraction helpers.
 *
 * Catch handlers receive `unknown` — the thrown value may be an Error, a
 * string, a plain object, or null/undefined. Reading `.message` directly
 * silently loses information for non-Error throws; these helpers degrade
 * cleanly.
 */

function errMsg(e) {
  if (e instanceof Error) return e.message;
  if (e === null || e === undefined) return String(e);
  if (typeof e === 'object') {
    // Plain objects (REST error payloads, rejected promises with structured
    // data) — JSON.stringify preserves the shape; fall back to String() on
    // circular references.
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

function errStack(e) {
  return e instanceof Error ? e.stack : undefined;
}

module.exports = { errMsg, errStack };
