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
import { getOrderedPetGroups } from "../../utils/petHelper.js";
import { createOwnerCollector } from "../../utils/commandHelper.js";

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
  name: "equip",
  aliases: ["trangbi"],
  description: "Trang bị pet vào team (3 slots)",

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

      // Initialize team slots
      if (!userData.team) {
        userData.team = { slot1: null, slot2: null, slot3: null };
        await userData.save();
      }

      const team = userData.team;

      if (args.length === 0) {
        return showEquipGuide(message, userData);
      }

      const petIndex = parseInt(args[0]);
      if (isNaN(petIndex) || petIndex < 1)
        return showEquipGuide(message, userData);

      // Determine slot
      let targetSlot = args[1] ? parseInt(args[1]) : null;

      // Auto-assign slot if not provided
      if (!targetSlot) {
        if (!team.slot1) targetSlot = 1;
        else if (!team.slot2) targetSlot = 2;
        else if (!team.slot3) targetSlot = 3;
        else {
          // If full, suggest specifying slot
          const errContainer = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## <a:no:1455096623804715080> Team Đã Đầy!\n> Vui lòng chọn slot cụ thể: \`xequip ${petIndex} <1-3>\`\n> Hoặc gỡ pet bằng \`xunequip <slot>\``,
            ),
          );
          return message.reply({
            components: [errContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      }

      if (targetSlot < 1 || targetSlot > 3) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> Slot phải từ **1 đến 3**!",
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const orderedPets = getOrderedPetGroups(userData.pets);
      if (petIndex > orderedPets.length) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:no:1455096623804715080> Số Thứ Tự Không Hợp Lệ\n > Bạn chỉ có ** ${orderedPets.length}** loại pet\n > Dùng \`xzoo\` để xem chi tiết`,
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const selectedGroup = orderedPets[petIndex - 1];
      const selectedPet = selectedGroup.pets[0];

      // Check if same pet TYPE (petId) is already equipped in ANOTHER slot
      // Prevents equipping duplicate pets of the same kind (e.g. 3 Slimes)
      const selectedPetId = selectedPet.petId;
      for (let i = 1; i <= 3; i++) {
        if (i === targetSlot) continue;
        const s = team[`slot${i}`];
        if (s && s.petId === selectedPetId) {
          const errContainer = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> <a:no:1455096623804715080> Loại pet **${selectedPet.name}** đã được trang bị ở **Slot ${i}**! Mỗi loại pet chỉ được trang bị 1 lần.`,
            ),
          );
          return message.reply({
            components: [errContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      }

      await equipPetToSlot(message, userData, selectedPet, targetSlot);
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi equip:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể trang bị pet.",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};

async function showEquipGuide(message, userData) {
  const team = userData.team || { slot1: null, slot2: null, slot3: null };
  const guideContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:tool:1474807295064932565> Equip Pet <:tool:1474807295064932565>",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );

  let teamStatus =
    "### <:Battle:1470101035392565299> Team Status <:Battle:1470101035392565299>\n";
  for (let i = 1; i <= 3; i++) {
    const slot = team[`slot${i}`];
    if (slot) {
      const pet = userData.pets.find(
        (p) => `${p.petId}_${p.createdAt.getTime()}` === slot.key,
      );
      if (pet) {
        const emoji = getPetEmoji(pet);
        teamStatus += `> **Slot ${i}:** ${emoji} ${pet.name} (Lv.${pet.level})\n`;
      } else {
        teamStatus += `> **Slot ${i}:** <a:no:1455096623804715080> *Pet lỗi*\n`;
      }
    } else {
      teamStatus += `> **Slot ${i}:** \`Trống\`\n`;
    }
  }

  guideContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(teamStatus),
  );
  guideContainer.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small),
  );
  guideContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Cách sử dụng:**\n` +
        `- \`xequip <số pet>\` - Tự động vào slot trống\n` +
        `- \`xequip <số pet> <slot>\` - Vào slot 1, 2 hoặc 3\n\n` +
        `*Sử dụng \`xzoo\` để xem danh sách pet.*`,
    ),
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("equip_team_btn")
      .setLabel("⚔️ Xem Team")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("equip_zoo_btn")
      .setLabel("🐾 Xem Pet")
      .setStyle(ButtonStyle.Secondary),
  );

  guideContainer.addActionRowComponents(row);

  const guideMsg = await message.reply({
    components: [guideContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  // Interaction handling skipped for brevity in guide
}

async function equipPetToSlot(message, userData, pet, slot) {
  const petKey = `${pet.petId}_${pet.createdAt.getTime()}`;
  const slotKey = `slot${slot}`;
  const oldPet = userData.team[slotKey];
  const rarity = pet.type.toLowerCase();
  const emoji = getPetEmoji(pet);

  // Set slot
  userData.team[slotKey] = { key: petKey, petId: pet.petId, name: pet.name };

  // Helper to mark equipped flags
  const markEquipped = (user) => {
    const equippedKeys = new Set();
    if (user.team.slot1) equippedKeys.add(user.team.slot1.key);
    if (user.team.slot2) equippedKeys.add(user.team.slot2.key);
    if (user.team.slot3) equippedKeys.add(user.team.slot3.key);

    user.pets.forEach((p) => {
      const k = `${p.petId}_${p.createdAt.getTime()}`;
      p.equipped = equippedKeys.has(k);
    });
  };

  markEquipped(userData);

  userData.markModified("team");
  userData.markModified("pets");
  await userData.save();

  const successContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <a:checkyes:1455096631555915897> TRANG BỊ THÀNH CÔNG!",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );
  successContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Đã trang bị ${emoji} **${pet.name}** vào **Slot ${slot}**\n` +
        (oldPet && oldPet.key !== petKey
          ? `> <:warning:1455096625373380691> *Đã thay thế pet cũ*\n\n`
          : "\n") +
        `**Chỉ số:**\n` +
        `> ${RARITY_EMOJI[rarity]} **${rarity.toUpperCase()}** - Lv.${pet.level}\n` +
        `> ❤️ HP: \`${pet.hp}\` | ⚔️ ATK: \`${pet.atk}\` | 🛡️ DEF: \`${pet.def}\`\n\n` +
        `*Sẵn sàng cho Team Battle!*`,
    ),
  );

  const successRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("equip_battle_btn")
      .setLabel("⚔️ Bắt Đầu Battle")
      .setStyle(ButtonStyle.Success),
  );

  successContainer.addActionRowComponents(successRow);

  const msg = await message.reply({
    components: [successContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  // Quick interaction handler
  const collector = createOwnerCollector(msg, message.author.id, {
    time: 30000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "equip_battle_btn") {
      await i.reply({
        content: "⚔️ Chuyển hướng... Dùng `xbattle` nào!",
        flags: [MessageFlags.Ephemeral],
      });
    }
  });
}

function getPetEmoji(pet) {
  let emoji = pet.emoji || "🐾";
  const rarity = pet.type.toLowerCase();
  if (petPool[rarity]) {
    const pd = petPool[rarity].find(
      (p) => p.petId === (pet.petId || pet.name.toLowerCase()),
    );
    if (pd?.emoji) emoji = pd.emoji;
  }
  return emoji;
}
