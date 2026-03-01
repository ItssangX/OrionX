import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { findOrCreateUser } from "../../utils/userHelper.js";
import { User } from "../../database/models.js";
import { petPool } from "../../database/petPool.js";
import { calculateStat } from "../../utils/petLevelSystem.js";
import { getOrderedPetGroups } from "../../utils/petHelper.js";

const COIN_UNIT = 10000;
const PETS_PER_UNIT = 10; // Reduced from 25 → 10 (auto hunt is less efficient than manual hunt)
const TIME_PER_UNIT_MS = 10 * 60000; // 30 minutes
const MIN_COIN = 10000;

/**
 * Auto Hunt rarity roll - 10% reduced rates compared to manual hunt
 * Manual: special 0.05%, mythic 0.05%, legendary 0.05%, epic 2%, rare 8%, uncommon 25%, common 64.85%
 * Auto:   special 0.045%, mythic 0.045%, legendary 0.045%, epic 1.8%, rare 7.2%, uncommon 22.5%, common 68.365%
 */
function rollAutoHuntRarity() {
  const r = Math.random() * 100;
  if (r < 0.045) return "special"; // 0.045% (was 0.05%)
  if (r < 0.09) return "mythic"; // 0.045% (was 0.05%)
  if (r < 0.135) return "legendary"; // 0.045% (was 0.05%)
  if (r < 1.935) return "epic"; // 1.8% (was 2%)
  if (r < 9.135) return "rare"; // 7.2% (was 8%)
  if (r < 31.635) return "uncommon"; // 22.5% (was 25%)
  return "common"; // 68.365% (was 64.85%)
}

/**
 * Get max coin limit based on user level
 * Lv 1-2: 1M, Lv 3-4: 2M, Lv 5-6: 3M, Lv 7-8: 4M, Lv 9+: 5M
 */
function getMaxCoinByLevel(level) {
  if (level <= 2) return 1000000; // 1M
  if (level <= 4) return 2000000; // 2M
  if (level <= 6) return 3000000; // 3M
  if (level <= 8) return 4000000; // 4M
  return 5000000; // 5M (max)
}

/**
 * Helper to generate a progress bar
 */
function createProgressBar(current, total, length = 15) {
  const percent = Math.min(1, Math.max(0, current / total));
  const filledLength = Math.round(length * percent);
  const emptyLength = length - filledLength;
  return `[\`${"■".repeat(filledLength)}${"□".repeat(emptyLength)}\`] **${(percent * 100).toFixed(1)}%**`;
}

/**
 * Helper to create a pet (copied from hunt.js for consistency)
 */
function createPet(base, rarity) {
  const level = 1;
  return {
    petId: base.petId,
    name: base.name,
    emoji: base.emoji || "🐾",
    type: rarity,
    level: level,
    exp: 0,
    baseHp: base.hp,
    baseAtk: base.atk,
    baseDef: base.def,
    hp: Math.floor(base.hp * 1.2), // LV 1 starting boost
    atk: Math.floor(base.atk * 1.2),
    def: Math.floor(base.def * 1.2),
    equipped: false,
    createdAt: new Date(),
  };
}

