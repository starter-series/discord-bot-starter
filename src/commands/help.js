const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const commands = interaction.client.commands;
    const lines = commands
      .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
      .join('\n');
    // EmbedBuilder.setDescription('') throws (empty strings are rejected by
    // discord.js validation). An empty command Collection — mid-reload, or a
    // loader that registered nothing — would crash /help, so fall back to a
    // sentinel rather than passing the empty join through.
    const embed = new EmbedBuilder()
      .setTitle('Available Commands')
      .setColor(0x5865f2)
      .setDescription(lines || 'No commands registered.');

    // Command descriptions are interpolated into the embed; a malicious or
    // careless description string could carry @here / @everyone / @role / @user.
    // parse: [] makes every mention inert text. (Same guard as search.js.)
    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
