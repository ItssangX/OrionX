import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { User } from "../../database/models.js";
import { reply, getUser, getOption } from "../../utils/commandHelper.js";

export default {
  name: "streak",
  aliases: ["sk", "streaks"],

  async execute(source, args) {
    try {
      const user = getUser(source);
      const targetUser =
        getOption(source, "user", "user") ||
        source.mentions?.users.first() ||
        user;
      const targetId = targetUser.id;

      const userData = await User.findOne({ userId: targetId });

      if (!userData) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> **Không tìm thấy user!**",
          ),
        );
        return await reply(source, {
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const dailyStreak = userData.dailyStreak || 0;
      const battleWinStreak = userData.battleWinStreak || 0;
      const maxBattleWinStreak = userData.maxBattleWinStreak || 0;

      const streakContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <:fire_:1476463412723716257> Streak - ${targetUser.username.toUpperCase()} <:member:1446769169738502165>`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 📅 Daily Streak\n` +
              `> - <:fire_:1476463412723716257> **${dailyStreak}** ngày liên tiếp\n` +
              `> *Nhận daily reward mỗi ngày để tăng!*\n\n` +
              `### <:Battle:1470101035392565299> Battle Win Streak\n` +
              `> - <:fire_:1476463412723716257> **Hiện tại:** \`${battleWinStreak}\` trận\n` +
              `> - 🏆 **Max:** \`${maxBattleWinStreak}\` trận`,
          ),
        );

      if (dailyStreak >= 7) {
        streakContainer.addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        );
        streakContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🎁 DAILY REWARD BONUS\n` +
              `> - Bạn nhận thêm \`${Math.floor(dailyStreak / 7) * 100}\` <:Xcoin:1433810075927183441> bonus!`,
          ),
        );
      }

      if (battleWinStreak >= 5) {
        streakContainer.addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        );
        streakContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### <a:moneybag:1476448471274881024> BATTLE REWARD BONUS\n` +
              `> - Bạn nhận thêm \`${battleWinStreak * 200}\` <:Xcoin:1433810075927183441> bonus mỗi trận!`,
          ),
        );
      }

      streakContainer.addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      );
      streakContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`*Yêu cầu bởi ${user.username}*`),
      );

      await reply(source, {
        components: [streakContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi streak command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể hiển thị streak.",
        ),
      );
      await reply(source, {
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
