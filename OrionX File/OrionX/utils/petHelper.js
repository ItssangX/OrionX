import { petPool } from "../database/petPool.js";
import { EVENT_PET } from "../scripts/petevent.js";

/**
 * Normalizes rarity string to standard keys
 */
export function normalizeRarity(r) {
  if (!r) return "common";
  const low = r.toLowerCase();
  if (low === "normal") return "common";
  if (low === "legend") return "legendary";
  return low;
}

/**
 * Groups and sorts pets exactly like the Zoo command
 * @param {Array} pets - Raw userData.pets array
 * @returns {Array} List of pet groups { name, emoji, rarity, pets: [], count }
 */
export function getOrderedPetGroups(pets) {
  if (!pets || pets.length === 0) return [];

  const rarityOrder = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "mythic",
    "legendary",
    "event",
    "special",
  ];
  const petsByRarity = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    mythic: [],
    legendary: [],
    event: [],
    special: [],
  };

  // 1. Sort into rarity buckets
  pets.forEach((pet) => {
    const rarity = normalizeRarity(pet.type);
    if (petsByRarity[rarity]) {
      petsByRarity[rarity].push(pet);
    } else {
      petsByRarity.common.push(pet);
    }
  });

  const orderedGroups = [];

  // 2. Process buckets in order
  rarityOrder.forEach((rarity) => {
    const bucket = petsByRarity[rarity];
    if (bucket.length === 0) return;

    // 3. Group by petId or Name within bucket
    const groups = {};
    bucket.forEach((pet) => {
      const key = pet.petId || pet.name;
      if (!groups[key]) {
        // Với event pet, lấy emoji từ pet.emoji hoặc EVENT_PET.emoji
        let emoji = pet.emoji;

        if (!emoji && rarity === "event") {
          // Nếu event pet không có emoji, lấy từ EVENT_PET config
          emoji = EVENT_PET.emoji;
        } else if (!emoji && rarity !== "event") {
          // Nếu không có emoji và không phải event pet, tìm từ config
          const petIdLower = pet.petId ? pet.petId.toLowerCase().trim() : null;
          const config =
            petPool[rarity]?.find(
              (p) => petIdLower && p.petId.toLowerCase() === petIdLower,
            ) ||
            petPool[rarity]?.find(
              (p) => p.name.toLowerCase() === pet.name.toLowerCase(),
            );
          if (config?.emoji) emoji = config.emoji;
        }

        if (!emoji) emoji = "🐾";

        groups[key] = {
          name: pet.name,
          emoji: emoji,
          rarity: rarity,
          pets: [],
          count: 0,
        };
      }
      groups[key].pets.push(pet);
      groups[key].count++;
    });

    // 4. Flatten groups for this rarity
    Object.values(groups).forEach((group) => {
      orderedGroups.push(group);
    });
  });

  return orderedGroups;
}

/**
 * Checks if a specific pet (by instance) is in the user's battle team
 */
export function isPetInTeam(userData, pet) {
  if (!userData.team) return false;
  const petKey = `${pet.petId}_${pet.createdAt ? new Date(pet.createdAt).getTime() : 0}`;
  const { slot1, slot2, slot3 } = userData.team;
  return [slot1, slot2, slot3].some((s) => s && s.key === petKey);
}

/**
 * Robustly retrieves a pet's emoji, with fallback to default
 */
export function getPetEmoji(pet) {
  if (pet.emoji) return pet.emoji;
  const rarity = (pet.type || "common").toLowerCase();

  if (rarity === 'event') {
    return EVENT_PET.emoji || "🐾";
  }

  const config = petPool[rarity]?.find(
    (pd) => pd.petId === (pet.petId || pet.name.toLowerCase()),
  );
  return config?.emoji || "🐾";
}
