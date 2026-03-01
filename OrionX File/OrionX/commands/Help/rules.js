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
  name: "rules",
  aliases: ["luat", "quydinh"],
  data: new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Xem quy định và điều khoản sử dụng của OrionX"),

  async execute(source) {
    const rulesContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 📜 OrionX Rules"),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Để đảm bảo môi trường chơi game công bằng và văn minh, vui lòng đọc kỹ các quy định của chúng tôi tại trang web chính thức.\n\n` +
            `**Lưu ý:** Việc sử dụng bot đồng nghĩa với việc bạn đã chấp nhận các điều khoản này.`,
        ),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Xem Quy Định")
        .setURL("https://orxbot.web.app/Rules")
        .setStyle(ButtonStyle.Link)
        .setEmoji("🔗"),
    );

    rulesContainer.addActionRowComponents(row);

    await reply(source, {
      components: [rulesContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
