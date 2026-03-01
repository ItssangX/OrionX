import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { User } from '../../database/models.js';
import { ADMIN_ID } from '../../config/captchaConfig.js';

// Admin chính - CHỈ NGƯỜI NÀY MỚI DÙNG ĐƯỢC LỆNH NÀY
const ADMIN_MAIN = ADMIN_ID;

// Parse thời gian từ string (vd: 10m, 1h, 1d)
function parseTime(timeStr) {
    if (!timeStr) return null;

    const match = timeStr.match(/^(\d+)(m|h|d)$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    let ms = 0;
    switch (unit) {
        case 'm': ms = value * 60 * 1000; break;         // phút
        case 'h': ms = value * 60 * 60 * 1000; break;    // giờ
        case 'd': ms = value * 24 * 60 * 60 * 1000; break; // ngày
        default: return null;
    }

    return ms;
}

// Format thời gian đẹp
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày`;
    if (hours > 0) return `${hours} giờ`;
    if (minutes > 0) return `${minutes} phút`;
    return `${seconds} giây`;
}

export default {
    name: 'mute',
    aliases: ['muteuser', 'silence'],
    description: '[ADMIN MAIN] Mute user trong thời gian nhất định',

    async execute(message, args) {
        try {
            // Kiểm tra quyền Admin Main
            if (message.author.id !== ADMIN_MAIN) {
                const noPermContainer = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> **Không có quyền!** Chỉ **Admin Main** mới có thể sử dụng lệnh này!')
                );
                return message.reply({ components: [noPermContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Lấy target user
            const target = message.mentions.users.first();
            if (!target) {
                const usageContainer = new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🔇 LỆNH MUTE USER\n` +
                        `> Cú pháp: \`Xmute @user <thời gian>\`\n` +
                        `> Thời gian: \`10m\` (10 phút), \`1h\` (1 giờ), \`1d\` (1 ngày)\n\n` +
                        `> **Ví dụ:**\n` +
                        `> - \`Xmute @User 30m\` - Mute 30 phút\n` +
                        `> - \`Xmute @User 2h\` - Mute 2 giờ\n` +
                        `> - \`Xmute @User 1d\` - Mute 1 ngày`
                    )
                );
                return message.reply({ components: [usageContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Không cho mute chính mình
            if (target.id === message.author.id) {
                return message.reply('> <a:no:1455096623804715080> Không thể tự mute chính mình!');
            }

            // Không cho mute Admin Main
            if (target.id === ADMIN_MAIN) {
                return message.reply('> <a:no:1455096623804715080> Không thể mute **Admin Main**!');
            }

            // Parse thời gian
            const timeStr = args[1];
            const duration = parseTime(timeStr);

            if (!duration) {
                return message.reply('> <a:no:1455096623804715080> Thời gian không hợp lệ! Sử dụng format: `10m`, `1h`, `1d`');
            }

            // Giới hạn thời gian tối đa 30 ngày
            if (duration > 30 * 24 * 60 * 60 * 1000) {
                return message.reply('> <a:no:1455096623804715080> Thời gian mute tối đa là **30 ngày**!');
            }

            // Tìm hoặc tạo user
            let userData = await User.findOne({ userId: target.id });
            if (!userData) {
                userData = new User({
                    userId: target.id,
                    username: target.username
                });
            }

            // Set mute
            const muteUntil = new Date(Date.now() + duration);
            if (!userData.captcha) {
                userData.captcha = {};
            }
            userData.captcha.muteUntil = muteUntil;
            userData.captcha.mutedBy = message.author.id;
            await userData.save();

            // Thông báo thành công
            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🔇 USER ĐÃ BỊ MUTE'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `> **User:** ${target.username} (\`${target.id}\`)\n` +
                    `> **Thời gian:** ${formatDuration(duration)}\n` +
                    `> **Hết hạn:** <t:${Math.floor(muteUntil.getTime() / 1000)}:R>\n` +
                    `> **Bởi:** ${message.author.username}\n\n` +
                    `*User này sẽ không thể sử dụng lệnh cho đến khi hết thời gian mute.*`
                ));

            message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error('<a:no:1455096623804715080> Lỗi mute:', error);
            message.reply('> <a:no:1455096623804715080> **Lỗi!** Không thể mute user.');
        }
    }
};
