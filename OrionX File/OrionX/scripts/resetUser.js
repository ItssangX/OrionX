/**
 * ============================================
 * RESETUSER.JS - Reset Tài Khoản User
 * ============================================
 * Cách sử dụng: node scripts/resetUser.js
 * Chỉnh USER_ID và các option bên dưới trước khi chạy
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

const USER_ID = '1234567890';  // 👈 ID Discord của user cần reset

// Chọn những gì cần reset (true = reset, false = giữ nguyên)
const RESET_OPTIONS = {
    money: true,         // 👈 Reset tiền về 0
    bank: true,          // 👈 Reset bank về 0
    level: true,         // 👈 Reset level và exp về 1/0
    pets: true,          // 👈 Xóa tất cả pet
    weapons: true,       // 👈 Xóa tất cả vũ khí
    inventory: true,     // 👈 Xóa inventory
    team: true,          // 👈 Reset team battle
    quests: true,        // 👈 Reset quest
    streaks: true,       // 👈 Reset các streak
    buffs: true,         // 👈 Xóa các buff
    stats: true,         // 👈 Reset HP/ATK/DEF về mặc định
    badges: false,       // 👈 Giữ lại badge (mặc định)
    tosAccepted: false,  // 👈 Giữ ToS (mặc định)
};

// ============================================
// 🔧 XỬ LÝ - KHÔNG CẦN CHỈNH
// ============================================

async function resetUser() {
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

        console.log(`📋 Thông tin user TRƯỚC reset:`);
        console.log(`   - Username: ${user.username || 'N/A'}`);
        console.log(`   - Money: ${user.money?.toLocaleString() || 0}`);
        console.log(`   - Bank: ${user.bank?.balance?.toLocaleString() || 0}`);
        console.log(`   - Level: ${user.level || 1}`);
        console.log(`   - Pets: ${user.pets?.length || 0}`);
        console.log(`   - Weapons: ${user.weapons?.length || 0}`);
        console.log('');

        const resetted = [];

        // Thực hiện reset theo options
        if (RESET_OPTIONS.money) {
            user.money = 0;
            resetted.push('💰 Money');
        }

        if (RESET_OPTIONS.bank) {
            user.bank = { balance: 0, capacity: 50000, tier: 1 };
            resetted.push('🏦 Bank');
        }

        if (RESET_OPTIONS.level) {
            user.level = 1;
            user.exp = 0;
            resetted.push('⭐ Level/EXP');
        }

        if (RESET_OPTIONS.pets) {
            user.pets = [];
            resetted.push('🐾 Pets');
        }

        if (RESET_OPTIONS.weapons) {
            user.weapons = [];
            resetted.push('⚔️ Weapons');
        }

        if (RESET_OPTIONS.inventory) {
            user.inventory = [];
            resetted.push('🎒 Inventory');
        }

        if (RESET_OPTIONS.team) {
            user.team = { slot1: null, slot2: null, slot3: null };
            resetted.push('👥 Team');
        }

        if (RESET_OPTIONS.quests) {
            user.quests = { lastReset: null, tasks: [] };
            resetted.push('📜 Quests');
        }

        if (RESET_OPTIONS.streaks) {
            user.dailyStreak = 0;
            user.battleWinStreak = 0;
            user.totalBattleWins = 0;
            user.lastDaily = null;
            user.lastWork = null;
            resetted.push('🔥 Streaks');
        }

        if (RESET_OPTIONS.buffs) {
            user.buffs = {
                globalMultiplier: { value: 1, expireAt: null },
                dailyMultiplier: { value: 1, expireAt: null },
                xpMultiplier: { value: 1, expireAt: null }
            };
            resetted.push('✨ Buffs');
        }

        if (RESET_OPTIONS.stats) {
            user.hp = 100;
            user.atk = 10;
            user.def = 5;
            resetted.push('📊 Stats');
        }

        if (RESET_OPTIONS.badges) {
            user.badges = [];
            resetted.push('🏅 Badges');
        }

        if (RESET_OPTIONS.tosAccepted) {
            user.tosAccepted = false;
            user.tosAcceptedAt = null;
            resetted.push('📋 ToS');
        }

        await user.save();

        console.log('🔄 ĐÃ RESET USER THÀNH CÔNG!');
        console.log(`   - User ID: ${USER_ID}`);
        console.log(`   - Đã reset: ${resetted.length} mục`);
        console.log(`   - Chi tiết: ${resetted.join(', ')}`);
        console.log(`   - Thời gian: ${new Date().toLocaleString('vi-VN')}`);

        console.log(`\n📋 Thông tin user SAU reset:`);
        console.log(`   - Money: ${user.money?.toLocaleString() || 0}`);
        console.log(`   - Bank: ${user.bank?.balance?.toLocaleString() || 0}`);
        console.log(`   - Level: ${user.level || 1}`);
        console.log(`   - Pets: ${user.pets?.length || 0}`);
        console.log(`   - Weapons: ${user.weapons?.length || 0}`);

        await mongoose.disconnect();
        console.log('\n✅ Hoàn tất! Đã ngắt kết nối MongoDB.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

resetUser();
