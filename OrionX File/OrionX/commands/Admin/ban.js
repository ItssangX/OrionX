import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { User } from '../../database/models.js';
import { ADMIN_ID } from '../../config/captchaConfig.js';

// Admin chính - CHỈ NGƯỜI NÀY MỚI DÙNG ĐƯỢC LỆNH NÀY
const ADMIN_MAIN = ADMIN_ID;

export default {
    name: 'ban',
    aliases: ['banuser', 'permban'],
    description: '[ADMIN MAIN] Ban user vĩnh viễn khỏi bot',

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
                        `## 🔨 LỆNH BAN USER\n` +
                        `> Cú pháp: \`Xban @user [lý do]\`\n` +
                        `> Ví dụ: \`Xban @BadUser Spam bot\``
                    )
                );
                return message.reply({ components: [usageContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Không cho ban chính mình
            if (target.id === message.author.id) {
                return message.reply('> <a:no:1455096623804715080> Không thể tự ban chính mình!');
            }

            // Không cho ban Admin Main
            if (target.id === ADMIN_MAIN) {
                return message.reply('> <a:no:1455096623804715080> Không thể ban **Admin Main**!');
            }

            // Lấy lý do
            const reason = args.slice(1).join(' ') || 'Không có lý do được cung cấp';

            // Tìm hoặc tạo user
            let userData = await User.findOne({ userId: target.id });
            if (!userData) {
                userData = new User({
                    userId: target.id,
                    username: target.username
                });
            }

            // Kiểm tra đã bị ban chưa
            if (userData.captcha?.isPermBanned) {
                return message.reply(`> <a:no:1455096623804715080> **${target.username}** đã bị ban từ trước!`);
            }

            // Ban user
            if (!userData.captcha) {
                userData.captcha = {};
            }
            userData.captcha.isPermBanned = true;
            userData.captcha.bannedReason = reason;
            userData.captcha.bannedAt = new Date();
            userData.captcha.bannedBy = message.author.id;
            await userData.save();

            // Thông báo thành công
            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🔨 USER ĐÃ BỊ BAN'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `> **User:** ${target.username} (\`${target.id}\`)\n` +
                    `> **Lý do:** ${reason}\n` +
                    `> **Bởi:** ${message.author.username}\n\n` +
                    `*User này sẽ không thể sử dụng bất kỳ lệnh nào của bot.*`
                ));

            message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error('<a:no:1455096623804715080> Lỗi ban:', error);
            message.reply('> <a:no:1455096623804715080> **Lỗi!** Không thể ban user.');
        }
    }
};
