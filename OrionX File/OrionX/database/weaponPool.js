export const weaponPool = {
    common: [
        { id: "woodensword", name: "Wooden Sword", emoji: "🗡️", atk: 8, def: 0, hp: 0, crit: 5, effect: null },
        { id: "woodenshield", name: "Wooden Shield", emoji: "🛡️", atk: 0, def: 8, hp: 30, crit: 0, effect: { type: "shield", value: 5 } }, // Giảm 5% dmg
        { id: "stick", name: "Stick", emoji: "🪵", atk: 5, def: 2, hp: 10, crit: 5, effect: null },
        { id: "rock", name: "Rock", emoji: "🪨", atk: 4, def: 4, hp: 15, crit: 0, effect: { type: "stun", chance: 5 } }, // 5% choáng
        { id: "sling", name: "Sling", emoji: "🪃", atk: 7, def: 0, hp: 0, crit: 10, effect: null }
    ],
    uncommon: [
        { id: "ironsword", name: "Iron Sword", emoji: "⚔️", atk: 20, def: 5, hp: 0, crit: 10, effect: { type: "lifesteal", value: 10 } }, // Hút 10% máu
        { id: "ironshield", name: "Iron Shield", emoji: "🛡️", atk: 0, def: 25, hp: 100, crit: 0, effect: { type: "shield", value: 10 } }, // Giảm 10% dmg
        { id: "bow", name: "Hunter Bow", emoji: "🏹", atk: 22, def: 0, hp: 0, crit: 20, effect: { type: "crit_boost", value: 15 } }, // Tăng 15% crit rate
        { id: "dagger", name: "Assassin Dagger", emoji: "🗡️", atk: 25, def: 0, hp: 0, crit: 25, effect: { type: "execute", value: 1.2 } }, // +20% dmg nếu địch < 30% HP
        { id: "wand", name: "Magic Wand", emoji: "🪄", atk: 18, def: 5, hp: 30, crit: 5, effect: { type: "magic_pierce", value: 10 } } // Bỏ qua 10% Giáp
    ],
    rare: [
        { id: "steelkatana", name: "Steel Katana", emoji: "🗡️", atk: 45, def: 5, hp: 0, crit: 15, effect: { type: "lifesteal", value: 15 } },
        { id: "spikedshield", name: "Spiked Shield", emoji: "🛡️", atk: 15, def: 40, hp: 200, crit: 0, effect: { type: "reflect", value: 20 } }, // Phản 20% dmg
        { id: "warhammer", name: "Warhammer", emoji: "🔨", atk: 55, def: 0, hp: 50, crit: 5, effect: { type: "stun", chance: 15 } }, // 15% Stun
        { id: "crossbow", name: "Heavy Crossbow", emoji: "🏹", atk: 50, def: 0, hp: 0, crit: 25, effect: { type: "crit_boost", value: 25 } },
        { id: "staff", name: "Mage Staff", emoji: "🔮", atk: 40, def: 15, hp: 80, crit: 5, effect: { type: "heal_turn", value: 10 } } // Hồi 10 HP/turn
    ],
    epic: [
        { id: "flamesword", name: "Flame Sword", emoji: "🔥", atk: 80, def: 10, hp: 50, crit: 20, effect: { type: "burn", value: 20, duration: 3 } }, // Đốt 20dmg/3turn
        { id: "frostshield", name: "Frost Shield", emoji: "❄️", atk: 20, def: 60, hp: 300, crit: 0, effect: { type: "freeze", chance: 20 } }, // 20% Đóng băng (mất lượt)
        { id: "thunderspear", name: "Thunder Spear", emoji: "⚡", atk: 85, def: 10, hp: 0, crit: 30, effect: { type: "stun", chance: 20 } },
        { id: "venomdagger", name: "Venom Dagger", emoji: "🧪", atk: 75, def: 5, hp: 50, crit: 35, effect: { type: "poison", value: 15, duration: 3 } },
        { id: "holystaff", name: "Holy Staff", emoji: "✨", atk: 60, def: 40, hp: 200, crit: 10, effect: { type: "lifesteal", value: 25 } }
    ],
    mythic: [
        { id: "dragonblade", name: "Dragon Blade", emoji: "🐉", atk: 150, def: 40, hp: 200, crit: 25, effect: { type: "execute", value: 2.0 } }, // x2 dmg nếu địch < 30% HP
        { id: "voidshield", name: "Void Shield", emoji: "🌑", atk: 50, def: 120, hp: 600, crit: 0, effect: { type: "shield", value: 30 } }, // Giảm 30% Dmg
        { id: "phoenixbow", name: "Phoenix Bow", emoji: "🐦", atk: 140, def: 30, hp: 100, crit: 40, effect: { type: "revive", chance: 10 } }, // 10% Hồi sinh (ảo :v) -> Đổi thành: Hồi 10% HP khi giết địch
        { id: "titanhammer", name: "Titan Hammer", emoji: "🔨", atk: 170, def: 60, hp: 150, crit: 15, effect: { type: "stun", chance: 30 } },
        { id: "celestialwand", name: "Celestial Wand", emoji: "🌟", atk: 130, def: 80, hp: 400, crit: 15, effect: { type: "heal_turn", value: 50 } }
    ],
    legendary: [
        { id: "excalibur", name: "Excalibur", emoji: "⚔️", atk: 300, def: 150, hp: 800, crit: 30, effect: { type: "lifesteal", value: 50 } }, // Hút 50%
        { id: "aegis", name: "Aegis", emoji: "🛡️", atk: 100, def: 300, hp: 2000, crit: 0, effect: { type: "reflect", value: 50 } }, // Phản 50%
        { id: "mjolnir", name: "Mjolnir", emoji: "⚡", atk: 320, def: 100, hp: 600, crit: 35, effect: { type: "stun", chance: 40 } },
        { id: "gungnir", name: "Gungnir", emoji: "🔱", atk: 310, def: 110, hp: 700, crit: 40, effect: { type: "ignore_def", value: 100 } }, // Xuyên 100% giáp
        { id: "souleater", name: "Soul Eater", emoji: "👻", atk: 350, def: 80, hp: 500, crit: 50, effect: { type: "vampire", value: 100 } } // Hồi 100% dmg thành máu khi giết
    ]
};
