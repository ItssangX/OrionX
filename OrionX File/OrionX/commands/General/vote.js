import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";
import { reply } from "../../utils/commandHelper.js";

export default {
  name: "vote",
  aliases: ["v"],
  description: "Vote cho Bot để nhận phần thưởng",
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Vote cho Bot để nhận phần thưởng"),

  async execute(source, args) {
    const voteUrl = "https://top.gg/bot/1432330183834075166";
    // Phần thưởng mặc định mỗi lần vote: 50,000 XCoin
    // Có thể thay đổi qua biến môi trường TOPGG_REWARD
    const rewardRaw = parseInt(process.env.TOPGG_REWARD || "50000", 10);
    const rewardAmount = Number.isFinite(rewardRaw) ? rewardRaw : 50000;

    const voteContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## 🗳️ OrionX Vote\n> Cảm ơn bạn đã ủng hộ **OrionX**! Hãy vote cho bot mỗi 12 giờ để giúp bot phát triển hơn nhé.",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '<a:gift:1446769608580399154> **Cách nhận thưởng:**\n 1. Bấm nút "Vote Tại Top.gg" bên dưới\n 2. Hoàn thành vote trên trang Top.gg\n 3. Bot sẽ **tự động** gửi DM và tặng **' +
            rewardAmount.toLocaleString() +
            " XCoin** cho bạn.\n\n** <a:clock:1446769163669602335> Bạn có thể vote lại sau 12 giờ **",
        ),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Vote Tại Top.gg")
        .setURL(voteUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji("🗳️"),
    );

    await reply(source, {
      components: [voteContainer, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
