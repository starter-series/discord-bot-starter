const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

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

  const makeSearchInteraction = (query) => ({
    options: { getString: jest.fn().mockReturnValue(query) },
    reply: jest.fn().mockResolvedValue(undefined),
  });

  test('execute replies with the selected query, mentions disabled', async () => {
    const interaction = makeSearchInteraction('docker');

    await search.execute(interaction);

    expect(interaction.options.getString).toHaveBeenCalledWith('query');
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You picked: `docker`',
      allowedMentions: { parse: [] },
    });
  });

  test('execute strips backticks from user input to keep code span intact', async () => {
    const interaction = makeSearchInteraction('evil`@everyone`payload');

    await search.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You picked: `evil@everyonepayload`',
      allowedMentions: { parse: [] },
    });
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

describe('interactionCreate dispatcher rate-limit contract', () => {
  // Verifies the per-command rate-limit contract documented in README:
  // "commands override the global limit by exporting rateLimit: { window, max }".
  // Without this test, the README claim was fictional — the previous dispatcher
  // hardcoded the global limit and ignored the field.
  const interactionCreate = require(path.join(__dirname, '..', 'src', 'events', 'interactionCreate.js'));

  function makeCommand(name, rateLimit) {
    return {
      data: { name },
      execute: jest.fn().mockResolvedValue(undefined),
      ...(rateLimit && { rateLimit }),
    };
  }

  function makeInteraction(userId, commandName, client) {
    return {
      user: { id: userId },
      commandName,
      isAutocomplete: () => false,
      isChatInputCommand: () => true,
      client,
      deferred: false,
      replied: false,
      reply: jest.fn().mockResolvedValue(undefined),
      followUp: jest.fn(),
      editReply: jest.fn(),
    };
  }

  // The dispatcher is a singleton — limiter state leaks between tests within
  // the same process. We use unique user IDs per test to dodge cross-contamination.
  test('rate-limit field on a command overrides the global limit, reply is ephemeral', async () => {
    const command = makeCommand('tight-cmd', { window: 60_000, max: 2 });
    const client = { commands: { get: () => command } };

    const interactions = Array.from({ length: 3 }, () =>
      makeInteraction('audit-user-tight', 'tight-cmd', client)
    );

    for (const i of interactions) await interactionCreate.execute(i);

    expect(command.execute).toHaveBeenCalledTimes(2);
    const payload = interactions[2].reply.mock.calls[0][0];
    expect(payload.content).toMatch(/too fast/);
    // Ephemeral flag must be on — otherwise spammers' "too fast" notices
    // become public channel posts.
    expect(payload.flags).toBe(MessageFlags.Ephemeral);
  });

  test('command without rate-limit field falls back to the global 5/min limit, reply is ephemeral', async () => {
    const command = makeCommand('loose-cmd');
    const client = { commands: { get: () => command } };

    const interactions = Array.from({ length: 6 }, () =>
      makeInteraction('audit-user-loose', 'loose-cmd', client)
    );

    for (const i of interactions) await interactionCreate.execute(i);

    expect(command.execute).toHaveBeenCalledTimes(5);
    const payload = interactions[5].reply.mock.calls[0][0];
    expect(payload.content).toMatch(/too fast/);
    expect(payload.flags).toBe(MessageFlags.Ephemeral);
  });

  test('unknown command name → user-facing ephemeral error reply, no execute call', async () => {
    const client = { commands: { get: () => undefined } };
    const interaction = makeInteraction('audit-user-unknown', 'ghost-cmd', client);

    await interactionCreate.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const payload = interaction.reply.mock.calls[0][0];
    expect(payload.content).toMatch(/Unknown command:/);
    expect(payload.content).toMatch(/ghost-cmd/);
    expect(payload.flags).toBe(MessageFlags.Ephemeral);
  });

  // Each invalid shape used to silently fall back to global defaults
  // (rateLimit:{}) or produce catastrophic limiter behavior (max:0 bans
  // forever; window:0 disables limiting). Now they fail loud.
  test.each([
    [{}, 'missing both'],
    [{ max: 5 }, 'missing window'],
    [{ window: 60_000 }, 'missing max'],
    [{ max: 0, window: 60_000 }, 'max=0 (would ban forever)'],
    [{ max: 5, window: 0 }, 'window=0 (would disable limiting)'],
    [{ max: -1, window: 60_000 }, 'negative max'],
    [{ max: 1.5, window: 60_000 }, 'non-integer max'],
  ])('malformed rateLimit %p rejects at dispatch (%s)', async (cfg) => {
    const command = makeCommand('malformed-' + Math.random().toString(36).slice(2, 8), cfg);
    const client = { commands: { get: () => command } };
    const interaction = makeInteraction('audit-user-malformed', command.data.name, client);
    await expect(interactionCreate.execute(interaction)).rejects.toThrow(/invalid rateLimit/);
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
