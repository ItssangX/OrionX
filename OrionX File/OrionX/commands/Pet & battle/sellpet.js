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
import { calculateReward } from "../../utils/buffHelper.js";

// Giá bán theo rarity
const SELL_PRICES = {
  common: 100,
  uncommon: 300,
  rare: 1000,
  epic: 3000,
  mythic: 10000,
  legendary: 50000,
  event: 75000,
  special: 100000,
};

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
  name: "sellpet",
  aliases: ["banpet", "sellpets"],

  async execute(message, args) {
    try {
      const userData = await findOrCreateUser(
        message.author.id,
        message.author.username,
      );

      if (!userData.pets || userData.pets.length === 0) {
        return message.reply(
          "> <a:no:1455096623804715080> Bạn không có pet nào để bán!",
        );
      }

      // Kiểm tra args
      if (!args[0]) {
        return showSellGuide(message);
      }

      const input = args[0].toLowerCase();

      // Kiểm tra xem input có phải rarity không (common, uncommon, rare, epic, mythic, legendary, event, special)
      const validRarities = [
        "common",
        "uncommon",
        "rare",
        "epic",
        "mythic",
        "legendary",
        "event",
        "special",
      ];
      if (validRarities.includes(input)) {
        return await handleSellAll(message, userData, input);
      }

      // Bán tất cả
      if (input === "all") {
        const rarity = args[1]?.toLowerCase();
        return await handleSellAll(message, userData, rarity);
      }

      // Bán theo số thứ tự
      const petIndex = parseInt(input);
      if (!isNaN(petIndex)) {
        return await handleSellByIndex(message, userData, petIndex);
      }

      return showSellGuide(message);
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi sell:", error);
      message.reply("> <a:no:1455096623804715080> **Lỗi!** Không thể bán pet.");
    }
  },
};

// ==========================================
// HIỂN THỊ HƯỚNG DẪN
// ==========================================
function showSellGuide(message) {
  const priceList = Object.entries(SELL_PRICES)
    .map(
      ([rarity, price]) =>
        `- ${RARITY_EMOJI[rarity]} **${rarity}:** \`${price.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
    )
    .join("\n");

  const helpContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 💰 HƯỚNG DẪN BÁN PET"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Cú pháp:**\n` +
          `- \`Xsellpet <số thứ tự>\` - Bán 1 pet\n` +
          `- \`Xsellpet all\` - Bán tất cả pets\n` +
          `- \`Xsellpet <độ hiếm>\` - Bán tất cả theo độ hiếm\n\n` +
          `**Độ hiếm:** common, uncommon, rare, epic, mythic, legendary, event, special\n\n` +
          `**Ví dụ:** \`Xsellpet common\` hoặc \`Xsellpet legendary\`\n\n` +
          `**Giá bán:**\n${priceList}\n\n` +
          `<:warning:1455096625373380691> *Pets đang trong Team sẽ không bị bán!*`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `*Dùng \`Xzoo\` để xem số thứ tự pet*`,
      ),
    );

  return message.reply({
    components: [helpContainer],
    flags: MessageFlags.IsComponentsV2,
  });
}

