/**
 * ============================================
 * PETEVENT.JS - Cấu Hình Event Pet Đặc Biệt
 * ============================================
 * File này chứa cấu hình event pet
 * Pet này sẽ xuất hiện ngẫu nhiên khi hunt với % bạn đặt
 * KHÔNG cần chạy file này bằng node, chỉ cần chỉnh config
 *
 * Sau khi chỉnh, restart bot để áp dụng thay đổi
 */

// ============================================
// ⚙️ BẬT/TẮT EVENT
// ============================================

export const EVENT_ENABLED = false; // 👈 true: bật event, false: tắt event

// ============================================
// ⚙️ TỈ LỆ DROP (%)
// ============================================

export const DROP_CHANCE = 1; // 👈 % xuất hiện khi hunt (0-100)
//    5 = 5% mỗi lần hunt có cơ hội ra event pet

// ============================================
// ⚙️ CẤU HÌNH EVENT PET
// ============================================

export const EVENT_PET = {
  // Thông tin cơ bản
  petId: "Fire_Dragon", // 👈 ID unique của pet
  name: "Fire Dragon <a:Fire_Dragon:1470256377350852863>", // 👈 Tên pet
  emoji: "<a:Fire_Dragon:1470256377350852863>", // 👈 Emoji hiển thị

  // Độ hiếm: common | uncommon | rare | epic | mythic | legendary | event
  rarity: "event", // 👈 Độ hiếm đặc biệt cho event

  // Stats cơ bản (LV 1)
  baseHp: 200, // 👈 HP gốc
  baseAtk: 70, // 👈 ATK gốc
  baseDef: 30, // 👈 DEF gốc

  // Skill đặc biệt (optional)
  skill: {
    name: "Spray Fire", // 👈 Tên skill
    description: "Bắn tia lửa gây 200% ATK damage",
    damage: 2.0, // 👈 Hệ số damage (1.5 = 150% ATK)
    cooldown: 5, // 👈 Cooldown (số turn)
  },

  // Bonus khi hoạt động
  bonus: {
    hunt: 10, // 👈 % bonus khi hunt
    battle: 15, // 👈 % bonus khi battle
  },
};



// ============================================
// 🛠️ HELPER FUNCTION - EXPORT CHO HUNT.JS
// ============================================

/**
 * Tạo event pet object để lưu vào database
 */
export function createEventPet() {
  return {
    petId: EVENT_PET.petId,
    name: EVENT_PET.name,
    emoji: EVENT_PET.emoji,
    type: EVENT_PET.rarity,
    level: 1,
    exp: 0,
    baseHp: EVENT_PET.baseHp,
    baseAtk: EVENT_PET.baseAtk,
    baseDef: EVENT_PET.baseDef,
    hp: Math.floor(EVENT_PET.baseHp * 1.2), // LV 1 boost
    atk: Math.floor(EVENT_PET.baseAtk * 1.2),
    def: Math.floor(EVENT_PET.baseDef * 1.2),
    skill: EVENT_PET.skill || { name: null, damage: 0, cooldown: 0 },
    bonus: EVENT_PET.bonus || { hunt: 0, battle: 0 },
    equipped: false,
    favorite: true, // Mặc định yêu thích để không bán nhầm
    isEvent: true, // Đánh dấu là event pet
    createdAt: new Date(),
  };
}

/**
 * Roll xem có được event pet không
 * @returns {boolean}
 */
export function rollEventPet() {
  if (!EVENT_ENABLED) return false;
  return Math.random() * 100 < DROP_CHANCE;
}


