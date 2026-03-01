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
import { getChecklistStatus } from "../../utils/checklistHelper.js";
import { getResetTimes } from "../../utils/resetHelper.js";

export default {
  name: "checklist",
  aliases: ["cl", "task", "nhiemvu"],
  description: "Xem nhiệm vụ hàng ngày",

  async execute(message, args) {
    const userId = message.author.id;
    try {
      const checklist = await getChecklistStatus(userId);
      if (!checklist)
        return message.reply(
          "> <a:no:1455096623804715080> Không tìm thấy dữ liệu người dùng.",
        );

      const tasks = checklist.tasks;
      const isCompleted =
        tasks.daily && tasks.quest && tasks.hunt && tasks.battle && tasks.vote;

      // Format tasks
      const taskList = [
        {
          name: "Điểm danh hàng ngày",
          id: "daily",
          done: tasks.daily,
          cmd: "Xdaily",
        },
        {
          name: "Hoàn thành 1 Quest",
          id: "quest",
          done: tasks.quest,
          cmd: "Xquest",
        },
        { name: "Săn thú (Hunt)", id: "hunt", done: tasks.hunt, cmd: "Xhunt" },
        {
          name: "Chiến đấu 1 trận",
          id: "battle",
          done: tasks.battle,
          cmd: "Xbattle",
        },
        { name: "Vote cho Bot", id: "vote", done: tasks.vote, cmd: null },
      ];

      let desc = "";
      taskList.forEach((t) => {
        if (t.id === "vote") {
          // Vote task không cần lệnh, bot tự động nhận từ webhook
          desc += `> ${t.done ? "<a:checkyes:1455096631555915897>" : "⬜"} **${t.name}** ${t.done ? "" : "(tự động qua Top.gg)"}\n`;
        } else {
          desc += `> ${t.done ? "<a:checkyes:1455096631555915897>" : "⬜"} **${t.name}** ${t.done ? "" : `(\`${t.cmd}\`)`}\n`;
        }
      });

      // Status Bar
      const completedCount = Object.values(tasks).filter((v) => v).length;
      const progress = Math.round((completedCount / 5) * 100);
      const progressBar =
        "▰".repeat(completedCount * 2) + "▱".repeat((5 - completedCount) * 2);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## 📝 Daily CheckList"),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Hoàn thành tất cả nhiệm vụ để nhận thưởng!\n` +
              `- **Tiến độ:** \`${completedCount}/5\`\n- **Progress** : [${progressBar}] \`${progress}%\`\n\n` +
              desc,
          ),
        );

      const { nextReset } = getResetTimes(new Date());
      const resetTimestamp = Math.floor(nextReset.getTime() / 1000);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `<a:clock:1446769163669602335> **Tự động làm mới:** <t:${resetTimestamp}:R>`,
        ),
      );

      // Claim Button
      const row = new ActionRowBuilder();
      const claimBtn = new ButtonBuilder()
        .setCustomId("checklist_claim")
        .setStyle(
          checklist.isClaimed ? ButtonStyle.Secondary : ButtonStyle.Success,
        )
        .setEmoji(checklist.isClaimed ? "✅" : "🎁")
        .setDisabled(!isCompleted || checklist.isClaimed);

      const voteBtn = new ButtonBuilder()
        .setLabel("Vote")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/1432330183834075166/vote")
        .setEmoji("🗳️");

      row.addComponents(claimBtn);
      if (!tasks.vote) row.addComponents(voteBtn);

      container.addActionRowComponents(row);

      const replyMsg = await message
        .reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => null);

      if (!replyMsg) return; // Original message was deleted

      // Collector for Claim
      if (isCompleted && !checklist.isClaimed) {
        const collector = replyMsg.createMessageComponentCollector({
          filter: (i) =>
            i.user.id === userId && i.customId === "checklist_claim",
          time: 60000,
          max: 1,
        });

        collector.on("collect", async (i) => {
          try {
            // Atomic update - prevents parallel save errors
            const result = await User.findOneAndUpdate(
              { userId, "checklist.isClaimed": false },
              {
                $set: { "checklist.isClaimed": true },
                $inc: { money: 50000, exp: 100 },
              },
              { returnDocument: "after" },
            );

            if (!result) {
              return i.reply({
                content: "Bạn đã nhận rồi!",
                flags: MessageFlags.Ephemeral,
              });
            }

            await i.update({
              components: [
                new ContainerBuilder()
                  .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      "## <a:checkyes:1455096631555915897> NHẬN THƯỞNG THÀNH CÔNG!",
                    ),
                  )
                  .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `> 🎁 **Tiền:** +\`${(50000).toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
                        `> ✨ **EXP:** +\`${100}\``,
                    ),
                  ),
              ],
            });
          } catch (err) {
            console.error("Checklist claim error:", err);
          }
        });
      }
    } catch (error) {
      console.error("Checklist Error:", error);
      message
        .reply("> <a:no:1455096623804715080> Có lỗi xảy ra.")
        .catch(() => {});
    }
  },
};
