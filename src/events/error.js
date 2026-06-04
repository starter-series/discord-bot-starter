const { Events } = require('discord.js');
const logger = require('../lib/logger');
const { errMsg } = require('../lib/err');

module.exports = {
  name: Events.Error,
  execute(error) {
    // discord.js may emit a non-Error payload (string, plain object, null);
    // reading `.message` directly would throw *inside* the error handler and
    // crash the process. errMsg degrades cleanly for any thrown value.
    logger.error('discord', 'Client encountered an error', { error: errMsg(error) });
  },
};
