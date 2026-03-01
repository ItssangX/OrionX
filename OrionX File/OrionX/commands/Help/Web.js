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
  name: "web",
  aliases: ["links", "linkbot", "weblinks"],
  data: new SlashCommandBuilder()
    .setName("web")
    .setDescription("Check Web Links Bot"),

  async execute(source) {
    const rulesContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:networkids:1474810735426015263> OrionX Website",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`> - Tất Cả Website Của OrionX\n`),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Website")
        .setURL("https://orxbot.web.app/")
        .setStyle(ButtonStyle.Link)
        .setEmoji("🏠"),
      new ButtonBuilder()
        .setLabel("Docs")
        .setURL("https://orxdocs.web.app/")
        .setStyle(ButtonStyle.Link)
        .setEmoji("📚"),
      new ButtonBuilder()
        .setLabel("Support")
        .setURL("https://discord.gg/3AgHp9CXJP")
        .setStyle(ButtonStyle.Link)
        .setEmoji("☎️"),
    );

    rulesContainer.addActionRowComponents(row);

    await reply(source, {
      components: [rulesContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
