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
    // edge interaction states return no resource. When absent we can't compute
    // a round-trip, so render 'n/a' rather than a misleading '0ms'.
    const sent = response.resource?.message;
    const latency = sent
      ? `${sent.createdTimestamp - interaction.createdTimestamp}ms`
      : 'n/a';
    // ws.ping is -1 until the first heartbeat ack arrives (e.g. right after
    // login). '-1ms' is a sentinel, not a real reading — surface it as 'n/a'.
    const wsPing = interaction.client.ws.ping;
    const apiLatency = wsPing >= 0 ? `${wsPing}ms` : 'n/a';
    await interaction.editReply(
      `Pong! Latency: ${latency} | API: ${apiLatency}`
    );
  },
};
