const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const commands = interaction.client.commands;
    const embed = new EmbedBuilder()
      .setTitle('Available Commands')
      .setColor(0x5865f2)
      .setDescription(
        commands
          .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
          .join('\n')
      );

    await interaction.reply({ embeds: [embed] });
  },
};
