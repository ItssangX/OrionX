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
import {
  getQuestStatus,
  claimQuestRewards,
  initDailyQuests,
  DAILY_QUESTS,
} from "../../utils/questHelper.js";
import { createOwnerCollector } from "../../utils/commandHelper.js";
import { updateChecklist } from "../../utils/checklistHelper.js";
import { getResetTimes } from "../../utils/resetHelper.js";

export default {
  name: "quest",
  aliases: ["q", "quests", "nhiemvu", "nv"],

  async execute(message, args) {
    try {
      const action = args?.[0]?.toLowerCase();
      if (action === "claim") {
        return await handleClaimRewards(message, message.author.id);
      }
      await handleShowQuests(message, message.author.id);
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi quest command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể hiển thị nhiệm vụ.",
        ),
      );
      message
        .reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => { });
    }
  },
};

async function handleShowQuests(message, userId) {
  const questData = await getQuestStatus(userId);
  if (!questData || !questData.tasks || questData.tasks.length === 0) {
    await initDailyQuests(userId);
    const newData = await getQuestStatus(userId);
    if (!newData)
      return message.reply(
        "> <a:no:1455096623804715080> Không thể tải nhiệm vụ!",
      );
    return await showQuestContainer(message, newData, userId);
  }
  return await showQuestContainer(message, questData, userId);
}

async function showQuestContainer(message, questData, userId) {
  const completed = questData.tasks.filter(
    (t) => t.completed || t.progress >= t.target,
  ).length;
  const total = questData.tasks.length;
  const claimable = questData.tasks
    .filter((t) => t.completed || (t.progress >= t.target && t.progress !== -1))
    .filter((t) => t.progress !== -1).length;

  const progressPercent = Math.round((completed / total) * 100);
  const filledBars = Math.round(progressPercent / 10);
  const progressBar = "█".repeat(filledBars) + "░".repeat(10 - filledBars);

  let questList = "";
  for (const task of questData.tasks) {
    const isDone =
      task.completed || (task.progress >= task.target && task.progress !== -1);
    const isClaimed = task.progress === -1;
    const status = isClaimed
      ? "<a:checkyes:1455096631555915897>"
      : isDone
        ? "🎁"
        : "⬜";
    const progress = isClaimed ? task.target : Math.max(0, task.progress);
    questList += `> - ${status} **${task.name}** \`${progress}/${task.target}\` → \`${task.reward}\` <:Xcoin:1433810075927183441>\n`;
  }

  const { nextReset } = getResetTimes(new Date());
  const resetTimestamp = Math.floor(nextReset.getTime() / 1000);

  const questContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 📋 Quest 📋"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 📊 Tiến Độ\n` +
        `- **Thanh tiến trình:** \`${progressBar}\` ${progressPercent}%\n` +
        `- **Hoàn thành:** \`${completed}/${total}\` nhiệm vụ\n\n` +
        `### 📝 Quest List\n` +
        questList +
        `\n<a:clock:1446769163669602335> **Tự động làm mới:** <t:${resetTimestamp}:R>`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        claimable > 0
          ? `> - <a:lightbulb:1455096627894423637> **Gợi ý:** Bạn có \`${claimable}\` nhiệm vụ sẵn sàng nhận thưởng! Dùng lệnh \`Xquest claim\` hoặc **nhấn nút bên dưới** để nhận ngay!`
          : "> - <a:lightbulb:1455096627894423637> Hoàn thành nhiệm vụ để nhận phần thưởng <:Xcoin:1433810075927183441> hấp dẫn.",
      ),
    );

  if (claimable > 0) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("quest_claim_btn")
        .setLabel("🎁 Claim All Reward 🎁")
        .setStyle(ButtonStyle.Success),
    );
    questContainer.addActionRowComponents(row);
  }

  const questMsg = await message
    .reply({
      components: [questContainer],
      flags: MessageFlags.IsComponentsV2,
    })
    .catch(() => null);

  if (!questMsg) return;

  if (claimable > 0) {
    const collector = createOwnerCollector(questMsg, userId, {
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "quest_claim_btn") {
        await handleClaimRewards(i, userId, true);
        collector.stop();
      }
    });
  }
}

async function handleClaimRewards(
  interactionOrMessage,
  userId,
  isInteraction = false,
) {
  // 1. Ddefer interaction FIRST
  if (
    isInteraction &&
    !interactionOrMessage.deferred &&
    !interactionOrMessage.replied
  ) {
    await interactionOrMessage.deferUpdate().catch(() => { });
  }

  const result = await claimQuestRewards(userId);

  if (!result.success) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> <a:no:1455096623804715080> ${result.message}`,
      ),
    );
    if (isInteraction) {
      return await interactionOrMessage
        .editReply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => { });
    }
    return await interactionOrMessage
      .reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      })
      .catch(() => { });
  }

  await updateChecklist(userId, "quest");

  const claimContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## <a:gift:1446769608580399154> Quest Claim! <a:gift:1446769608580399154>"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <a:checkyes:1455096631555915897> Claim List\n` +
        result.claimedTasks.map((t) => `> - ${t}`).join("\n") +
        `\n\n### 💰 Tổng Phần Thưởng\n` +
        `- <a:pixelcoin:1456194056798339104> **Cộng thêm:** +\`${result.totalReward.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
        `- <a:money:1455553866182430751> **Số dư mới:** \`${result.newBalance.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
      ),
    );

  if (isInteraction) {
    await interactionOrMessage
      .editReply({
        components: [claimContainer],
        flags: MessageFlags.IsComponentsV2,
      })
      .catch(() => { });
  } else {
    await interactionOrMessage
      .reply({
        components: [claimContainer],
        flags: MessageFlags.IsComponentsV2,
      })
      .catch(() => { });
  }
}
