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
import { petPool } from "../../database/petPool.js";
import { rollRarity } from "../../utils/petRoll.js";
import { updateQuestProgress } from "../../utils/questHelper.js";
import { calculateStat } from "../../utils/petLevelSystem.js";
import { createOwnerCollector, reply } from "../../utils/commandHelper.js";
import { updateChecklist } from "../../utils/checklistHelper.js";
// Event Pet System
import {
  EVENT_ENABLED,
  rollEventPet,
  createEventPet,
} from "../../scripts/petevent.js";

const RARITY_EMOJI = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  epic: "🟣",
  mythic: "🟠",
  legendary: "🟡",
  event: "🌟",
  special: "✨",
};

const SELL_PRICES = {
  common: 1000,
  uncommon: 2000,
  rare: 5000,
  epic: 10000,
  mythic: 20000,
  legendary: 50000,
  special: 100000,
};

function createPet(base, rarity) {
  const level = 1;
  const hp = calculateStat(base.hp, level);
  const atk = calculateStat(base.atk, level);
  const def = calculateStat(base.def, level);

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
    hp: hp,
    atk: atk,
    def: def,
    equipped: false,
    createdAt: new Date(),
  };
}

export default {
  name: "hunt",
  aliases: ["h"],
  description: "Đi săn và nhận 5 pet ngẫu nhiên",

  async execute(message) {
    try {
      const user = await findOrCreateUser(
        message.author.id,
        message.author.username,
      );
      if (!user.pets) user.pets = [];

      const huntedPets = [];
      let gotEventPet = false;
      let eventPetData = null;

      // Check event pet trước
      if (EVENT_ENABLED && rollEventPet()) {
        eventPetData = createEventPet();
        user.pets.push(eventPetData);
        huntedPets.push(eventPetData);
        gotEventPet = true;
      }

      // Hunt 5 pet thường (hoặc 4 nếu đã có event pet)
      const normalPetCount = gotEventPet ? 4 : 5;
      for (let i = 0; i < normalPetCount; i++) {
        const rarity = rollRarity();
        const pool = petPool[rarity];
        if (!pool?.length) continue;
        const basePet = pool[Math.floor(Math.random() * pool.length)];
        const pet = createPet(basePet, rarity);
        user.pets.push(pet);
        huntedPets.push(pet);
      }

      const huntCost = 2000;
      if (user.money < huntCost) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <a:no:1455096623804715080> Bạn cần ít nhất **${huntCost.toLocaleString()}** <:Xcoin:1433810075927183441> để đi săn!`,
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
          failIfNotExists: false,
        });
      }

      user.money -= huntCost;
      await user.save();
      await updateQuestProgress(user.userId, "hunt_pets", 1);
      await updateChecklist(user.userId, "hunt");

      const huntContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 🎯 Hunt - ${user.username} 🎯`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        );

      // Hiển thị thông báo event pet đặc biệt
      if (gotEventPet && eventPetData) {
        huntContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🎊 Event Pet! 🎊 \n` +
              `<a:2giveaway:1446775157036417125> **Chúc Mừng!** Bạn đã săn được **${eventPetData.name}** ${eventPetData.emoji}!\n` +
              `> ❤️ \`${eventPetData.hp}\` - ⚔️ \`${eventPetData.atk}\` - 🛡️ \`${eventPetData.def}\`\n\n`,
          ),
        );
        huntContainer.addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        );
      }

      let petText = "";
      huntedPets.forEach((pet, i) => {
        const rarityEmoji = RARITY_EMOJI[pet.type] || "❓";
        const isEvent = pet.isEvent ? " ✨" : "";
        petText +=
          `\`${i + 1}.\` ${pet.emoji} **${pet.name}** ${rarityEmoji}${isEvent}\n` +
          `> ❤️ \`${pet.hp}\` - ⚔️ \`${pet.atk}\` - 🛡️ \`${pet.def}\`\n\n`;
      });

      huntContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(petText),
      );

      huntContainer.addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      );

      huntContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 💰 Hunt Cost 💰\n <a:slowarrow:1446769171433263255> <a:pixelcoin:1456194056798339104> Đã Trừ: **-${huntCost.toLocaleString()}** <:Xcoin:1433810075927183441>`,
        ),
      );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("hunt_again_btn")
          .setLabel("🎯 Săn tiếp")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("hunt_zoo_btn")
          .setLabel("🐾 Xem Pet")
          .setStyle(ButtonStyle.Secondary),
      );

      huntContainer.addActionRowComponents(row);

      const huntMsg = await message.reply({
        components: [huntContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });

      const collector = createOwnerCollector(huntMsg, message.author.id, {
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "hunt_again_btn") {
          await reply(i, {
            content:
              "🎯 Bạn hãy gõ lại lệnh `xhunt` để tiếp tục chuyến đi săn nhé!",
            flags: [MessageFlags.Ephemeral],
          });
        } else if (i.customId === "hunt_zoo_btn") {
          await reply(i, {
            content: "🐾 Đang chuyển hướng... Hãy dùng lệnh `xzoo`!",
            flags: [MessageFlags.Ephemeral],
          });
        }
      });
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi hunt:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "<a:no:1455096623804715080> Lỗi khi hunt pet!",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    }
  },
};
