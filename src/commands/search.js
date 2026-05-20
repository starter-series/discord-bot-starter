const { SlashCommandBuilder } = require('discord.js');

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

// A backtick in user input breaks out of the surrounding markdown `code span`,
// letting the rest of the message render as formatted text. Strip backticks
// so the code span stays intact; allowedMentions handles the @-mention side.
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
      // Any @here / @everyone / @role / @user in user input becomes inert text.
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