// ==========================================
// BÁN THEO SỐ THỨ TỰ
// ==========================================
async function handleSellByIndex(message, userData, petIndex) {
  const orderedPets = getOrderedPetGroups(userData.pets);

  if (petIndex < 1 || petIndex > orderedPets.length) {
    return message.reply(
      `> <a:no:1455096623804715080> Số thứ tự không hợp lệ! (1 - ${orderedPets.length})`,
    );
  }

  const selectedGroup = orderedPets[petIndex - 1];

  // Check if this pet type is favorited (any copy is favorite = entire type is protected)
  const isGroupFavorited = selectedGroup.pets.some((p) => p.favorite);
  if (isGroupFavorited) {
    return message.reply(
      `> <:purplestar:1455096634609500315> Loại pet **${selectedGroup.name}** đã được **Favorite**! Không thể bán. Hãy bỏ favorite trước.`,
    );
  }

  // Tìm pet đầu tiên trong group mà không trong team
  const petToSell = selectedGroup.pets.find((p) => !isPetInTeam(userData, p));

  if (!petToSell) {
    return message.reply(
      "> <a:no:1455096623804715080> Không thể bán pet đang trong **team**! Gỡ ra trước.",
    );
  }

  const rarity = petToSell.type.toLowerCase();
  const sellPrice = SELL_PRICES[rarity] || 100;

  // Lấy emoji từ pool
  let emoji = petToSell.emoji || "🐾";
  if (petPool[rarity]) {
    const pd = petPool[rarity].find((p) => p.petId === petToSell.petId);
    if (pd?.emoji) emoji = pd.emoji;
  }

  const confirmContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 💰 XÁC NHẬN BÁN PET"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Bạn có chắc chắn muốn bán pet này?\n\n` +
          `> ${emoji} **${petToSell.name}** ${RARITY_EMOJI[rarity]}\n` +
          `> ❤️ HP: \`${petToSell.hp}\` | ⚔️ ATK: \`${petToSell.atk}\` | 🛡️ DEF: \`${petToSell.def}\`\n\n` +
          `**Nhận lại:** \`${sellPrice.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "*Hành động này không thể hoàn tác!*",
      ),
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("sell_confirm")
      .setLabel("Xác nhận bán")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("sell_cancel")
      .setLabel("Hủy bỏ")
      .setStyle(ButtonStyle.Danger),
  );

  confirmContainer.addActionRowComponents(row);

  const reply = await message.reply({
    components: [confirmContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  const collector = reply.createMessageComponentCollector({ time: 30000 });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "> <a:no:1455096623804715080> Không phải lệnh của bạn!",
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (interaction.customId === "sell_cancel") {
      const cancelContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Giao dịch đã bị hủy bỏ.**",
        ),
      );
      await interaction.update({
        components: [cancelContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      collector.stop();
      return;
    }

    if (interaction.customId === "sell_confirm") {
      // Tìm và xóa pet
      const realIndex = userData.pets.findIndex(
        (p) =>
          p.petId === petToSell.petId &&
          p.createdAt.getTime() === petToSell.createdAt.getTime(),
      );

      if (realIndex === -1) {
        await interaction.update({
          content: "> <a:no:1455096623804715080> Không tìm thấy pet!",
          embeds: [],
          components: [],
        });
        return;
      }

      userData.pets.splice(realIndex, 1);
      const { total: finalSellPrice } = calculateReward(
        userData,
        sellPrice,
        "sell",
      );
      userData.money += finalSellPrice;
      await userData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <a:checkyes:1455096631555915897> BÁN THÀNH CÔNG!",
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> Đã bán ${emoji} **${petToSell.name}**\n` +
              `> **Nhận:** +\`${finalSellPrice.toLocaleString()}\` <:Xcoin:1433810075927183441>${finalSellPrice > sellPrice ? ` (Buff: +\`${(finalSellPrice - sellPrice).toLocaleString()}\`)` : ""}\n` +
              `> <:cash:1455874004727500956> **Số dư:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
          ),
        );

      await interaction.update({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      collector.stop();
    }
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:clock:1446769163669602335> **Hết thời gian xác nhận!**",
        ),
      );
      reply
        .edit({
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  });
}

