require('dotenv').config();

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and fill in your token.');
  process.exit(1);
}

if (!process.env.DISCORD_CLIENT_ID) {
  console.error('Missing DISCORD_CLIENT_ID. Find it at https://discord.com/developers/applications');
  process.exit(1);
}

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
};
