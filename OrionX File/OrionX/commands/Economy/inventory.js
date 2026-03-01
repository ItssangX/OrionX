import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { User } from "../../database/models.js";
import { getItemById } from "../../config/shopConfig.js";
import {
  reply,
  getUser,
  getUserId,
  createOwnerCollector,
} from "../../utils/commandHelper.js";
import logger from "../../utils/logger.js";

export default {
  name: "inventory",
  aliases: ["inv", "use"],
  description: "Sử dụng vật phẩm trong túi đồ của bạn",

  async execute(message, args) {
    const userId = getUserId(message);
    let userData = await User.findOne({ userId });
    if (!userData || !userData.inventory || userData.inventory.length === 0) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## 🎒 Inventory 🎒 \n> Bạn chưa sở hữu vật phẩm nào có thể sử dụng. Hãy ghé qua `/shop` để mua sắm nhé!",
        ),
      );
      return reply(message, {
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const availableItems = userData.inventory.filter(
      (inv) => inv.quantity > 0 && getItemById(inv.itemId),
    );
    if (availableItems.length === 0) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## 🎒 Inventory 🎒\n> Bạn không có vật phẩm nào có hiệu lực sử dụng hiện tại.",
        ),
      );
      return reply(message, {
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // Lấy danh sách buff đang hoạt động
    let activeBuff = null;
    if (userData.buffs) {
      for (const [key, buff] of Object.entries(userData.buffs)) {
        if (buff.expireAt && new Date(buff.expireAt) > new Date()) {
          activeBuff = { key, ...buff };
          break; // Một thời điểm chỉ dùng 1 buff
        }
      }
    }

    const useContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## 🎒 Inventory 🎒\n> - Chọn vật phẩm để sử dụng.",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          availableItems
            .map((inv) => {
              const item = getItemById(inv.itemId);
              return `${item.emoji} **${inv.itemName}** \`x${inv.quantity}\`\n> *${item.description}*`;
            })
            .join("\n"),
        ),
      );

    if (activeBuff) {
      let typeName = "Unknown";
      if (activeBuff.key === "globalMultiplier") typeName = "X2/X3 Toàn Bộ";
      if (activeBuff.key === "dailyMultiplier") typeName = "Daily Reward";
      if (activeBuff.key === "xpMultiplier") typeName = "Kinh Nghiệm";

      useContainer
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✨ **Đang dùng:** \`${typeName} (x${activeBuff.value})\` - Hết hạn <t:${Math.floor(new Date(activeBuff.expireAt).getTime() / 1000)}:R>`,
          ),
        );
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("use_item_select")
      .setPlaceholder("Chọn vật phẩm...")
      .addOptions(
        availableItems.map((inv) => {
          const item = getItemById(inv.itemId);
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${inv.itemName} (x${inv.quantity})`)
            .setValue(inv.itemId)
            .setEmoji(item.emoji);
        }),
      );

    const rows = [new ActionRowBuilder().addComponents(selectMenu)];

    if (activeBuff) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("cancel_active_buff")
            .setLabel("Hủy Buff")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🗑️"),
        ),
      );
    }

    const useMsg = await reply(message, {
      components: [useContainer, ...rows],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = createOwnerCollector(useMsg, getUserId(message), {
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "cancel_active_buff") {
        userData = await User.findOne({ userId: getUserId(message) });
        if (userData.buffs) {
          userData.buffs.globalMultiplier = { value: 1, expireAt: null };
          userData.buffs.dailyMultiplier = { value: 1, expireAt: null };
          userData.buffs.xpMultiplier = { value: 1, expireAt: null };
        }
        await userData.save();

        const cancelContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <a:checkyes:1455096631555915897> ĐÃ DỪNG SỬ DỤNG\n> Bạn đã hủy bỏ vật phẩm đang hoạt động thành công.",
          ),
        );

        return i.update({ components: [cancelContainer] });
      }

      if (i.customId === "use_item_select") {
        const itemId = i.values[0];
        const item = getItemById(itemId);

        userData = await User.findOne({ userId: getUserId(message) });
        const invIndex = userData.inventory.findIndex(
          (it) => it.itemId === itemId,
        );

        if (invIndex === -1 || userData.inventory[invIndex].quantity <= 0) {
          return i.reply({
            content: "<a:no:1455096623804715080> Bạn không còn vật phẩm này!",
            ephemeral: true,
          });
        }

        let resultDescription = "";
        if (item.type === "buff") {
          const field = item.effect.field;
          const multiplier = item.effect.multiplier;
          const duration = item.effect.duration;

          if (!userData.buffs) userData.buffs = {};

          const hasActiveBuff = Object.values(userData.buffs).some(
            (b) => b.expireAt && new Date(b.expireAt) > new Date(),
          );
          if (hasActiveBuff) {
            return i.reply({
              content:
                "> <a:no:1455096623804715080> **Bạn đang có vật phẩm buff khác đang hoạt động!**\nHãy hủy vật phẩm cũ hoặc đợi nó hết hạn.",
              ephemeral: true,
            });
          }

          userData.inventory[invIndex].quantity -= 1;
          if (userData.inventory[invIndex].quantity === 0) {
            userData.inventory.splice(invIndex, 1);
          }

          const expireAt = new Date(Date.now() + duration);
          userData.buffs[field] = { value: multiplier, expireAt: expireAt };
          resultDescription = `Bạn đã kích hoạt **${item.name}** thành công!\n⏳ Thời gian còn lại: <t:${Math.floor(expireAt.getTime() / 1000)}:R>`;
        } else if (item.id === "streak_restore") {
          const highest = userData.maxDailyStreak || 0;
          if (highest <= 0)
            return i.reply({
              content:
                "<a:no:1455096623804715080> Không có streak để hồi phục!",
              ephemeral: true,
            });

          userData.inventory[invIndex].quantity -= 1;
          if (userData.inventory[invIndex].quantity === 0) {
            userData.inventory.splice(invIndex, 1);
          }

          userData.dailyStreak = highest;
          resultDescription = `✨ Bạn đã sử dụng **Bùa Hồi Phục**. Daily Streak hiện tại đã được khôi phục: **${userData.dailyStreak} ngày**!`;
        }

        await userData.save();

        const successContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ✨ SỬ DỤNG THÀNH CÔNG\n\n> ${resultDescription}`,
            ),
          );

        await i.update({
          components: [successContainer],
        });
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        useMsg.edit({ components: [useContainer] }).catch(() => {});
      }
    });
  },
};
