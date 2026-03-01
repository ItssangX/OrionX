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
  name: "status",
  aliases: ["online", "on", "st", "shard", "shardstatus"],
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check Status Bot"),

  async execute(source) {
    const rulesContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 📡 Status Bot & Shards 📊"),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`> - Web Check Status và Shards\n`),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Status & Shards")
        .setURL("https://orxbot.web.app/Status")
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
