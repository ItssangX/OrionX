// ==================== CẤU HÌNH VẬT PHẨM SHOP ====================
// Giá đã được tăng lên đáng kể để tránh lạm phát tiền trong game
// Buff items giờ đây có giá cao hơn nhiều so với trước để cân bằng kinh tế

export const ALL_ITEMS = [
    {
        id: 'double_all',
        name: 'Thẻ X2 Toàn Bộ',
        description: 'Tăng gấp đôi tiền nhận được từ các lệnh Work, Daily, ... trong 10 phút (Không áp dụng cho cờ bạc/đặt cược).',
        price: 500000, // Tăng từ 50,000 lên 500,000 (10x)
        type: 'buff',
        effect: { field: 'globalMultiplier', multiplier: 2, duration: 10 * 60 * 1000 },
        emoji: '🎫',
        rarity: 'common'
    },
    {
        id: 'triple_all',
        name: 'Thẻ X3 Toàn Bộ',
        description: 'Tăng gấp BA lần tiền nhận được từ các lệnh Work, Daily, ... trong 5 phút (Không áp dụng cho cờ bạc/đặt cược).',
        price: 1500000, // Tăng từ 150,000 lên 1,500,000 (10x)
        type: 'buff',
        effect: { field: 'globalMultiplier', multiplier: 3, duration: 5 * 60 * 1000 },
        emoji: '🔥',
        rarity: 'rare'
    },
    {
        id: 'mini_multiplier',
        name: 'Thẻ X1.5 Toàn Bộ',
        description: 'Tăng 1.5 lần tiền nhận được từ các lệnh Work, Daily, ... trong 30 phút (Không áp dụng cho cờ bạc/đặt cược).',
        price: 200000, // Tăng từ 30,000 lên 200,000 (~6.7x)
        type: 'buff',
        effect: { field: 'globalMultiplier', multiplier: 1.5, duration: 30 * 60 * 1000 },
        emoji: '🎫',
        rarity: 'common'
    },
    {
        id: 'double_daily',
        name: 'Thẻ X2 Daily (7 Ngày)',
        description: 'Tăng gấp đôi phần thưởng Daily Reward trong vòng 7 ngày.',
        price: 2000000, // Tăng từ 200,000 lên 2,000,000 (10x)
        type: 'buff',
        effect: { field: 'dailyMultiplier', multiplier: 2, duration: 7 * 24 * 60 * 60 * 1000 },
        emoji: '💎',
        rarity: 'epic'
    },
    {
        id: 'daily_booster_tier1',
        name: 'Thẻ X1.5 Daily (3 Ngày)',
        description: 'Tăng 1.5 lần phần thưởng Daily Reward trong vòng 3 ngày.',
        price: 500000, // Tăng từ 80,000 lên 500,000 (~6.25x)
        type: 'buff',
        effect: { field: 'dailyMultiplier', multiplier: 1.5, duration: 3 * 24 * 60 * 60 * 1000 },
        emoji: '✨',
        rarity: 'common'
    },
    {
        id: 'streak_restore',
        name: 'Bùa Hồi Phục Streak',
        description: 'Khôi phục lại chuỗi Daily Streak cao nhất của bạn nếu lỡ bị mất.',
        price: 500000, // Tăng từ 100,000 lên 500,000 (5x)
        type: 'consumable',
        effect: { type: 'restore_streak' },
        emoji: '📜',
        rarity: 'rare'
    },
    {
        id: 'xp_booster',
        name: 'Thẻ X2 XP (1 Giờ)',
        description: 'Nhận gấp đôi XP từ mọi hoạt động trong vòng 1 giờ.',
        price: 300000, // Tăng từ 40,000 lên 300,000 (7.5x)
        type: 'buff',
        effect: { field: 'xpMultiplier', multiplier: 2, duration: 60 * 60 * 1000 },
        emoji: '⭐',
        rarity: 'common'
    }
];

export const getItemById = (id) => ALL_ITEMS.find(item => item.id === id);

/**
 * Lấy ngẫu nhiên n vật phẩm từ pool
 */
export const getRandomItems = (count = 4) => {
    const shuffled = [...ALL_ITEMS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

