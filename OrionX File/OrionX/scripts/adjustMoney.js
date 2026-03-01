/**
 * ============================================
 * ADJUSTMONEY.JS - Chỉnh Tiền User Trực Tiếp
 * ============================================
 * Cách sử dụng: node scripts/adjustMoney.js
 * Chỉnh các config bên dưới trước khi chạy
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

const USER_ID = '1234567890';  // 👈 ID Discord của user

const ACTION = 'add';  // 👈 'add' | 'subtract' | 'set'
//    add: cộng thêm tiền
//    subtract: trừ tiền
//    set: đặt tiền về số cụ thể

const AMOUNT = 100000;  // 👈 Số tiền

const ADJUST_BANK = false;  // 👈 true: chỉnh bank, false: chỉnh money
const NOTE = 'Admin adjustment';  // 👈 Ghi chú

// ============================================
// 🔧 XỬ LÝ - KHÔNG CẦN CHỈNH
// ============================================

async function adjustMoney() {
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

        const field = ADJUST_BANK ? 'bank.balance' : 'money';
        const currentValue = ADJUST_BANK ? (user.bank?.balance || 0) : (user.money || 0);

        console.log(`📋 Thông tin user:`);
        console.log(`   - Username: ${user.username || 'N/A'}`);
        console.log(`   - Money hiện tại: ${user.money?.toLocaleString() || 0}`);
        console.log(`   - Bank hiện tại: ${user.bank?.balance?.toLocaleString() || 0}\n`);

        let newValue;
        switch (ACTION) {
            case 'add':
                newValue = currentValue + AMOUNT;
                console.log(`➕ Cộng thêm: ${AMOUNT.toLocaleString()}`);
                break;
            case 'subtract':
                newValue = Math.max(0, currentValue - AMOUNT);  // Không cho âm
                console.log(`➖ Trừ đi: ${AMOUNT.toLocaleString()}`);
                break;
            case 'set':
                newValue = Math.max(0, AMOUNT);
                console.log(`🔄 Đặt về: ${AMOUNT.toLocaleString()}`);
                break;
            default:
                console.log('❌ ACTION không hợp lệ! Dùng: add | subtract | set');
                await mongoose.disconnect();
                process.exit(1);
        }

        // Thực hiện cập nhật
        if (ADJUST_BANK) {
            user.bank = user.bank || {};
            user.bank.balance = newValue;
        } else {
            user.money = newValue;
        }

        await user.save();

        console.log(`\n💰 ĐÃ CHỈNH ${ADJUST_BANK ? 'BANK' : 'MONEY'} THÀNH CÔNG!`);
        console.log(`   - User ID: ${USER_ID}`);
        console.log(`   - Giá trị cũ: ${currentValue.toLocaleString()}`);
        console.log(`   - Giá trị mới: ${newValue.toLocaleString()}`);
        console.log(`   - Thay đổi: ${(newValue - currentValue >= 0 ? '+' : '')}${(newValue - currentValue).toLocaleString()}`);
        console.log(`   - Ghi chú: ${NOTE}`);
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

adjustMoney();
