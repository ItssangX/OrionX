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
import { getExpNeeded } from "../../utils/petLevelSystem.js";
import { getOrderedPetGroups, getPetEmoji } from "../../utils/petHelper.js";
import { getPetSkill } from "../../utils/battleGifs.js";
import { createOwnerCollector, update } from "../../utils/commandHelper.js";

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

const RARITY_NAMES = {
  common: "COMMON",
  uncommon: "UNCOMMON",
  rare: "RARE",
  epic: "EPIC",
  mythic: "MYTHIC",
  legendary: "LEGENDARY",
  event: "EVENT",
  special: "SPECIAL",
};

export default {
  name: "petcheck",
  aliases: ["pc", "cp", "petinfo", "checkpet"],
  description: "Xem chi tiết thông tin pet",

  async execute(message, args) {
    try {
      const userData = await findOrCreateUser(
        message.author.id,
        message.author.username,
      );

      if (!userData.pets || userData.pets.length === 0) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> Bạn chưa có pet! Dùng `xhunt` để bắt pet.",
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (!args[0]) {
        return showCheckGuide(message);
      }

      const petIndex = parseInt(args[0]);
      if (isNaN(petIndex) || petIndex < 1) {
        return showCheckGuide(message);
      }

      const orderedPets = getOrderedPetGroups(userData.pets);
      if (petIndex > orderedPets.length) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:no:1455096623804715080> Số Thứ Tự Không Hợp Lệ\n> Bạn chỉ có **${orderedPets.length}** loại pet\n> Dùng \`xzoo\` để xem chi tiết`,
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const selectedGroup = orderedPets[petIndex - 1];
      const selectedPet = selectedGroup.pets[0];

      await showPetDetails(message, userData, selectedPet, petIndex);
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi check:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể xem thông tin pet.",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};

// ==========================================
// HIỂN THỊ HƯỚNG DẪN
// ==========================================
function showCheckGuide(message) {
  const guideContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 🔍 HƯỚNG DẪN XEM PET"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Cách sử dụng:**\n` +
        `- \`xpetcheck <số thứ tự>\` - Xem chi tiết pet\n\n` +
        `**Ví dụ:**\n` +
        `- \`xpetcheck 1\` - Xem pet đầu tiên\n` +
        `- \`xpetcheck 5\` - Xem pet thứ 5\n\n` +
        `*Sử dụng \`xzoo\` để xem danh sách và số thứ tự pet của bạn.*`,
      ),
    );

  return message.reply({
    components: [guideContainer],
    flags: MessageFlags.IsComponentsV2,
  });
}

// Check if pet is equipped for battle
function isPetEquipped(userData, pet) {
  if (!userData.team || !userData.team.slot1) return false;
  const petKey = `${pet.petId}_${pet.createdAt.getTime()}`;
  return userData.team.slot1.key === petKey;
}

// ==========================================
// HIỂN THỊ CHI TIẾT PET
// ==========================================
function buildPetDetailContainer(pet, isFavorite, isEquipped, displayIndex, skill, isTimeout = false) {
  const rarity = pet.type.toLowerCase();
  const emoji = getPetEmoji(pet);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# 🔍 Chi Tiết Pet"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );

  let petInfo = `### ${emoji} **${pet.name}** ${isFavorite ? "<:purplestar:1455096634609500315>" : ""}\n\n`;
  const nextExp = getExpNeeded(pet.level);
  const currentExp = pet.exp || 0;
  const expPercent = Math.min(10, Math.floor((currentExp / nextExp) * 10));
  const expBar = `[${"■".repeat(expPercent)}${"□".repeat(10 - expPercent)}]`;

  petInfo += `> - **Độ hiếm:** ${RARITY_EMOJI[rarity]} ${RARITY_NAMES[rarity]}\n`;
  petInfo += `> - **Level:** \`${pet.level}\` | **XP:** \`${currentExp}/${nextExp}\`\n`;
  petInfo += `> ${expBar}\n\n`;
  petInfo += `**📊 Chỉ số:**\n`;
  petInfo += `> - ❤️ HP: \`${pet.hp}\`\n`;
  petInfo += `> - ⚔️ ATK: \`${pet.atk}\`\n`;
  petInfo += `> - 🛡️ DEF: \`${pet.def}\`\n`;
  petInfo += `> - 💥 CRIT: \`${pet.crit || 5}%\`\n`;

  petInfo += `\n**✨ Skill:**\n`;
  petInfo += `> - **${skill.name}**\n`;
  petInfo += `>    - ${skill.description}\n`;
  petInfo += `>    - Damage: x${skill.damage}\n`;

  if (isEquipped) {
    petInfo += `\n- <:Battle:1470101035392565299> *Đang được trang bị để battle*`;
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(petInfo),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small),
  );

  const statusText = isFavorite
    ? "> - <:purplestar:1455096634609500315> Pet này đã được **yêu thích** và không thể bán"
    : "> Pet này chưa được yêu thích";
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(statusText),
  );

  const petKey = `${pet.petId}_${pet.createdAt.getTime()}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pet_favorite_${petKey}`)
      .setLabel(isFavorite ? "Bỏ Favorite" : "Favorite")
      .setEmoji(isFavorite ? "1455096623804715080" : "1455096634609500315")
      .setStyle(isFavorite ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(isTimeout),
    new ButtonBuilder()
      .setCustomId(`pet_equip_${displayIndex}`)
      .setLabel(isEquipped ? "Đã Trang Bị" : "Trang Bị")
      .setEmoji(isEquipped ? "1470101035392565299" : "1470101035392565299")
      .setStyle(isEquipped ? ButtonStyle.Success : ButtonStyle.Primary)
      .setDisabled(isEquipped || isTimeout),
    new ButtonBuilder()
      .setCustomId("pet_check_close")
      .setLabel("Đóng")
      .setEmoji("<:close:1476451899652706446>")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isTimeout),
  );

  container.addActionRowComponents(row);

  return container;
}