function buildAutoHuntResultChunks(pets) {
  const orderedGroups = getOrderedPetGroups(pets);
  const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  const toSuperscript = (num) => {
    return num
      .toString()
      .split("")
      .map((d) => superscripts[parseInt(d)])
      .join("");
  };

  const rarityConfig = [
    { key: "common", short: "C", emoji: "⚪" },
    { key: "uncommon", short: "U", emoji: "🟢" },
    { key: "rare", short: "R", emoji: "🔵" },
    { key: "epic", short: "E", emoji: "🟣" },
    { key: "mythic", short: "M", emoji: "🟠" },
    { key: "legendary", short: "L", emoji: "🟡" },
    { key: "event", short: "EV", emoji: "🎊" },
    { key: "special", short: "S", emoji: "✨" },
  ];

  let header = "## 🐾 Pet vừa săn được\n";
  let chunks = [];
  let currentChunk = header;
  let globalIndex = 1;
  let hasPets = orderedGroups.length > 0;
  const stats = {};

  rarityConfig.forEach((config) => {
    const groupsInRarity = orderedGroups.filter((g) => g.rarity === config.key);
    if (groupsInRarity.length === 0) return;

    const totalInRarity = groupsInRarity.reduce((sum, g) => sum + g.count, 0);
    stats[config.short] = totalInRarity;

    let rarityPrefix = `- **${config.emoji} ${config.short}. **   `;
    let currentLine = rarityPrefix;

    groupsInRarity.forEach((group) => {
      const pIdx = globalIndex++;
      const sup = group.count > 1 ? toSuperscript(group.count) : "";
      const petStr = `${pIdx}. ${group.emoji} **${group.name}**\u2009${sup}`;

      if ((currentLine + petStr).length > 1800) {
        if ((currentChunk + currentLine).length > 1900) {
          chunks.push(currentChunk);
          currentChunk = currentLine + "\n";
        } else {
          currentChunk += currentLine + "\n";
        }
        currentLine = "    " + petStr + "  ";
      } else {
        currentLine += petStr + "  ";
      }
    });

    if ((currentChunk + currentLine).length > 1900) {
      chunks.push(currentChunk);
      currentChunk = currentLine + "\n";
    } else {
      currentChunk += currentLine + "\n";
    }
  });

  if (!hasPets) {
    currentChunk += "*(Không có pet nào được tìm thấy.)*";
  } else {
    const statsStr = `**${Object.entries(stats)
      .map(([k, v]) => `${k}-${v}`)
      .join(", ")}**`;

    if ((currentChunk + statsStr).length > 1900) {
      chunks.push(currentChunk);
      currentChunk = statsStr;
    } else {
      currentChunk += statsStr;
    }
  }

  chunks.push(currentChunk);
  return chunks;
}

