const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, MessageFlags, Collection } = require('discord.js');
const logger = require('../src/lib/logger');

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

  test('renders n/a (not 0ms/-1ms sentinels) when resource is missing and ws.ping is -1', async () => {
    // withResponse can yield no `resource` in edge interaction states, and
    // client.ws.ping is -1 until the first heartbeat ack. The old code printed
    // a misleading "0ms" round-trip and "-1ms" API latency; both should be
    // 'n/a'. This fails if either sentinel leaks back into the message.
    const interaction = {
      createdTimestamp: 1_000_000,
      client: { ws: { ping: -1 } },
      reply: jest.fn().mockResolvedValue({ resource: undefined }),
      editReply: jest.fn().mockResolvedValue(undefined),
    };

    await ping.execute(interaction);

    const reply = interaction.editReply.mock.calls[0][0];
    expect(reply).toBe('Pong! Latency: n/a | API: n/a');
    expect(reply).not.toMatch(/0ms/);
    expect(reply).not.toMatch(/-1ms/);
  });
});

describe('error event handler', () => {
  const errorEvent = require(path.join(__dirname, '..', 'src', 'events', 'error.js'));

  test('handles a non-Error payload (null) without throwing inside the handler', () => {
    // discord.js may emit a non-Error value on the 'error' event. The old
    // handler read error.message directly and threw a TypeError *inside* the
    // error handler, taking the process down. errMsg() must absorb it.
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    try {
      expect(() => errorEvent.execute(null)).not.toThrow();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      // The extracted message is the stringified payload, not a crash.
      expect(errorSpy.mock.calls[0][2]).toEqual({ error: 'null' });
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('extracts .message from a real Error', () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    try {
      errorEvent.execute(new Error('gateway closed'));
      expect(errorSpy.mock.calls[0][2]).toEqual({ error: 'gateway closed' });
    } finally {
      errorSpy.mockRestore();
    }
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

describe('/help command', () => {
  const help = require(path.join(commandsPath, 'help.js'));

  test('lists registered commands with name and description', async () => {
    const commands = new Collection();
    commands.set('ping', { data: { name: 'ping', description: 'Check bot latency' } });
    commands.set('search', { data: { name: 'search', description: 'Search a list' } });
    const interaction = {
      client: { commands },
      reply: jest.fn().mockResolvedValue(undefined),
    };

    await help.execute(interaction);

    const payload = interaction.reply.mock.calls[0][0];
    const description = payload.embeds[0].data.description;
    expect(description).toContain('`/ping` — Check bot latency');
    expect(description).toContain('`/search` — Search a list');
    // Mentions in command descriptions must be inert.
    expect(payload.allowedMentions).toEqual({ parse: [] });
  });

  test('empty command Collection falls back to a sentinel, does NOT throw', async () => {
    // EmbedBuilder.setDescription('') throws inside discord.js validation, so
    // an empty Collection (mid-reload, or a loader that registered nothing)
    // used to crash /help. The fix substitutes a sentinel description.
    //
    // This fails if the guard is removed: the empty join → setDescription('')
    // → EmbedBuilder throws synchronously and execute rejects.
    const interaction = {
      client: { commands: new Collection() },
      reply: jest.fn().mockResolvedValue(undefined),
    };

    await expect(help.execute(interaction)).resolves.toBeUndefined();

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const payload = interaction.reply.mock.calls[0][0];
    expect(payload.embeds[0].data.description).toBe('No commands registered.');
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

  let warnSpy;
  let errorSpy;
  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  // A malformed rateLimit must NOT crash the dispatcher. limiterFor() used to
  // throw, and because the throw happened *above* the per-command try/catch it
  // escaped as an unhandledRejection → process exit. The fix validates the
  // shape and degrades to the global limiter, logging the bad config once.
  //
  // This test fails loudly if the crash is reintroduced: `execute` would then
  // reject (the awaited promise rejects) instead of resolving.
  test.each([
    [{}, 'missing both'],
    [{ max: 5 }, 'missing window'],
    [{ window: 60_000 }, 'missing max'],
    [{ max: 0, window: 60_000 }, 'max=0 (would ban forever)'],
    [{ max: 5, window: 0 }, 'window=0 (would disable limiting)'],
    [{ max: -1, window: 60_000 }, 'negative max'],
    [{ max: 1.5, window: 60_000 }, 'non-integer max'],
  ])('malformed rateLimit %p degrades to global limit without crashing (%s)', async (cfg) => {
    // Unique name per case: the dispatcher dedupes the bad-config error log by
    // command name, so a reused name would suppress the log on later cases.
    const name = 'malformed-' + Math.random().toString(36).slice(2, 8);
    const command = makeCommand(name, cfg);
    const client = { commands: { get: () => command } };
    const interaction = makeInteraction('audit-user-' + name, name, client);

    // Must resolve, not reject — the crash regression would reject here.
    await expect(interactionCreate.execute(interaction)).resolves.toBeUndefined();

    // Degraded path: the command still ran (under the global limiter).
    expect(command.execute).toHaveBeenCalledTimes(1);
    expect(command.execute).toHaveBeenCalledWith(interaction);

    // And the bad config was surfaced at ERROR level (not silently swallowed,
    // and not demoted to a warn that ops dashboards routinely filter out).
    const badConfigLog = errorSpy.mock.calls.find(
      (c) => typeof c[1] === 'string' && /invalid rateLimit/.test(c[1])
    );
    expect(badConfigLog).toBeDefined();
    expect(badConfigLog[1]).toMatch(/Falling back to the global limit/);
    const badConfigWarn = warnSpy.mock.calls.find(
      (c) => typeof c[1] === 'string' && /invalid rateLimit/.test(c[1])
    );
    expect(badConfigWarn).toBeUndefined();

    // No user-facing crash reply ("Something went wrong.") was sent.
    const sentContents = interaction.reply.mock.calls.map((c) => c[0]?.content);
    expect(sentContents).not.toContain('Something went wrong.');
  });

  test('command.execute rejecting is caught: generic ephemeral reply, no rethrow', async () => {
    const boom = new Error('handler exploded');
    const command = makeCommand('throwing-cmd');
    command.execute = jest.fn().mockRejectedValue(boom);
    const client = { commands: { get: () => command } };
    const interaction = makeInteraction('audit-user-throwing', 'throwing-cmd', client);

    // The dispatcher must swallow the rejection — never rethrow to the gateway
    // event emitter (which would become an unhandledRejection).
    await expect(interactionCreate.execute(interaction)).resolves.toBeUndefined();

    expect(command.execute).toHaveBeenCalledTimes(1);
    // User sees a generic, ephemeral failure message.
    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const payload = interaction.reply.mock.calls[0][0];
    expect(payload.content).toBe('Something went wrong.');
    expect(payload.flags).toBe(MessageFlags.Ephemeral);
    // The underlying error is logged with the command name for triage.
    const errLog = errorSpy.mock.calls.find(
      (c) => typeof c[1] === 'string' && /Error executing throwing-cmd/.test(c[1])
    );
    expect(errLog).toBeDefined();
  });

  test('command.autocomplete rejecting is swallowed: no rethrow, no reply, error logged', async () => {
    const boom = new Error('autocomplete exploded');
    const command = {
      data: { name: 'ac-cmd' },
      execute: jest.fn(),
      autocomplete: jest.fn().mockRejectedValue(boom),
    };
    const client = { commands: { get: () => command } };
    const interaction = {
      commandName: 'ac-cmd',
      isAutocomplete: () => true,
      isChatInputCommand: () => false,
      client,
      respond: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn(),
    };

    // Autocomplete errors must not bubble — a rejected autocomplete would
    // otherwise crash the process via unhandledRejection.
    await expect(interactionCreate.execute(interaction)).resolves.toBeUndefined();

    expect(command.autocomplete).toHaveBeenCalledTimes(1);
    // No chat reply path is touched for an autocomplete interaction.
    expect(interaction.reply).not.toHaveBeenCalled();
    expect(command.execute).not.toHaveBeenCalled();
    // The failure is logged (swallowed, not silent).
    const acLog = errorSpy.mock.calls.find(
      (c) => typeof c[1] === 'string' && /Autocomplete failed for ac-cmd/.test(c[1])
    );
    expect(acLog).toBeDefined();
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
