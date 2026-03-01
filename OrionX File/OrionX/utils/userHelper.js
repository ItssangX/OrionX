import fs from "fs";
import path from "path";
import logger from './logger.js';
import { User } from '../database/models.js';

/**
 * Tìm hoặc tạo user với username
 * @param {String} userId - Discord user ID
 * @param {String} username - Discord username
 * @returns {Promise<Document>} User document
 */
export async function findOrCreateUser(userId, username) {
  try {
    let user = await User.findOne({ userId });

    if (!user) {
      return null;
    }

    // Force update if username is missing, is a placeholder (User_), or is different from current Discord name
    const isPlaceholder = !user.username || user.username === 'undefined' || user.username.startsWith('User_');
    const isDifferent = username && user.username !== username;

    if (isPlaceholder || isDifferent) {
      const oldName = user.username;
      const newName = username || user.username || `User_${userId.slice(0, 8)}`;
      // Atomic update - no need to load/save full doc
      await User.updateOne({ userId }, { $set: { username: newName } });
      user.username = newName;
      if (isPlaceholder) {
        logger.info(`Fixed placeholder username: ${oldName} -> ${newName} (${userId})`);
      } else {
        logger.info(`Updated username: ${oldName} -> ${newName} (${userId})`);
      }
    }

    return user;
  } catch (error) {
    logger.error('Error in findOrCreateUser:', error);
    throw error;
  }
}

/**
 * Update username nếu bị thiếu
 * @param {Document} userData - User document from database
 * @param {String} username - New username
 * @returns {Promise<Document>} Updated user document
 */
export async function updateUsername(userData, username) {
  if (!userData.username || userData.username === 'undefined') {
    userData.username = username || `User_${userData.userId.slice(0, 8)}`;
    await userData.save();
  }
  return userData;
}

/**
 * Get user từ database với auto create
 * @param {Message} message - Discord message
 * @param {User} targetUser - Discord user (optional, default to message author)
 * @returns {Promise<Document>} User document
 */
export async function getUserData(message, targetUser = null) {
  const target = targetUser || message.author;
  return await findOrCreateUser(target.id, target.username);
}

/**
 * Lấy random user offline có pet equipped để làm đối thủ
 * @param {String} excludeUserId - User ID của người đang tìm đối thủ (để loại trừ)
 * @returns {Promise<Document|null>} Random user document hoặc null
 */
export async function getRandomOfflineUser(excludeUserId) {
  try {
    // Use aggregation with $sample for efficient random selection
    // Only load fields needed for battle, not the entire pets/weapons array
    const users = await User.aggregate([
      {
        $match: {
          userId: { $ne: excludeUserId },
          'pets.equipped': true
        }
      },
      { $sample: { size: 1 } },
      {
        $project: {
          userId: 1,
          username: 1,
          level: 1,
          hp: 1,
          atk: 1,
          def: 1,
          team: 1,
          pets: 1,
          weapons: 1,
          battleWinStreak: 1,
          totalBattleWins: 1
        }
      }
    ]);

    if (!users || users.length === 0) {
      logger.debug('Không tìm thấy user nào có pet equipped để làm đối thủ');
      return null;
    }

    const selectedUser = users[0];
    logger.debug(`🎲 Random opponent: ${selectedUser.username} (${selectedUser.userId})`);
    return selectedUser;

  } catch (error) {
    logger.error('Error in getRandomOfflineUser:', error);
    return null;
  }
}

/**
 * Lấy random user trong khoảng level tương đương (±5 level)
 * @param {String} excludeUserId - User ID của người đang tìm đối thủ
 * @param {Number} userLevel - Level của người tìm đối thủ
 * @returns {Promise<Document|null>} Random user document hoặc null
 */
export async function getRandomOpponentByLevel(excludeUserId, userLevel) {
  try {
    const minLevel = Math.max(1, userLevel - 5);
    const maxLevel = userLevel + 5;

    // Use aggregation with $sample for efficient random selection
    const users = await User.aggregate([
      {
        $match: {
          userId: { $ne: excludeUserId },
          'pets.equipped': true,
          level: { $gte: minLevel, $lte: maxLevel }
        }
      },
      { $sample: { size: 1 } },
      {
        $project: {
          userId: 1,
          username: 1,
          level: 1,
          hp: 1,
          atk: 1,
          def: 1,
          team: 1,
          pets: 1,
          weapons: 1,
          battleWinStreak: 1,
          totalBattleWins: 1
        }
      }
    ]);

    if (!users || users.length === 0) {
      // Nếu không tìm thấy, fallback về random thường
      logger.debug('Không tìm thấy opponent cùng level, tìm random...');
      return await getRandomOfflineUser(excludeUserId);
    }

    const selectedUser = users[0];
    logger.debug(`🎲 Random opponent (Level ${selectedUser.level}): ${selectedUser.username}`);
    return selectedUser;

  } catch (error) {
    logger.error('Error in getRandomOpponentByLevel:', error);
    return null;
  }
}

