import { User } from "../database/models.js";
import { EmbedBuilder } from "discord.js";
import logger from "./logger.js";

// ==========================================
// TÍNH XP CẦN ĐỂ LÊN LEVEL TIẾP THEO
// ==========================================
export function getXPForLevel(level) {
  return 200 * Math.pow(2, level - 1);
}

// ==========================================
// TÍNH TỔNG XP CẦN ĐẾN 1 LEVEL CỤ THỂ
// ==========================================
export function getTotalXPForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXPForLevel(i);
  }
  return total;
}

// ==========================================
// THÊM XP CHO USER
// ==========================================
export async function addXP(userId, username, amount, channel) {
  try {
    // 1. Fetch user data (lean) to calculate changes locally
    const userData = await User.findOne({ userId })
      .select("userId level exp money hp atk def buffs")
      .lean();

    if (!userData) return { leveledUp: false };

    let currentLevel = userData.level || 1;
    let currentExp = userData.exp || 0;
    let currentMoney = userData.money || 0;

    // ====== TÍNH BUFF XP MULTIPLIER ======
    let finalAmount = amount;
    if (
      userData.buffs?.xpMultiplier?.expireAt &&
      new Date() < new Date(userData.buffs.xpMultiplier.expireAt)
    ) {
      finalAmount = Math.floor(
        amount * (userData.buffs.xpMultiplier.value || 1),
      );
    }

    // Add XP
    currentExp += finalAmount;

    // Level up check
    let leveledUp = false;
    let levelsGained = 0;
    const oldLevel = currentLevel;

    while (true) {
      const xpNeeded = getXPForLevel(currentLevel);
      if (currentExp >= xpNeeded) {
        currentExp -= xpNeeded;
        currentLevel += 1;
        levelsGained++;
        leveledUp = true;

        // Rewards
        currentMoney += 50000;
      } else {
        break;
      }
    }

    // 2. Atomic update using findOneAndUpdate to avoid parallel save issues
    const update = {
      $set: {
        level: currentLevel,
        exp: currentExp,
        money: currentMoney,
      },
    };

    const finalUser = await User.findOneAndUpdate({ userId }, update, {
      returnDocument: "after",
      select: "userId level exp money hp atk def",
    });

    if (leveledUp && channel && finalUser) {
      await sendLevelUpMessage(channel, finalUser, oldLevel, levelsGained);
    }

    return {
      leveledUp,
      newLevel: currentLevel,
      oldLevel,
      levelsGained,
    };
  } catch (error) {
    logger.error("Error adding XP:", error);
    return { leveledUp: false };
  }
}

// ==========================================
// GỬI THÔNG BÁO LEVEL UP
// ==========================================
async function sendLevelUpMessage(channel, userData, oldLevel, levelsGained) {
  try {
    const newLevel = userData.level;
    const xpNeeded = getXPForLevel(newLevel);
    const reward = 50000;

    const embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(
        "<a:2giveaway:1446775157036417125> <:star:1476463431044431905> **Level Up!** <:star:1476463431044431905> <a:2giveaway:1446775157036417125>",
      )
      .setDescription(
        `### <a:2giveaway:1446775157036417125> Chúc Mừng <@${userData.userId}>!\n\n` +
        `> <:star:1476463431044431905> **Level:** \`${oldLevel}\` ➜ **\`${newLevel}\`**\n` +
        `> <a:slowarrow:1446769171433263255> **XP hiện tại:** \`${userData.exp}\` / \`${xpNeeded}\`\n\n` +
        `### <a:gift:1446769608580399154> **Phần Thưởng** <a:gift:1446769608580399154> \n` +
        `> <a:pixelcoin:1456194056798339104> **Coin:** \`+${reward}$\`\n`,
      )
      .setThumbnail("https://cdn.discordapp.com/emojis/1234567890.gif")
      .setFooter({ text: `Level ${newLevel} - Keep grinding!` })
      .setTimestamp();

    if (levelsGained > 1) {
      embed.addFields({
        name: "🔥 **Combo Level Up!**",
        value: `> Bạn đã lên **\`${levelsGained}\`** level cùng lúc!\n> **Tổng thưởng:** \`${levelsGained * 50000}$\``,
      });
    }

    await channel.send({ embeds: [embed] }).catch(() => { });
  } catch (error) {
    console.error("Error sending level up message:", error);
  }
}

// ==========================================
// LẤY PROGRESS BAR XP
// ==========================================
export function getXPProgressBar(currentXP, neededXP, length = 10) {
  const percentage = Math.min(currentXP / neededXP, 1);
  const filled = Math.round(length * percentage);
  const empty = length - filled;

  const filledBar = "█".repeat(filled);
  const emptyBar = "░".repeat(empty);

  return `${filledBar}${emptyBar}`;
}

// ==========================================
// LẤY THÔNG TIN LEVEL CỦA USER
// ==========================================
export async function getUserLevelInfo(userId) {
  try {
    const userData = await User.findOne({ userId }).select("level exp").lean();

    if (!userData) {
      return null;
    }

    const currentLevel = userData.level || 1;
    const currentXP = userData.exp || 0;
    const neededXP = getXPForLevel(currentLevel);
    const totalXP = getTotalXPForLevel(currentLevel) + currentXP;
    const progressBar = getXPProgressBar(currentXP, neededXP);
    const percentage = ((currentXP / neededXP) * 100).toFixed(1);

    return {
      level: currentLevel,
      currentXP,
      neededXP,
      totalXP,
      progressBar,
      percentage,
    };
  } catch (error) {
    console.error("Error getting user level info:", error);
    return null;
  }
}

// ==========================================
// TÍNH LEVEL TỪ TỔNG XP
// ==========================================
export function getLevelFromTotalXP(totalXP) {
  let level = 1;
  let xpUsed = 0;

  while (true) {
    const xpNeeded = getXPForLevel(level);
    if (xpUsed + xpNeeded > totalXP) {
      break;
    }
    xpUsed += xpNeeded;
    level++;
  }

  return {
    level,
    remainingXP: totalXP - xpUsed,
    xpNeeded: getXPForLevel(level),
  };
}