export default {
  name: "autohunt",
  aliases: ["ah"],
  description: "Thuê bot đi săn pet tự động",

  async execute(message, args) {
    try {
      const user = await findOrCreateUser(
        message.author.id,
        message.author.username,
      );
      const now = new Date();

      // CASE 1: Currently Hunting
      if (user.autoHunt?.isActive) {
        const endTime = new Date(user.autoHunt.endTime);
        const startTime = new Date(user.autoHunt.startTime);

        if (now < endTime) {
          // Still hunting - show progress
          const totalDuration = endTime - startTime;
          const elapsed = now - startTime;
          const remaining = endTime - now;

          const hours = Math.floor(remaining / 3600000);
          const minutes = Math.floor((remaining % 3600000) / 60000);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## <a:clock:1446769163669602335> Bot Đang Đi Săn... <:botgradient_:1476463355781972091>`,
              ),
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `> **Trạng thái:** Đang lùng sục trong rừng...\n` +
                  `> **Thời gian còn lại:** \`${hours} giờ ${minutes} phút\`\n` +
                  `> **Dự kiến thu hoạch:** \`${user.autoHunt.petCount} pet\`\n\n` +
                  `${createProgressBar(elapsed, totalDuration)}`,
              ),
            );

          return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });
        } else {
          // Finished - handle claim
          const petCount = user.autoHunt.petCount;
          const generatedPets = [];

          for (let i = 0; i < petCount; i++) {
            const rarity = rollAutoHuntRarity();
            const pool = petPool[rarity];
            if (!pool?.length) continue;
            const basePet = pool[Math.floor(Math.random() * pool.length)];
            generatedPets.push(createPet(basePet, rarity));
          }

          if (!user.pets) user.pets = [];
          user.pets.push(...generatedPets);

          // Reset autoHunt
          user.autoHunt.isActive = false;
          user.markModified("autoHunt");
          user.markModified("pets");
          await user.save();

          const resultChunks = buildAutoHuntResultChunks(generatedPets);

          const claimContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## <:greentick_:1476463390426927114> Đã Hoàn Thành Auto Hunt! <:botgradient_:1476463355781972091>`,
              ),
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `- Bot đã hoàn thành chuyến đi săn dài ngày.\n` +
                  `> - Tổng cộng thu được: **${generatedPets.length} pet**\n` +
                  `> - Tất cả đã được chuyển vào kho thú của bạn (` +
                  "`xzoo`" +
                  `).`,
              ),
            );

          if (resultChunks.length > 0) {
            claimContainer.addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small),
            );
            claimContainer.addTextDisplayComponents(
              new TextDisplayBuilder().setContent(resultChunks[0]),
            );
          }

          await message.reply({
            components: [claimContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          for (let i = 1; i < resultChunks.length; i++) {
            await message.channel.send(resultChunks[i]);
          }
          return;
        }
      }

      // CASE 2: Start new Hunt
      const userLevel = user.level || 1;
      const MAX_COIN = getMaxCoinByLevel(userLevel);

      let amountStr = args[0]?.toLowerCase();
      let amount;

      if (amountStr === "all") {
        amount = Math.min(user.money, MAX_COIN);
      } else {
        amount = parseInt(amountStr);
      }

      if (isNaN(amount) || amount < MIN_COIN || amount > MAX_COIN) {
        const guideContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 🛠️ Auto Hunt SYS <:botgradient_:1476463355781972091>`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Cách dùng:** ` +
                "`xautohunt <số tiền | all>`" +
                `\n` +
                `- Level của bạn: **Lv.${userLevel}**\n` +
                `- Giới hạn: \`${MIN_COIN.toLocaleString()}\` đến \`${MAX_COIN.toLocaleString()}\` coins\n` +
                `- Hiệu suất: \`10,000\` coin = \`10 pet\` = \`30 phút\`\n` +
                `- ⚠️ Tỉ lệ rarity giảm 10% so với hunt thủ công\n\n` +
                `**Giới hạn theo level:**\n` +
                `- Lv 1-2:` +
                " `1,000,000` coins " +
                `\n` +
                `- Lv 3-4:` +
                " `2,000,000` coins " +
                `\n` +
                `- Lv 5-6:` +
                " `3,000,000` coins " +
                `\n` +
                `- Lv 7-8: ` +
                "`4,000,000` coins " +
                `\n` +
                `- Lv 9+: ` +
                "`5,000,000` coins (max)",
            ),
          );
        return message.reply({
          components: [guideContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (user.money < amount) {
        return message.reply(
          `> <a:no:1455096623804715080> Bạn không có đủ **${amount.toLocaleString()}** coins!`,
        );
      }

      // Calculate logic
      const ratio = amount / COIN_UNIT;
      const petCount = Math.floor(ratio * PETS_PER_UNIT);
      const durationMs = Math.floor(ratio * TIME_PER_UNIT_MS);
      const endTime = new Date(now.getTime() + durationMs);
      const hours = (durationMs / 3600000).toFixed(1);

      // Save user state
      user.money -= amount;
      user.autoHunt = {
        isActive: true,
        startTime: now,
        endTime: endTime,
        petCount: petCount,
        amountPaid: amount,
      };

      await user.save();

      const startContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <:greentick_:1476463390426927114> THUÊ BOT THÀNH CÔNG! <:botgradient_:1476463355781972091>`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <a:dollar2:1476448466203971655> **Thanh toán:** \`${amount.toLocaleString()}\` coins\n` +
              `> <a:clock:1446769163669602335> **Thời gian săn:** \`${hours} giờ\`\n` +
              `> 🐾 **Số pet dự kiến:** \`${petCount} pet\`\n\n` +
              `> - Bot sẽ đi săn lùng sục khắp nơi. Bạn có thể dùng lại lệnh ` +
              "`xah`" +
              ` để kiểm tra tiến độ.`,
          ),
        );

      return message.reply({
        components: [startContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("AutoHunt Error:", error);
      message.reply(
        "> <a:no:1455096623804715080> Đã xảy ra lỗi khi thực hiện Auto Hunt.",
      );
    }
  },
};
