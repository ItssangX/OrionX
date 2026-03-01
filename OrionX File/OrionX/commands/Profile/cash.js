import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { User } from "../../database/models.js";
import { reply, getUser, getOption } from "../../utils/commandHelper.js";

export default {
  name: "cash",
  aliases: ["balance", "bal", "money"],
  data: new SlashCommandBuilder()
    .setName("cash")
    .setDescription("Xem số dư ví của bạn hoặc người khác")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Người bạn muốn xem số dư")
        .setRequired(false),
    ),

  async execute(source, args) {
    try {
      const user = getUser(source);
      const target =
        getOption(source, "user", "user") ||
        source.mentions?.users.first() ||
        user;
      let userData = await User.findOne({ userId: target.id });

      if (!userData) {
        userData = await User.create({
          userId: target.id,
          username: target.username,
          money: 0,
        });
      }

      const formattedMoney = userData.money.toLocaleString("vi-VN");
      const isOwner = target.id === user.id;
      const header = isOwner
        ? "💰 Cash 💰"
        : `💰 ${target.username.toUpperCase()} - Cash 💰`;

      const cashContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${header}`),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <:cash:1455874004727500956> **Cash:** \`${formattedMoney}\` <:Xcoin:1433810075927183441>`,
          ),
        );

      await reply(source, {
        components: [cashContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Lỗi khi thực thi lệnh cash:", error);
      const errorContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể kiểm tra số dư.",
        ),
      );
      await reply(source, {
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