/**
 * Lấy top users có pet mạnh nhất (theo HP + ATK + DEF)
 * @param {Number} limit - Số lượng top users cần lấy
 * @returns {Promise<Array>} Array of top users
 */
export async function getTopPowerUsers(limit = 10) {
  try {
    const users = await User.find({ 'pets.equipped': true });

    // Tính tổng stats của pet equipped cho mỗi user
    const usersWithPower = users.map(user => {
      const equippedPet = user.pets.find(p => p.equipped);
      const totalPower = equippedPet ?
        (equippedPet.hp + equippedPet.atk + equippedPet.def) : 0;

      return {
        ...user.toObject(),
        totalPower,
        equippedPet
      };
    });

    // Sort theo totalPower giảm dần
    usersWithPower.sort((a, b) => b.totalPower - a.totalPower);

    return usersWithPower.slice(0, limit);

  } catch (error) {
    logger.error('Error in getTopPowerUsers:', error);
    return [];
  }
}

export default {
  findOrCreateUser,
  updateUsername,
  getUserData,
  getRandomOfflineUser,
  getRandomOpponentByLevel,
  getTopPowerUsers
};

// ====== FILE DATABASE ======
const DATA_DIR = path.resolve("data");
const USER_FILE = path.join(DATA_DIR, "users.json");

// ====== INIT ======
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

if (!fs.existsSync(USER_FILE)) {
  fs.writeFileSync(USER_FILE, JSON.stringify({}, null, 2));
}

// ====== HELPERS ======
function loadUsers() {
  return JSON.parse(fs.readFileSync(USER_FILE, "utf8"));
}

function saveUsers(data) {
  fs.writeFileSync(USER_FILE, JSON.stringify(data, null, 2));
}

// ====== USER CORE ======
export function getUser(userId) {
  const users = loadUsers();

  if (!users[userId]) {
    users[userId] = {
      id: userId,
      level: 1,
      xp: 0,
      xpNeed: 100,
      coin: 100,
      hp: 100,
      maxHp: 100,
      wins: 0,
      losses: 0,
      createdAt: Date.now()
    };

    saveUsers(users);
  }

  return users[userId];
}

export function saveUser(user) {
  const users = loadUsers();
  users[user.id] = user;
  saveUsers(users);
}

// ====== XP / LEVEL ======
export function addXP(userId, amount) {
  const user = getUser(userId);
  user.xp += amount;

  let leveledUp = false;

  while (user.xp >= user.xpNeed) {
    user.xp -= user.xpNeed;
    user.level++;
    user.xpNeed = Math.floor(user.xpNeed * 1.3);
    user.maxHp += 10;
    user.hp = user.maxHp;
    leveledUp = true;
  }

  saveUser(user);
  return { user, leveledUp };
}

// ====== COIN ======
export function addCoin(userId, amount) {
  const user = getUser(userId);
  user.coin += amount;
  saveUser(user);
  return user.coin;
}

export function removeCoin(userId, amount) {
  const user = getUser(userId);
  user.coin = Math.max(0, user.coin - amount);
  saveUser(user);
  return user.coin;
}

// ====== BATTLE ======
export function damageUser(userId, dmg) {
  const user = getUser(userId);
  user.hp -= dmg;

  if (user.hp < 0) user.hp = 0;

  saveUser(user);
  return user.hp;
}

export function healUser(userId, amount) {
  const user = getUser(userId);
  user.hp = Math.min(user.maxHp, user.hp + amount);
  saveUser(user);
  return user.hp;
}

export function recordWin(userId) {
  const user = getUser(userId);
  user.wins++;
  saveUser(user);
}

export function recordLoss(userId) {
  const user = getUser(userId);
  user.losses++;
  saveUser(user);
}

// ====== RESET (ADMIN) ======
export function resetUser(userId) {
  const users = loadUsers();
  delete users[userId];
  saveUsers(users);
}