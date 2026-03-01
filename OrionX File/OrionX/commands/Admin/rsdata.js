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
import { User } from "../../database/models.js";
import { createOwnerCollector, update } from "../../utils/commandHelper.js";
import { ADMIN_ID } from "../../config/captchaConfig.js";

// Admin chính - CHỈ NGƯỜI NÀY MỚI DÙNG ĐƯỢC LỆNH NÀY
const ADMIN_MAIN = ADMIN_ID;

export default {
  name: "rsdata",
  aliases: ["resetdata", "resetuser", "cleardata"],
  description: "[ADMIN MAIN] Reset toàn bộ dữ liệu user (CỰC KỲ NGUY HIỂM)",

  async execute(message, args) {
    try {
      // Kiểm tra quyền Admin Main
      if (message.author.id !== ADMIN_MAIN) {
        const noPermContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> **Không có quyền!** Chỉ **Admin Main** mới có thể sử dụng lệnh này!",
          ),
        );
        return message.reply({
          components: [noPermContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      // Lấy target user
      const target = message.mentions.users.first();
      if (!target) {
        const usageContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <:warning:1455096625373380691> Reset Data User\n` +
              `> Cú pháp: \`Xrsdata @user\`\n\n` +
              `> **CẢNH BÁO:** Lệnh này sẽ XÓA TOÀN BỘ dữ liệu của user!\n` +
              `> - Tiền, ngân hàng\n` +
              `> - Pets, weapons, inventory\n` +
              `> - Level, EXP, quests\n` +
              `> - Và tất cả dữ liệu khác...\n\n` +
              `> *Hành động này KHÔNG THỂ HOÀN TÁC!*`,
          ),
        );
        return message.reply({
          components: [usageContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      // Không cho reset chính mình
      if (target.id === message.author.id) {
        return message.reply(
          "> <a:no:1455096623804715080> Không thể reset data của chính mình!",
        );
      }

      // Không cho reset Admin Main
      if (target.id === ADMIN_MAIN) {
        return message.reply(
          "> <a:no:1455096623804715080> Không thể reset data của **Admin Main**!",
        );
      }

      // Tìm user
      const userData = await User.findOne({ userId: target.id });
      if (!userData) {
        return message.reply(
          `> <a:no:1455096623804715080> **${target.username}** không tồn tại trong database!`,
        );
      }

      // Hiển thị thông tin trước khi reset
      const petCount = userData.pets?.length || 0;
      const weaponCount = userData.weapons?.length || 0;
      const money = userData.money || 0;
      const bankBalance = userData.bank?.balance || 0;
      const level = userData.level || 1;

      // Tạo confirmation
      const confirmContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## ⚠️ XÁC NHẬN RESET DATA"),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> **User:** ${target.username} (\`${target.id}\`)\n\n` +
              `**Dữ liệu sẽ bị xóa:**\n` +
              `> 💰 Tiền: \`${money.toLocaleString()}\`\n` +
              `> <:bank:1476487486799745045> Ngân hàng: \`${bankBalance.toLocaleString()}\`\n` +
              `> 🐾 Pets: \`${petCount}\` con\n` +
              `> ⚔️ Weapons: \`${weaponCount}\` cái\n` +
              `> 📊 Level: \`${level}\`\n\n` +
              `> ⚠️ **HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!**`,
          ),
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rsdata_confirm")
          .setLabel("🗑️ XÁC NHẬN RESET")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("rsdata_cancel")
          .setLabel("❌ Hủy Bỏ")
          .setStyle(ButtonStyle.Secondary),
      );

      confirmContainer.addActionRowComponents(row);

      const reply = await message.reply({
        components: [confirmContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      // Collector
      const collector = createOwnerCollector(reply, message.author.id, {
        time: 30000,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "rsdata_cancel") {
          const cancelContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "> ❌ **Đã hủy bỏ việc reset data.**",
              ),
            );
          await interaction.update({
            components: [cancelContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          collector.stop();
          return;
        }

        if (interaction.customId === "rsdata_confirm") {
          await interaction.deferUpdate().catch(() => {});

          // Reset data về mặc định
          userData.money = 0;
          userData.bank = { balance: 0, capacity: 50000, tier: 1 };
          userData.level = 1;
          userData.exp = 0;
          userData.hp = 100;
          userData.atk = 10;
          userData.def = 5;
          userData.pets = [];
          userData.weapons = [];
          userData.inventory = [];
          userData.badges = [];
          userData.dailyStreak = 0;
          userData.maxDailyStreak = 0;
          userData.battleWinStreak = 0;
          userData.maxBattleWinStreak = 0;
          userData.totalBattleWins = 0;
          userData.team = { slot1: null, slot2: null, slot3: null };
          userData.quests = { lastReset: null, tasks: [] };
          userData.buffs = {
            globalMultiplier: { value: 1, expireAt: null },
            dailyMultiplier: { value: 1, expireAt: null },
            xpMultiplier: { value: 1, expireAt: null },
          };
          userData.autoHunt = {
            isActive: false,
            startTime: null,
            endTime: null,
            petCount: 0,
            amountPaid: 0,
          };
          userData.shopPurchaseHistory = {
            lastShopUpdate: null,
            purchases: [],
          };
          userData.cooldowns = {}; // Reset cooldowns

          await userData.save();

          const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## 🗑️ RESET DATA THÀNH CÔNG",
              ),
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `> **User:** ${target.username} (\`${target.id}\`)\n` +
                  `> **Thực hiện bởi:** ${message.author.username}\n\n` +
                  `**Đã xóa:**\n` +
                  `> 💰 Tiền: \`${money.toLocaleString()}\`\n` +
                  `> <:bank:1476487486799745045> Ngân hàng: \`${bankBalance.toLocaleString()}\`\n` +
                  `> 🐾 Pets: \`${petCount}\` con\n` +
                  `> ⚔️ Weapons: \`${weaponCount}\` cái\n\n` +
                  `*User đã được reset về trạng thái mới.*`,
              ),
            );

          await update(interaction, {
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          collector.stop();
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
          const timeoutContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "> ⏰ **Hết thời gian xác nhận!**",
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
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi rsdata:", error);
      message.reply(
        "> <a:no:1455096623804715080> **Lỗi!** Không thể reset data user.",
      );
    }
  },
};
