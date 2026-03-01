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
  name: "invite",
  aliases: ["addbot", "invitelink", "invitebot"],
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Check Invite Link Bot"),

  async execute(source) {
    const rulesContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:botgradient_:1476463355781972091> Invite Link <:botgradient_:1476463355781972091>",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`> - Invite Link của OrionX\n`),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite")
        .setURL(
          "https://discord.com/oauth2/authorize?client_id=1432330183834075166",
        )
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
