import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";

export default {
  name: "play",
  aliases: ["xplay"],
  description: "Chơi OrionX Play trên Web",
  async execute(message, args) {
    const contentText =
      "## <:playing:1476453754160283749> OrionX PlayZ\n" +
      "- Chào mừng bạn đến với **OrionX PlayZ**!\n\n"

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(contentText)
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small)
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Play")
        .setURL("https://orionxplayz.web.app/")
        .setStyle(ButtonStyle.Link)
        .setEmoji("<:blueplay:1476487012075704483>")
    );

    container.addActionRowComponents(row);

    // Support both message and interaction
    const options = {
      components: [container],
      flags: MessageFlags.IsComponentsV2
    };

    if (message.reply) {
      return message.reply(options);
    } else {
      return message.editReply(options);
    }
  },
};
