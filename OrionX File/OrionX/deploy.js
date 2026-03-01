import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const commands = [];
const commandsPath = path.resolve('commands');

async function loadCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await loadCommands(filePath);
    } else if (file.endsWith('.js')) {
      const command = await import(pathToFileURL(filePath).href);
      if (command.default?.data) {
        const authorizedSlash = ['help', 'cash', 'vote', 'disable', 'enable'];
        const name = command.default.data.name;

        if (authorizedSlash.includes(name)) {
          console.log(`[DEPLOY] Registered slash command: ${name}`);
          commands.push(command.default.data.toJSON());
        }
      }
    }
  }
}

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await loadCommands(commandsPath);

    const clientId = Buffer.from(process.env.TOKEN.split('.')[0], 'base64').toString();

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();