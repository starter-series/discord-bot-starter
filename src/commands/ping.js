const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    const response = await interaction.reply({
      content: 'Pinging...',
      withResponse: true,
    });
    // withResponse: true normally yields { resource: { message } }, but some
    // edge interaction states return no resource. Guard it so we degrade to a
    // 0ms round-trip reading instead of throwing on `.message` of undefined.
    const sent = response.resource?.message;
    const latency = sent ? sent.createdTimestamp - interaction.createdTimestamp : 0;
    await interaction.editReply(
      `Pong! Latency: ${latency}ms | API: ${interaction.client.ws.ping}ms`
    );
  },
};
