/**
 * Cấu hình cooldown cho từng lệnh (tính bằng giây)
 * Lệnh không có trong list này sẽ dùng DEFAULT_COOLDOWN
 */

// Cooldown mặc định cho tất cả lệnh
export const DEFAULT_COOLDOWN = 5;

// Cooldown riêng cho từng lệnh
export const COMMAND_COOLDOWNS = {
  // ===== LỆNH KHÔNG CÓ COOLDOWN =====
  'help': 10,           // xhelp
  'ping': 10,           // xping
  
  // ===== LỆNH QUẢN TRỊ - COOLDOWN NGẮN =====
  'disable': 2,        // xdisable
  'enable': 2,         // xenable
  'disabledlist': 2,   // xdisabledlist
  'clear': 3,
  'kick': 3,
  'ban': 3,
  'mute': 3,
  'unmute': 3,
  
  // ===== LỆNH KINH TẾ - COOLDOWN VỪA =====
  'petcheck' : 10,
  'daily': 5,  
  'work': 10,   
  'crime': 1,
  'rob': 1,   
  'balance': 3,
  'bal': 3,
  'shop': 5,
  'buy': 5,
  'sell': 5,
  'inventory': 5,
  'inv': 5,
  'give': 10,
  'trade': 10,
  
  // ===== LỆNH GAME/GIẢI TRÍ - COOLDOWN VỪA =====
  'slot': 10,
  'coinflip': 8,
  'dice': 8,
  'rps': 5,           // rock paper scissors
  'blackjack': 10,
  
  // ===== LỆNH PET/BATTLE - COOLDOWN NGẮN =====
  'pet': 10,
  'pets': 10,
  'zoo': 10,
  'catch': 300,        // 5 phút
  'battle': 10,
  'train': 60,         // 1 phút
  'feed': 30,
  'heal': 30,
  'sellpet': 10,
  
  // ===== LỆNH THÔNG TIN - COOLDOWN NGẮN =====
  'profile': 5,
  'pf': 5,
  'userinfo': 5,
  'serverinfo': 5,
  'avatar': 3,
  'level': 5,
  'rank': 5,
  'leaderboard': 10,
  'lb': 10,
  'top': 10,
  
  // ===== LỆNH VUI - COOLDOWN VỪA =====
  'meme': 8,
  'joke': 8,
  '8ball': 5,
  'advice': 8,
  'quote': 8,
  'fact': 8,
  
  // ===== LỆNH SOCIAL - COOLDOWN NGẮN =====
  'hug': 5,
  'kiss': 5,
  'slap': 5,
  'pat': 5,
  'cuddle': 5,
  'poke': 5,
  
  // ===== LỆNH SPAM-PRONE - COOLDOWN DÀI =====
  'spam': 15,
  'massping': 30,
  'announce': 20,
  'giveaway': 60,
};

/**
 * Lấy cooldown của một lệnh
 * @param {string} commandName - Tên lệnh
 * @returns {number} Cooldown tính bằng giây
 */
export function getCooldown(commandName) {
  return COMMAND_COOLDOWNS[commandName.toLowerCase()] ?? DEFAULT_COOLDOWN;
}

/**
 * Kiểm tra xem lệnh có cooldown không
 * @param {string} commandName - Tên lệnh
 * @returns {boolean}
 */
export function hasCooldown(commandName) {
  const cooldown = getCooldown(commandName);
  return cooldown > 0;
}

/**
 * Format thời gian cooldown thành chuỗi đẹp
 * @param {number} seconds - Số giây
 * @returns {string} Chuỗi đã format
 */
export function formatCooldown(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}

/**
 * Danh sách lệnh được miễn cooldown (cho owner/admin)
 */
export const COOLDOWN_BYPASS = [
  'help',
  'xhelp',
  'ping',
];

/**
 * Kiểm tra user có bypass cooldown không
 * @param {User} user - Discord user
 * @param {Guild} guild - Discord guild
 * @returns {boolean}
 */
export function canBypassCooldown(user, guild) {
  return false;
}