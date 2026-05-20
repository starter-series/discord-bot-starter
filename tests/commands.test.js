const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

const commandsPath = path.join(__dirname, '..', 'src', 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'));

describe('Command modules', () => {
  test('at least one command exists', () => {
    expect(commandFiles.length).toBeGreaterThan(0);
  });

  test.each(commandFiles)('%s exports a valid Discord.js command', (file) => {
    const command = require(path.join(commandsPath, file));

    // Structural contract
    expect(command).toHaveProperty('data');
    expect(command).toHaveProperty('execute');
    expect(typeof command.execute).toBe('function');

    // Must be a real SlashCommandBuilder — catches hand-rolled objects that
    // won't serialize cleanly for Discord's REST API.
    expect(command.data).toBeInstanceOf(SlashCommandBuilder);

    // .toJSON() is what `deploy-commands.js` sends to Discord; if it throws,
    // registration will fail in prod. Run it to catch schema errors early.
    const json = command.data.toJSON();
    expect(json.name).toMatch(/^[a-z0-9_-]{1,32}$/);
    expect(json.description).toBeTruthy();
    expect(json.description.length).toBeLessThanOrEqual(100);
  });
});

describe('/ping command', () => {
  const ping = require(path.join(commandsPath, 'ping.js'));

  test('replies with latency and edits with pong', async () => {
    const sentMessage = { createdTimestamp: 1_000_050 };
    const interaction = {
      createdTimestamp: 1_000_000,
      client: { ws: { ping: 42 } },
      reply: jest.fn().mockResolvedValue({ resource: { message: sentMessage } }),
      editReply: jest.fn().mockResolvedValue(undefined),
    };

    await ping.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Pinging...',
      withResponse: true,
    });
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    const reply = interaction.editReply.mock.calls[0][0];
    expect(reply).toContain('Pong!');
    expect(reply).toContain('50ms');
    expect(reply).toContain('API: 42ms');
  });
});

describe('/search command', () => {
  const search = require(path.join(commandsPath, 'search.js'));

  test('execute replies with the selected query, mentions disabled', async () => {
    const interaction = {
      options: { getString: jest.fn().mockReturnValue('docker') },
      reply: jest.fn().mockResolvedValue(undefined),
    };

    await search.execute(interaction);

    expect(interaction.options.getString).toHaveBeenCalledWith('query');
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'You picked: `docker`',
        allowedMentions: { parse: [] },
      })
    );
  });

  test('execute strips backticks from user input to keep code span intact', async () => {
    const interaction = {
      options: { getString: jest.fn().mockReturnValue('evil`@everyone`payload') },
      reply: jest.fn().mockResolvedValue(undefined),
    };

    await search.execute(interaction);

    const payload = interaction.reply.mock.calls[0][0];
    expect(payload.content).toBe('You picked: `evil@everyonepayload`');
    expect(payload.allowedMentions).toEqual({ parse: [] });
  });

  test('autocomplete returns filtered, capped suggestions', async () => {
    const interaction = {
      options: { getFocused: jest.fn().mockReturnValue('re') },
      respond: jest.fn().mockResolvedValue(undefined),
    };

    await search.autocomplete(interaction);

    expect(interaction.respond).toHaveBeenCalledTimes(1);
    const choices = interaction.respond.mock.calls[0][0];
    expect(Array.isArray(choices)).toBe(true);
    expect(choices.length).toBeLessThanOrEqual(25);
    // "re" matches "elasticsearch" and "redis" in the built-in list.
    const values = choices.map((c) => c.value);
    expect(values).toContain('redis');
    for (const choice of choices) {
      expect(choice).toHaveProperty('name');
      expect(choice).toHaveProperty('value');
    }
  });
});

describe('Event modules', () => {
  const eventsPath = path.join(__dirname, '..', 'src', 'events');
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'));

  test('at least one event exists', () => {
    expect(eventFiles.length).toBeGreaterThan(0);
  });

  test.each(eventFiles)('%s exports name and execute', (file) => {
    const event = require(path.join(eventsPath, file));
    expect(event).toHaveProperty('name');
    expect(event).toHaveProperty('execute');
    expect(typeof event.execute).toBe('function');
    expect(typeof event.name).toBe('string');
    expect(event.name.length).toBeGreaterThan(0);
  });
});
