const fs = require('node:fs');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const level = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

function format(severity, context, message, extra) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level: severity,
    ctx: context,
    msg: message,
    ...(extra && { extra }),
  });
}

function log(severity, context, message, extra) {
  if (LEVELS[severity] < level) return;
  const out = format(severity, context, message, extra);
  severity === "error" ? console.error(out) : console.log(out);
}

module.exports = {
  debug: (ctx, msg, extra) => log("debug", ctx, msg, extra),
  info: (ctx, msg, extra) => log("info", ctx, msg, extra),
  warn: (ctx, msg, extra) => log("warn", ctx, msg, extra),
  error: (ctx, msg, extra) => log("error", ctx, msg, extra),
  // fatal() bypasses the buffered console and writes synchronously to fd 2.
  // Use it from crash handlers right before process.exit() so the line isn't
  // dropped when stderr is a pipe (the default in container orchestrators).
  fatal: (ctx, msg, extra) => {
    fs.writeSync(2, format("error", ctx, msg, extra) + "\n");
  },
};
