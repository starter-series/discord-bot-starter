const fs = require('fs');
const path = require('path');

describe('Command files', () => {
  const commandsPath = path.join(__dirname, '..', 'src', 'commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'));

  test('at least one command exists', () => {
    expect(commandFiles.length).toBeGreaterThan(0);
  });

  test.each(commandFiles)('%s exports data and execute', (file) => {
    const command = require(path.join(commandsPath, file));
    expect(command).toHaveProperty('data');
    expect(command).toHaveProperty('execute');
    expect(typeof command.execute).toBe('function');
    expect(command.data.name).toBeTruthy();
    expect(command.data.description).toBeTruthy();
  });
});

describe('Event files', () => {
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
  });
});
