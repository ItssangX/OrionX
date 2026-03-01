import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const commands = [];
const basePath = path.resolve('commands');

// Duyệt qua tất cả thư mục commands
const commandFolders = fs.readdirSync(basePath);

for (const folder of commandFolders) {
    const folderPath = path.join(basePath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = `file://${path.join(folderPath, file).replace(/\\/g, '/')}`;
        const { default: command } = await import(filePath);

        if (command && command.data) {
            commands.push(command.data.toJSON());
        }
    }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`🚀 Đang đăng ký ${commands.length} slash commands...`);

        // Đăng ký cho toàn bộ bot (Global)
        // Lưu ý: Có thể mất vài phút đến 1 tiếng để cập nhật trên Discord
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Đã đăng ký thành công ${data.length} slash commands!`);
    } catch (error) {
        console.error('❌ Lỗi đăng ký slash commands:', error);
    }
})();
