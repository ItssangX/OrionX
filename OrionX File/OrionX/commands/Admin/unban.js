import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { User } from '../../database/models.js';
import { ADMIN_ID } from '../../config/captchaConfig.js';

// Admin chính - CHỈ NGƯỜI NÀY MỚI DÙNG ĐƯỢC LỆNH NÀY
const ADMIN_MAIN = ADMIN_ID;

export default {
    name: 'unban',
    aliases: ['unbanuser', 'goban'],
    description: '[ADMIN MAIN] Gỡ ban user',

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
                        `## 🔓 LỆNH GỠ BAN USER\n` +
                        `> Cú pháp: \`Xunban @user\`\n` +
                        `> Ví dụ: \`Xunban @User\``
                    )
                );
                return message.reply({ components: [usageContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Tìm user
            const userData = await User.findOne({ userId: target.id });
            if (!userData) {
                return message.reply(`> <a:no:1455096623804715080> **${target.username}** không tồn tại trong database!`);
            }

            // Kiểm tra có bị ban không
            if (!userData.captcha?.isPermBanned) {
                return message.reply(`> <a:no:1455096623804715080> **${target.username}** không bị ban!`);
            }

            // Gỡ ban
            userData.captcha.isPermBanned = false;
            userData.captcha.bannedReason = null;
            userData.captcha.bannedAt = null;
            userData.captcha.bannedBy = null;
            await userData.save();

            // Thông báo thành công
            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🔓 USER ĐÃ ĐƯỢC GỠ BAN'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `> **User:** ${target.username} (\`${target.id}\`)\n` +
                    `> **Gỡ bởi:** ${message.author.username}\n\n` +
                    `*User này giờ có thể sử dụng bot bình thường.*`
                ));

            message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error('<a:no:1455096623804715080> Lỗi unban:', error);
            message.reply('> <a:no:1455096623804715080> **Lỗi!** Không thể gỡ ban user.');
        }
    }
};
