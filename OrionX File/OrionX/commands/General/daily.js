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
import { updateQuestProgress } from "../../utils/questHelper.js";
import { calculateReward } from "../../utils/buffHelper.js";
import { createOwnerCollector } from "../../utils/commandHelper.js";
import { updateChecklist } from "../../utils/checklistHelper.js";
import { getResetTimes } from "../../utils/resetHelper.js";

export default {
  name: "daily",
  aliases: ["d", "reward"],

  async execute(message, args) {
    try {
      let userData = await User.findOne({ userId: message.author.id });

      if (!userData) {
        userData = await User.create({
          userId: message.author.id,
          username: message.author.username,
          money: 0,
        });
      }

      const baseReward = 50000;
      const now = new Date();
      const { lastReset, nextReset } = getResetTimes(now);

      if (userData.lastDaily && new Date(userData.lastDaily) >= lastReset) {
        const resetTimestamp = Math.floor(nextReset.getTime() / 1000);

        const cooldownContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <a:clock:1446769163669602335> CHƯA ĐẾN GIỜ!",
            ),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> - Quay lại sau: <t:${resetTimestamp}:R>\n` +
                `> - <:fire_:1476463412723716257> ** Streak hiện tại:** \`${userData.dailyStreak || 0}\` ngày`,
            ),
          );

        return message.reply({
          components: [cooldownContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const prevReset = new Date(lastReset);
      prevReset.setDate(prevReset.getDate() - 1);
      let currentStreak = 1;
      if (
        userData.lastDaily &&
        new Date(userData.lastDaily) >= prevReset &&
        new Date(userData.lastDaily) < lastReset
      ) {
        currentStreak = (userData.dailyStreak || 0) + 1;
      }

      let bonusPercent = 0;
      let bonusText = "";
      if (currentStreak >= 30) {
        bonusPercent = 100;
        bonusText = "🌟 **30 ngày!** +100%";
      } else if (currentStreak >= 14) {
        bonusPercent = 50;
        bonusText = "💎 **14 ngày!** +50%";
      } else if (currentStreak >= 7) {
        bonusPercent = 25;
        bonusText = "🔥 **7 ngày!** +25%";
      } else if (currentStreak >= 3) {
        bonusPercent = 10;
        bonusText = "✨ **3 ngày!** +10%";
      }

      const bonusAmount = Math.floor(baseReward * (bonusPercent / 100));
      const totalReward = baseReward + bonusAmount;
      const {
        total,
        multipliers,
        bonus: buffBonus,
      } = calculateReward(userData, totalReward, "daily");

      userData.money += total;
      userData.lastDaily = now;
      userData.dailyStreak = currentStreak;
      if (currentStreak > (userData.maxDailyStreak || 0)) {
        userData.maxDailyStreak = currentStreak;
      }
      userData.lastDailyStreak = now;
      await userData.save();
      await updateQuestProgress(message.author.id, "daily_claim", 1);
      await updateChecklist(message.author.id, "daily");

      const dailyContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <a:gift:1446769608580399154> DAILY REWARD <a:gift:1446769608580399154>",
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### <a:moneybag:1476448471274881024> Thưởng\n` +
              `<a:slowarrow:1446769171433263255> <a:pixelcoin:1456194056798339104> **Cơ bản:** +\`${baseReward.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
              (bonusAmount > 0
                ? `<a:slowarrow:1446769171433263255> <a:pixelcoin:1456194056798339104> **Bonus streak:** +\`${bonusAmount.toLocaleString()}\` <:Xcoin:1433810075927183441>\n`
                : "") +
              (buffBonus > 0
                ? `<a:slowarrow:1446769171433263255> <a:pixelcoin:1456194056798339104> **Buff multiplier:** +\`${buffBonus.toLocaleString()}\` <:Xcoin:1433810075927183441>\n`
                : "") +
              `<a:slowarrow:1446769171433263255> <a:pixelcoin:1456194056798339104> **Tổng Nhận:** \`${total.toLocaleString()}\` <:Xcoin:1433810075927183441>\n\n` +
              `### 📊 Trạng Thái\n` +
              `<a:slowarrow:1446769171433263255> **Số dư:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
              `<a:slowarrow:1446769171433263255> **Streak:** \`${currentStreak}\` ngày ${bonusText ? `(${bonusText})` : ""}\n` +
              (multipliers.length > 0
                ? `<a:slowarrow:1446769171433263255> **Buff active:** ${multipliers.map((m) => `\`${m.name}\``).join(", ")}\n`
                : "") +
              `<a:slowarrow:1446769171433263255> **Daily Tiếp Theo:** <t:${Math.floor(nextReset.getTime() / 1000)}:R>`,
          ),
        );

      const dailyMsg = await message.reply({
        components: [dailyContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      const collector = createOwnerCollector(dailyMsg, message.author.id, {
        time: 60000,
      });
    } catch (error) {
      console.error("Lỗi khi thực thi lệnh daily:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể nhận daily reward.",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