async function showPetDetails(message, userData, pet, displayIndex) {
  const isFavorite = pet.favorite || false;
  const isEquipped = isPetEquipped(userData, pet);
  const skill = getPetSkill(pet.petId);

  // Build container
  const detailContainer = buildPetDetailContainer(pet, isFavorite, isEquipped, displayIndex, skill);

  const reply = await message.reply({
    components: [detailContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  // Handle button interactions
  const collector = createOwnerCollector(reply, message.author.id, {
    time: 60000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "pet_check_close") {
      const closedContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent("> <:close:1476451899652706446> **Đã đóng thông tin pet.**"),
      );
      await interaction.update({
        components: [closedContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      collector.stop();
      return;
    }

    if (interaction.customId.startsWith("pet_equip_")) {
      await interaction.reply({
        content: `⚔️ Để trang bị pet này, hãy dùng lệnh \`xequip ${displayIndex}\`!`,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (interaction.customId.startsWith("pet_favorite_")) {
      // Toggle favorite for ALL pets with the same petId
      const targetKey = interaction.customId.replace("pet_favorite_", "");
      const petToUpdate = userData.pets.find(
        (p) => `${p.petId}_${p.createdAt.getTime()}` === targetKey,
      );

      if (!petToUpdate) {
        await interaction.reply({
          content: "> <a:no:1455096623804715080> Không tìm thấy pet!",
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      await interaction.deferUpdate().catch(() => { });

      // Toggle favorite for ALL copies of the same pet type (petId)
      const newFavoriteValue = !petToUpdate.favorite;
      const samePetId = petToUpdate.petId;

      // Update ALL pets with the same petId using atomic update
      await User.updateOne(
        { userId: userData.userId },
        { $set: { "pets.$[elem].favorite": newFavoriteValue } },
        { arrayFilters: [{ "elem.petId": samePetId }] },
      );

      // Update local references for UI rebuild
      userData.pets.forEach((p) => {
        if (p.petId === samePetId) {
          p.favorite = newFavoriteValue;
        }
      });

      // Rebuild container
      const updatedContainer = buildPetDetailContainer(pet, newFavoriteValue, isEquipped, displayIndex, skill);

      await update(interaction, {
        components: [updatedContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      // Rebuild container with disabled buttons
      const isFavorite = userData.pets.find(
        (p) => `${p.petId}_${p.createdAt.getTime()}` === `${pet.petId}_${pet.createdAt.getTime()}`
      )?.favorite || false;
      const disabledContainer = buildPetDetailContainer(pet, isFavorite, isEquipped, displayIndex, skill, true);

      // Edit lại tin nhắn bằng container mới với nút đã bị disabled
      await reply
        .edit({
          components: [disabledContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => { });
    }
  });
}
