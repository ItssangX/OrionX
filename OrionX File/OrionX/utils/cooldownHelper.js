import { User } from '../database/models.js';
import { getCooldown, canBypassCooldown } from '../config/cooldownConfig.js';
import { formatCooldown } from '../config/cooldownConfig.js';

/**
 * Kiểm tra cooldown toàn cục cho user
 * @param {string} userId - ID của user
 * @param {string} commandName - Tên lệnh
 * @param {object} userObj - Discord user object (optional for bypass check)
 * @param {object} guild - Discord guild object (optional for bypass check)
 * @returns {object} { isOnCooldown: boolean, remainingTime: number, formattedTime: string }
 */
export async function checkGlobalCooldown(userId, commandName, userObj = null, guild = null) {
  try {
    // Kiểm tra bypass
    if (userObj && guild && canBypassCooldown(userObj, guild)) {
      return { isOnCooldown: false, remainingTime: 0, formattedTime: '' };
    }

    const cooldownSeconds = getCooldown(commandName);
    if (cooldownSeconds <= 0) {
      return { isOnCooldown: false, remainingTime: 0, formattedTime: '' };
    }

    const user = await User.findOne({ userId }).select('cooldowns').lean();
    if (!user) {
      return { isOnCooldown: false, remainingTime: 0, formattedTime: '' };
    }

    const now = new Date();
    const cooldownExpiry = user.cooldowns?.[commandName];

    if (!cooldownExpiry || cooldownExpiry <= now) {
      return { isOnCooldown: false, remainingTime: 0, formattedTime: '' };
    }

    const remainingMs = cooldownExpiry - now;
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    return {
      isOnCooldown: true,
      remainingTime: remainingSeconds,
      formattedTime: formatCooldown(remainingSeconds)
    };
  } catch (error) {
    console.error('Error checking global cooldown:', error);
    return { isOnCooldown: false, remainingTime: 0, formattedTime: '' };
  }
}

/**
 * Đặt cooldown toàn cục cho user
 * @param {string} userId - ID của user
 * @param {string} commandName - Tên lệnh
 * @returns {boolean} Thành công hay không
 */
export async function setGlobalCooldown(userId, commandName) {
  try {
    const cooldownSeconds = getCooldown(commandName);
    if (cooldownSeconds <= 0) return true;

    const expiryTime = new Date(Date.now() + cooldownSeconds * 1000);

    await User.updateOne(
      { userId },
      { $set: { [`cooldowns.${commandName}`]: expiryTime } }
    );

    return true;
  } catch (error) {
    console.error('Error setting global cooldown:', error);
    return false;
  }
}
