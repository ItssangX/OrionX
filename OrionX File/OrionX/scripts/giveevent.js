/**
 * ============================================
 * GIVEEVENT.JS - Tặng Tiền Cho Tất Cả Member
 * ============================================
 * Cách sử dụng: node scripts/giveevent.js
 * Script này cần bot Discord đang chạy để gửi DM
 * Chỉnh các config bên dưới trước khi chạy
 */

import mongoose from 'mongoose';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { User } from '../database/models.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
delete process.env.SHARD_COUNT; // Fix for discord.js parsing 'auto' as NaN


// ============================================
// ⚙️ CẤU HÌNH SỐ TIỀN TẶNG
// ============================================

const GIFT_AMOUNT = 500000;  // 👈 Số tiền tặng cho mỗi user

// ============================================
// ⚙️ CẤU HÌNH EMBED THÔNG BÁO
// ============================================

const EMBED_CONFIG = {
    title: '<a:gift:1446769608580399154> Gift Event <a:gift:1446769608580399154> ',
    description: `
Lì Xì tết 2026 từ OrionX!

<a:slowarrow:1446769171433263255> <a:gift:1446769608580399154> **Quà tặng của bạn:**
<a:slowarrow:1446769171433263255> <a:pixelcoin:1456194056798339104> **+${GIFT_AMOUNT.toLocaleString()}** <:Xcoin:1433810075927183441>

---
*Cảm ơn bạn đã đồng hành cùng OrionX!*
  `.trim(),
    color: 0xFFD700,  // 👈 Màu vàng gold
    thumbnail: null,  // 👈 URL hình thumbnail (hoặc null)
    image: null,      // 👈 URL hình lớn (hoặc null)
    footer: {
        text: 'OrionX',
        iconURL: null   // 👈 URL icon footer (hoặc null)
    }
};

// ============================================
// 🔧 XỬ LÝ - KHÔNG CẦN CHỈNH
// ============================================

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
});

async function giveEvent() {
    try {
        console.log('🔌 Đang kết nối MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB kết nối thành công!\n');

        console.log('🤖 Đang đăng nhập Discord bot...');
        await client.login(process.env.TOKEN);
        console.log(`✅ Bot đã đăng nhập: ${client.user.tag}\n`);

        // Lấy tất cả users
        const users = await User.find({});
        console.log(`📊 Tìm thấy ${users.length} users trong database\n`);

        let success = 0;
        let failed = 0;
        let dmSent = 0;
        let dmFailed = 0;

        for (const user of users) {
            try {
                // Cộng tiền
                user.money = (user.money || 0) + GIFT_AMOUNT;
                await user.save();
                success++;

                // Gửi DM
                try {
                    const discordUser = await client.users.fetch(user.userId);

                    const embed = new EmbedBuilder()
                        .setTitle(EMBED_CONFIG.title)
                        .setDescription(EMBED_CONFIG.description)
                        .setColor(EMBED_CONFIG.color)
                        .setTimestamp();

                    if (EMBED_CONFIG.thumbnail) embed.setThumbnail(EMBED_CONFIG.thumbnail);
                    if (EMBED_CONFIG.image) embed.setImage(EMBED_CONFIG.image);
                    if (EMBED_CONFIG.footer.text) {
                        embed.setFooter({
                            text: EMBED_CONFIG.footer.text,
                            iconURL: EMBED_CONFIG.footer.iconURL
                        });
                    }

                    await discordUser.send({ embeds: [embed] });
                    dmSent++;
                    console.log(`✅ [${success}/${users.length}] ${user.username || user.userId}: +${GIFT_AMOUNT.toLocaleString()} | DM ✓`);
                } catch (dmErr) {
                    dmFailed++;
                    console.log(`✅ [${success}/${users.length}] ${user.username || user.userId}: +${GIFT_AMOUNT.toLocaleString()} | DM ✗`);
                }

            } catch (err) {
                failed++;
                console.log(`❌ [${success + failed}/${users.length}] ${user.username || user.userId}: Lỗi - ${err.message}`);
            }
        }

        console.log('\n========================================');
        console.log('📊 KẾT QUẢ GIFT EVENT');
        console.log('========================================');
        console.log(`✅ Tặng tiền thành công: ${success}/${users.length}`);
        console.log(`❌ Tặng tiền thất bại: ${failed}`);
        console.log(`📬 DM gửi thành công: ${dmSent}`);
        console.log(`📭 DM gửi thất bại: ${dmFailed} (có thể user tắt DM)`);
        console.log(`💰 Tổng tiền đã phát: ${(success * GIFT_AMOUNT).toLocaleString()}`);
        console.log(`<a:clock:1446769163669602335> Thời gian: ${new Date().toLocaleString('vi-VN')}`);
        console.log('========================================');

        await mongoose.disconnect();
        client.destroy();
        console.log('\n✅ Hoàn tất! Đã ngắt kết nối.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        await mongoose.disconnect();
        client.destroy();
        process.exit(1);
    }
}

giveEvent();