// ==========================================
// BÁN TẤT CẢ
// ==========================================
async function handleSellAll(message, userData, rarityFilter) {
  // Build set of favorited petIds (if any copy is fav, entire type is protected)
  const favoritedPetIds = new Set();
  userData.pets.forEach((p) => {
    if (p.favorite) favoritedPetIds.add(p.petId);
  });

  // Lọc pets có thể bán (không trong team, không favorite type)
  const sellable = userData.pets.filter((pet) => {
    if (isPetInTeam(userData, pet)) return false;
    if (favoritedPetIds.has(pet.petId)) return false; // Không bán pet favorite (cả loại)
    if (rarityFilter && pet.type.toLowerCase() !== rarityFilter) return false;
    return true;
  });

  if (sellable.length === 0) {
    return message.reply(
      rarityFilter
        ? `> <a:no:1455096623804715080> Không có pet **${rarityFilter}** nào để bán (trừ team)!`
        : "> <a:no:1455096623804715080> Không có pet nào để bán (trừ pets trong team)!",
    );
  }

  // Tính tổng tiền
  let totalMoney = 0;
  const countByRarity = {};

  for (const pet of sellable) {
    const rarity = pet.type.toLowerCase();
    const price = SELL_PRICES[rarity] || 100;
    totalMoney += price;
    countByRarity[rarity] = (countByRarity[rarity] || 0) + 1;
  }

  // Tạo summary
  const summary = Object.entries(countByRarity)
    .map(([r, count]) => `> ${RARITY_EMOJI[r]} **${r}:** x${count}`)
    .join("\n");

  const confirmAllContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 💰 Xác Nhận Bán"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> - Bạn có chắc chắn muốn bán **${sellable.length}** pet?\n\n${summary}\n\n` +
          `**Tổng nhận:** \`${totalMoney.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "*Hành động này không thể hoàn tác!*",
      ),
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("sellall_confirm")
      .setLabel(`Bán ${sellable.length} pets`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("sellall_cancel")
      .setLabel("Hủy bỏ")
      .setStyle(ButtonStyle.Danger),
  );

  confirmAllContainer.addActionRowComponents(row);

  const reply = await message.reply({
    components: [confirmAllContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  const collector = reply.createMessageComponentCollector({ time: 30000 });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "> <a:no:1455096623804715080> Không phải lệnh của bạn!",
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (interaction.customId === "sellall_cancel") {
      const cancelContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Giao dịch đã bị hủy bỏ.**",
        ),
      );
      await interaction.update({
        components: [cancelContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      collector.stop();
      return;
    }

    if (interaction.customId === "sellall_confirm") {
      // Build set of favorited petIds (if any copy is fav, entire type is protected)
      const favPetIds = new Set();
      userData.pets.forEach((p) => {
        if (p.favorite) favPetIds.add(p.petId);
      });

      // Xóa các pets sellable (giữ lại team, favorite type, và rarity khác)
      const newPets = userData.pets.filter((pet) => {
        if (isPetInTeam(userData, pet)) return true;
        if (favPetIds.has(pet.petId)) return true; // Giữ lại toàn bộ loại pet favorite
        if (rarityFilter && pet.type.toLowerCase() !== rarityFilter)
          return true;
        return false;
      });

      userData.pets = newPets;
      const { total: finalTotalMoney } = calculateReward(
        userData,
        totalMoney,
        "sell",
      );
      userData.money += finalTotalMoney;
      await userData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <a:checkyes:1455096631555915897> BÁN TẤT CẢ THÀNH CÔNG!",
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> Đã bán **${sellable.length}** pets\n` +
              `> **Nhận:** +\`${finalTotalMoney.toLocaleString()}\` <:Xcoin:1433810075927183441>${finalTotalMoney > totalMoney ? ` (Buff: +\`${(finalTotalMoney - totalMoney).toLocaleString()}\`)` : ""}\n` +
              `> <:cash:1455874004727500956> **Số dư:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
              `> 🐾 **Còn lại:** \`${userData.pets.length}\` pets`,
          ),
        );

      await interaction.update({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      collector.stop();
    }
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:clock:1446769163669602335> **Hết thời gian xác nhận!**",
        ),
      );
      reply
        .edit({
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  });
}

function isPetInTeam(userData, pet) {
  if (!userData.team) return false;

  const { slot1, slot2, slot3 } = userData.team;
  const petKey = `${pet.petId}_${pet.createdAt.getTime()}`;

  return [slot1, slot2, slot3].some((slot) => slot && slot.key === petKey);
}
