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
import { getUserLevelInfo, getXPForLevel } from "../../utils/levelSystem.js";
import { createOwnerCollector } from "../../utils/commandHelper.js";

export default {
  name: "rank",
  aliases: ["level", "xp", "lvl"],

  async execute(message, args) {
    try {
      const target = message.mentions.users.first() || message.author;
      const levelInfo = await getUserLevelInfo(target.id);

      if (!levelInfo) {
        const errorContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:no:1455096623804715080> Lỗi\n\nKhông tìm thấy dữ liệu của < @${target.id}> !`,
          ),
        );
        return message.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const allUsers = await User.find({}).sort({ level: -1, exp: -1 }).lean();
      const userRank = allUsers.findIndex((u) => u.userId === target.id) + 1;
      const totalUsers = allUsers.length;
      const xpToNextLevel = levelInfo.neededXP - levelInfo.currentXP;

      const rankContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📊 Rank : ${target.username.toUpperCase()} 📊`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🔰 ** RANKING **\n` +
              `- ** Thứ hạng:** #${userRank.toLocaleString()} / ${totalUsers.toLocaleString()}\n\n` +
              `### 📈 **TIẾN ĐỘ**\n` +
              `- **Level:** \`${levelInfo.level}\`\n` +
              `- **XP:** \`${levelInfo.currentXP.toLocaleString()}\` / \`${levelInfo.neededXP.toLocaleString()}\` (**${levelInfo.percentage}%**)\n` +
              `- **Thanh tiến trình:** \`${levelInfo.progressBar}\`\n` +
              `- **Tổng XP đã nhận:** \`${levelInfo.totalXP.toLocaleString()}\`\n\n` +
              `### 🎯 **MỤC TIÊU TIẾP THEO**\n` +
              `- **Còn thiếu:** \`+ ${xpToNextLevel.toLocaleString()} XP\` để lên Level ${levelInfo.level + 1}\n\n` +
              `> **Mẹo:** Nhắn tin nhận \`+2 XP\`, dùng lệnh nhận \`+4 XP\`!`,
          ),
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rank_profile_btn")
          .setLabel("👤 Hồ Sơ")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("rank_top_btn")
          .setLabel("🏆 Xếp Hạng")
          .setStyle(ButtonStyle.Secondary),
      );

      rankContainer.addActionRowComponents(row);

      const rankMsg = await message.reply({
        components: [rankContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      const collector = createOwnerCollector(rankMsg, message.author.id, {
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "rank_profile_btn") {
          await i.reply({
            content: "👤 Đang chuyển hướng... Hãy dùng lệnh `xprofile`!",
            flags: [MessageFlags.Ephemeral],
          });
        } else if (i.customId === "rank_top_btn") {
          await i.reply({
            content: "🏆 Đang chuyển hướng... Hãy dùng lệnh `xtop`!",
            flags: [MessageFlags.Ephemeral],
          });
        }
      });
    } catch (error) {
      console.error("Error in rank command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <a:no:1455096623804715080> Lỗi\n\nCó lỗi xảy ra khi lấy thông tin level!",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
