/**
 * ============================================
 * BANUSER.JS - Script Ban User Trực Tiếp
 * ============================================
 * Cách sử dụng: node scripts/banuser.js
 * Chỉnh USER_ID và REASON bên dưới trước khi chạy
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

const USER_ID = '1234567890';  // 👈 ID Discord của user cần ban
const REASON = 'Vi phạm quy định';  // 👈 Lý do ban

// ============================================
// 🔧 XỬ LÝ - KHÔNG CẦN CHỈNH
// ============================================

async function banUser() {
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
        console.log(`   - Money: ${user.money?.toLocaleString() || 0}`);
        console.log(`   - Level: ${user.level || 1}`);
        console.log(`   - Pets: ${user.pets?.length || 0}\n`);

        // Check if already banned
        if (user.captcha?.isPermBanned) {
            console.log('⚠️ User này đã bị ban rồi!');
            await mongoose.disconnect();
            process.exit(0);
        }

        // Thực hiện ban
        user.captcha = user.captcha || {};
        user.captcha.isPermBanned = true;
        user.captcha.bannedAt = new Date();
        user.captcha.banReason = REASON;

        await user.save();

        console.log('🔨 ĐÃ BAN USER THÀNH CÔNG!');
        console.log(`   - User ID: ${USER_ID}`);
        console.log(`   - Lý do: ${REASON}`);
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

banUser();
