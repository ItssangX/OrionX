import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

export default async function loadCommands(client) {
  const basePath = path.resolve('commands');

  for (const folder of fs.readdirSync(basePath)) {
    const folderPath = path.join(basePath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      try {
        const filePath = `../commands/${folder}/${file}`;
        const { default: command } = await import(filePath);

        // 🔒 BẢO VỆ
        if (!command || !command.name) {
          logger.warn(`Bỏ qua command lỗi: ${folder}/${file}`);
          continue;
        }

        if (client.commands.has(command.name)) {
          logger.warn(`Trùng tên command: ${command.name}`);
          continue;
        }

        client.commands.set(command.name, command);



      } catch (err) {
        logger.error(`Lỗi load command: ${folder}/${file}`, err);
      }
    }
  }

  logger.info(`Loaded ${client.commands.size} commands`);
}
