import { findOrCreateUser } from "../../utils/userHelper.js";
import { weaponPool } from "../../database/weaponPool.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { calculateReward } from "../../utils/buffHelper.js";

export default {
  name: "sellweapon",
  aliases: ["sellwp", "sw"],
  description: "Bán vũ khí",
  usage: "Xsellweapon <số thứ tự>",

  async execute(message, args) {
    try {
      const userData = await findOrCreateUser(
        message.author.id,
        message.author.username,
      );
      const weapons = userData.weapons || [];

      const prices = {
        common: 500,
        uncommon: 1500,
        rare: 4000,
        epic: 10000,
        mythic: 25000,
        legendary: 100000,
      };

      if (!args[0]) {
        return message.reply(
          "> Cú pháp: `Xsellweapon <số thứ tự>` hoặc `Xsellweapon all`",
        );
      }

      // CASE: SELL ALL
      if (args[0].toLowerCase() === "all") {
        const sellableWeapons = weapons.filter((w) => {
          const isFav = w.favorite === true;
          // Robust check: not equipped if null, empty string, or even string "null"/"undefined"
          const isEquipped =
            w.equippedTo &&
            w.equippedTo !== "" &&
            w.equippedTo !== "null" &&
            w.equippedTo !== "undefined";
          return !isFav && !isEquipped;
        });

        if (sellableWeapons.length === 0) {
          return message.reply(
            "> <a:no:1455096623804715080> Không có vũ khí nào để bán (Không tính Favorites & Đang trang bị)!",
          );
        }

        let totalPrice = 0;
        sellableWeapons.forEach((w) => {
          const r = w.rarity ? w.rarity.toLowerCase() : "common";
          totalPrice += prices[r] || 500;
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_sell_all")
            .setLabel(`Xác nhận bán ${sellableWeapons.length} vũ khí`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("cancel_sell_all")
            .setLabel("Hủy")
            .setStyle(ButtonStyle.Secondary),
        );

        const confirmMsg = await message.reply({
          content: `## <:warning:1455096625373380691> Xác Nhận Bán Weapon\n> - Bạn có muốn bán **${sellableWeapons.length}** vũ khí?\n> Tổng giá trị: \`${totalPrice.toLocaleString()}\` coins\n> - *(Vũ khí Favorites <:purplestar:1455096634609500315> và Đang trang bị sẽ được giữ lại)*`,
          components: [row],
        });

        const collector = confirmMsg.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 30000,
        });

        collector.on("collect", async (i) => {
          if (i.customId === "cancel_sell_all") {
            await i.update({
              content: "> <a:no:1455096623804715080> Đã hủy thao tác bán.",
              components: [],
            });
            return;
          }

          if (i.customId === "confirm_sell_all") {
            const freshUser = await findOrCreateUser(
              message.author.id,
              message.author.username,
            );
            const freshWeapons = freshUser.weapons || [];

            const toRemove = freshWeapons.filter((w) => {
              const isFav = w.favorite === true;
              const isEquipped =
                w.equippedTo &&
                w.equippedTo !== "" &&
                w.equippedTo !== "null" &&
                w.equippedTo !== "undefined";
              return !isFav && !isEquipped;
            });

            let basePrice = 0;
            toRemove.forEach((w) => {
              const r = w.rarity ? w.rarity.toLowerCase() : "common";
              basePrice += prices[r] || 500;
            });

            const { total: finalPrice, bonus: buffBonus } = calculateReward(
              freshUser,
              basePrice,
              "sell",
            );
            freshUser.weapons = freshWeapons.filter(
              (w) => w.favorite || w.equippedTo,
            );
            freshUser.money += finalPrice;

            await freshUser.save();

            await i.update({
              content: `> - <a:checkyes:1455096631555915897> Đã bán thành công **${toRemove.length}** vũ khí!\n> - <a:pixelcoin:1456194056798339104> Nhận được: \`${finalPrice.toLocaleString()}\` coins${buffBonus > 0 ? ` (Buff: +\`${buffBonus.toLocaleString()}\`)` : ""}`,
              components: [],
            });
          }
        });

        return;
      }

      const index = parseInt(args[0]) - 1;
      if (isNaN(index) || index < 0 || index >= weapons.length) {
        return message.reply(
          "> - <:warning:1455096625373380691> Số thứ tự không hợp lệ!",
        );
      }

      const weapon = weapons[index];

      if (weapon.favorite) {
        return message.reply(
          "> - <a:no:1455096623804715080> Vũ khí này đang được **Favorite**! Không thể bán.",
        );
      }

      if (weapon.equippedTo) {
        return message.reply(
          "> - <a:no:1455096623804715080> Vũ khí đang được trang bị! Gỡ ra trước.",
        );
      }

      const r = weapon.rarity ? weapon.rarity.toLowerCase() : "common";
      const basePrice = prices[r] || 500;
      const { total: price, bonus: buffBonus } = calculateReward(
        userData,
        basePrice,
        "sell",
      );

      userData.weapons.splice(index, 1);
      userData.money += price;
      await userData.save();

      message.reply(
        `> <a:checkyes:1455096631555915897> Đã bán **${weapon.emoji} ${weapon.name}** với giá \`${price.toLocaleString()}\` coins!${buffBonus > 0 ? ` (Buff: +\`${buffBonus.toLocaleString()}\`)` : ""}`,
      );
    } catch (error) {
      console.error(error);
      message.reply("> Lỗi khi bán vũ khí.");
    }
  },
};
