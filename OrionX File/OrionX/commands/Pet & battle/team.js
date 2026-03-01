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
import { getPetSkill } from "../../utils/battleGifs.js";
import { createOwnerCollector } from "../../utils/commandHelper.js";
import { getPetEmoji } from "../../utils/petHelper.js";

const RARITY_EMOJI = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  epic: "🟣",
  mythic: "🟠",
  legendary: "🟡",
  event: "🎊",
  special: "✨",
};

export default {
  name: "team",
  aliases: ["tm", "myteam", "mypet"],

  async execute(message, args) {
    try {
      const target = message.mentions.users.first() || message.author;
      const userData = await findOrCreateUser(target.id, target.username);

      const team = userData.team || { slot1: null, slot2: null, slot3: null };

      const teamContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ⚔️ ${target.username.toUpperCase()} Team ⚔️`,
          ),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <:fire_:1476463412723716257> **Battle Streak:** \`${userData.battleWinStreak || 0}\` | 🏆 **Best:** \`${userData.maxBattleWinStreak || 0}\``,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        );

      let slotsText = "";
      let totalPower = 0;
      let activePetCount = 0;

      for (let i = 1; i <= 3; i++) {
        const slotKey = `slot${i}`;
        const slot = team[slotKey];

        if (!slot) {
          slotsText += `### 📍 Slot ${i}: \`Trống\`\n> *Dùng \`xequip <id> ${i}\`*\n\n`;
          continue;
        }

        const pet = userData.pets.find(
          (p) => `${p.petId}_${p.createdAt.getTime()}` === slot.key,
        );

        if (!pet) {
          slotsText += `### 📍 Slot ${i}: ❌ Lỗi Pet\n> *Vui lòng equip lại*\n\n`;
          continue;
        }

        activePetCount++;
        const rarity = pet.type.toLowerCase();

        // FIXED: Use helper function provided by user request
        const emoji = getPetEmoji(pet);

        totalPower += pet.hp + pet.atk * 2 + pet.def * 1.5;
        const skill = getPetSkill(pet.petId);

        slotsText += `### 📍 Slot ${i}: ${emoji} ${pet.name} ${RARITY_EMOJI[rarity] || ""}\n`;

        if (pet.weapon && pet.weapon.id) {
          const wEmoji = pet.weapon.emoji || "🗡️";
          const wName = pet.weapon.name || "Unknown Weapon";
          slotsText += `> 🗡️ **Wp:** ${wEmoji} ${wName}\n`;
        }

        slotsText +=
          `> **Lv.${pet.level}** | ${skill.name} (x${skill.damage})\n` +
          `> ❤️ \`${pet.hp}\` | ⚔️ \`${pet.atk}\` | 🛡️ \`${pet.def}\` | 💥 \`${pet.crit || 5}%\`\n\n`;
      }

      if (activePetCount === 0) {
        slotsText = `### ⚠️ Chưa có pet nào!\n> Hãy dùng lệnh \`xequip\` để trang bị pet vào team.\n`;
      }

      teamContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(slotsText),
      );

      if (totalPower > 0) {
        teamContainer.addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        );
        teamContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**<:Battle:1470101035392565299> Tổng Sức Mạnh Team:** \`${Math.round(totalPower)}\``,
          ),
        );
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("team_battle_btn")
          .setLabel("⚔️ Battle")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("team_equip_btn")
          .setLabel("🔄 Sửa Team")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("team_zoo_btn")
          .setLabel("🐾 Xem Pet")
          .setStyle(ButtonStyle.Secondary),
      );

      teamContainer.addActionRowComponents(row);

      const teamMsg = await message.reply({
        components: [teamContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      // Interaction handler
      const collector = createOwnerCollector(teamMsg, message.author.id, {
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "team_battle_btn") {
          await i.reply({
            content: "⚔️ Để bắt đầu trận đấu, hãy dùng lệnh `xbattle` [user]!",
            flags: [MessageFlags.Ephemeral],
          });
        } else if (i.customId === "team_equip_btn") {
          await i.reply({
            content:
              "🔄 Để sửa đội hình, hãy dùng lệnh `xequip <id> [slot]` hoặc `xunequip [slot]`!",
            flags: [MessageFlags.Ephemeral],
          });
        } else if (i.customId === "team_zoo_btn") {
          await i.reply({
            content:
              "🐾 Để xem danh sách pet, hãy dùng lệnh `xpets` hoặc `xzoo`!",
            flags: [MessageFlags.Ephemeral],
          });
        }
      });
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi team:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể hiển thị team.",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
