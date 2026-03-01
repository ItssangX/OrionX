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
  name: "docs",
  aliases: ["docsbot", "checkdocs"],
  data: new SlashCommandBuilder()
    .setName("docs")
    .setDescription("Check Docs Bot"),

  async execute(source) {
    const rulesContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 📚 Docs 📊"),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`> - Web Docs của OrionX\n`),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Docs")
        .setURL("https://orxdocs.web.app/")
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
