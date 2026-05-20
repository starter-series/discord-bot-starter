const { SlashCommandBuilder, MessageFlags } = require('discord.js');

// Static list — replace with a DB query, API call, or cached list in your bot.
const CHOICES = [
  'apple',
  'banana',
  'cherry',
  'docker',
  'elasticsearch',
  'grafana',
  'kubernetes',
  'postgres',
  'redis',
  'typescript',
];

// User-supplied strings interpolated into Discord markdown can break out of
// `code spans` by including their own backticks (or use @ / # to ping channels
// and users). The safe default is to (a) strip backticks before quoting, and
// (b) suppress mention parsing on the response.
function safeQuote(input) {
  return String(input).replaceAll('`', '');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search a list with autocomplete')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Start typing to see suggestions')
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query');
    await interaction.reply({
      content: `You picked: \`${safeQuote(query)}\``,
      // SuppressNotifications keeps the reply silent; allowedMentions: parse: []
      // makes any @here / @everyone / @role / @user in user input inert.
      flags: MessageFlags.SuppressNotifications,
      allowedMentions: { parse: [] },
    });
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const matches = CHOICES.filter((choice) => choice.toLowerCase().includes(focused))
      // Discord caps autocomplete responses at 25 choices.
      .slice(0, 25)
      .map((choice) => ({ name: choice, value: choice }));

    await interaction.respond(matches);
  },
};
