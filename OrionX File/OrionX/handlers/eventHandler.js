import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

export default async function loadEvents(client) {
  const eventsPath = path.resolve('events');
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = await import(`../events/${file}`);

    if (event.default.once) {
      client.once(event.default.name, (...args) =>
        event.default.execute(...args, client)
      );
    } else {
      client.on(event.default.name, (...args) =>
        event.default.execute(...args, client)
      );
    }
  }

  logger.info(`Loaded ${eventFiles.length} events`);
}
