/**
 * Pet Leveling System Utility
 */
import { petPool } from '../database/petPool.js';

export const MAX_LEVEL = 50;
export const XP_PER_BATTLE = 10;
export const STAT_GROWTH_PER_LEVEL = 0.2; // 20%

/**
 * Calculate XP needed to reach the NEXT level
 * Formula: 200 * 1.25^(level-1)
 * @param {Number} currentLevel 
 * @returns {Number}
 */
export function getExpNeeded(currentLevel) {
    if (currentLevel >= MAX_LEVEL) return Infinity;
    return Math.floor(200 * Math.pow(1.25, currentLevel - 1));
}

/**
 * Calculate current stat based on base stat and level
 * Formula: base + (base * 0.2 * (level - 1))
 * @param {Number} baseStat 
 * @param {Number} level 
 * @returns {Number}
 */
export function calculateStat(baseStat, level) {
    return Math.floor(baseStat * (1 + STAT_GROWTH_PER_LEVEL * (level - 1)));
}

/**
 * Add XP to a pet and handle potential level ups
 * @param {Object} pet - Pet object from userData.pets
 * @param {Number} amount - XP amount to add
 * @returns {Object} Result { leveledUp: Boolean, levelsGained: Number }
 */
export function addXPToPet(pet, amount) {
    if (pet.level >= MAX_LEVEL) return { leveledUp: false, levelsGained: 0 };

    // Initialize base stats if missing (Legacy support)
    if (pet.baseHp === undefined) {
        let foundBase = null;
        for (const rarity in petPool) {
            const p = petPool[rarity].find(p => p.petId === pet.petId);
            if (p) {
                foundBase = p;
                break;
            }
        }

        if (foundBase) {
            pet.baseHp = foundBase.hp;
            pet.baseAtk = foundBase.atk;
            pet.baseDef = foundBase.def;
        } else {
            // Fallback for custom/unknown pets
            pet.baseHp = pet.hp || 50;
            pet.baseAtk = pet.atk || 5;
            pet.baseDef = pet.def || 2;
        }
    }

    pet.exp += amount;
    let leveledUp = false;
    let levelsGained = 0;

    while (pet.level < MAX_LEVEL && pet.exp >= getExpNeeded(pet.level)) {
        pet.exp -= getExpNeeded(pet.level);
        pet.level++;
        levelsGained++;
        leveledUp = true;

        // Update stats
        pet.hp = calculateStat(pet.baseHp, pet.level);
        pet.atk = calculateStat(pet.baseAtk, pet.level);
        pet.def = calculateStat(pet.baseDef, pet.level);

        // Re-apply weapon stats if equipped
        if (pet.weapon) {
            pet.hp += (pet.weapon.hp || 0);
            pet.atk += (pet.weapon.atk || 0);
            pet.def += (pet.weapon.def || 0);
        }

        // Heal pet to full on level up
        pet.currentHp = pet.hp;
    }

    return { leveledUp, levelsGained };
}
