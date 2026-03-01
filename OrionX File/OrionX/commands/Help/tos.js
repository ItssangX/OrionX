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
  name: "tos",
  aliases: ["terms", "rules"],
  data: new SlashCommandBuilder()
    .setName("tos")
    .setDescription("Xem điều khoản sử dụng"),

  async execute(source, args) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 📜 Terms Of Service"),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "_Vui lòng đọc kỹ trước khi sử dụng dịch vụ của chúng tôi._\n\n" +
            "### 1. QUY ĐỊNH CHUNG\n" +
            "> `-` Không spam, lạm dụng lỗi (bug) để trục lợi.\n" +
            "> `-` Không sử dụng bot cho mục đích quấy rối, phá hoại.\n\n" +
            "### 2. QUYỀN HẠN & DỮ LIỆU\n" +
            "> `-` Bot có quyền lưu trữ ID, Username để phục vụ tính năng.\n" +
            "> `-` Chúng tôi có quyền `Blacklist` bạn nếu vi phạm.\n\n" +
            "** - 🔗 https://orxdocs.web.app/Tos**",
        ),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("📖 Xem điều khoản đầy đủ")
        .setStyle(ButtonStyle.Link)
        .setURL("https://orxdocs.web.app/Tos"),
    );

    await reply(source, {
      components: [container, row],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
