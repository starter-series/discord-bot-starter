const {
  buildCommandPayloads,
  main,
} = require('../scripts/deploy-commands');

describe('deploy-commands', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('buildCommandPayloads serializes every command without Discord network access', () => {
    const commands = buildCommandPayloads();
    expect(commands.map((command) => command.name).sort()).toEqual(['help', 'ping', 'search']);
    for (const command of commands) {
      expect(command.name).toMatch(/^[a-z0-9_-]{1,32}$/);
      expect(command.description).toBeTruthy();
    }
  });

  test('--dry-run validates commands without requiring Discord credentials', async () => {
    const result = await main(['--dry-run'], {});

    expect(result.dryRun).toBe(true);
    expect(result.commands).toHaveLength(3);
    expect(logSpy.mock.calls.map((call) => call[0]).join('\n')).toContain(
      'Set DISCORD_TOKEN and DISCORD_CLIENT_ID before running without --dry-run.'
    );
  });
});
