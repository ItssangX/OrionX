/**
 * ============================================
 * UNBANUSER.JS - Script Gỡ Ban User Trực Tiếp
 * ============================================
 * Cách sử dụng: node scripts/unbanuser.js
 * Chỉnh USER_ID bên dưới trước khi chạy
 */

import mongoose from 'mongoose';
import { User } from '../database/models.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// ============================================
// ⚙️ CẤU HÌNH - CHỈNH SỬA TẠI ĐÂY
// ============================================

const USER_ID = '1234567890';  // 👈 ID Discord của user cần gỡ ban

// ============================================
// 🔧 XỬ LÝ - KHÔNG CẦN CHỈNH
// ============================================

async function unbanUser() {
    try {
        console.log('🔌 Đang kết nối MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Kết nối thành công!\n');

        console.log(`🔍 Đang tìm user: ${USER_ID}...`);
        const user = await User.findOne({ userId: USER_ID });

        if (!user) {
            console.log('❌ Không tìm thấy user với ID này!');
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`📋 Thông tin user:`);
        console.log(`   - Username: ${user.username || 'N/A'}`);
        console.log(`   - Trạng thái ban: ${user.captcha?.isPermBanned ? '🔴 Đang bị ban' : '🟢 Không bị ban'}`);

        if (user.captcha?.banReason) {
            console.log(`   - Lý do ban: ${user.captcha.banReason}`);
        }
        console.log('');

        // Check if not banned
        if (!user.captcha?.isPermBanned) {
            console.log('⚠️ User này không bị ban!');
            await mongoose.disconnect();
            process.exit(0);
        }

        // Thực hiện gỡ ban
        user.captcha.isPermBanned = false;
        user.captcha.bannedTemporarily = false;
        user.captcha.muteUntil = null;
        user.captcha.unbannedAt = new Date();

        await user.save();

        console.log('🔓 ĐÃ GỠ BAN USER THÀNH CÔNG!');
        console.log(`   - User ID: ${USER_ID}`);
        console.log(`   - Thời gian: ${new Date().toLocaleString('vi-VN')}`);

        await mongoose.disconnect();
        console.log('\n✅ Hoàn tất! Đã ngắt kết nối MongoDB.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

unbanUser();
