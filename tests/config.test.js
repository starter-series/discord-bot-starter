const {
  loadConfig,
  readConfig,
  validateConfig,
} = require('../src/config');

describe('config loader', () => {
  test('readConfig maps Discord env names to runtime config keys', () => {
    const config = readConfig({
      DISCORD_TOKEN: 'placeholder-token',
      DISCORD_CLIENT_ID: 'placeholder-client-id',
      DISCORD_GUILD_ID: 'placeholder-guild-id',
    });

    expect(config).toEqual({
      token: 'placeholder-token',
      clientId: 'placeholder-client-id',
      guildId: 'placeholder-guild-id',
    });
  });

  test('validateConfig reports missing required token/client id', () => {
    expect(validateConfig({ token: '', clientId: 'client' })).toEqual(['Missing DISCORD_TOKEN']);
    expect(validateConfig({ token: 'token', clientId: ' ' })).toEqual(['Missing DISCORD_CLIENT_ID']);
  });

  test('loadConfig can throw instead of exiting for tests and smoke tooling', () => {
    expect(() => loadConfig({
      env: {},
      exitOnError: false,
    })).toThrow(/Missing DISCORD_TOKEN, Missing DISCORD_CLIENT_ID/);
  });
});
