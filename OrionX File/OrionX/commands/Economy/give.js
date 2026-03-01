import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { User } from "../../database/models.js";
import { updateQuestProgress } from "../../utils/questHelper.js";

export default {
  name: "give",
  aliases: ["transfer", "send", "pay"],

  async execute(message, args) {
    try {
      const amount = parseInt(args[1]);
      const target = message.mentions.users.first();

      if (!target || isNaN(amount)) {
        const helpContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 💸 CHUYỂN TIỀN"),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Cú pháp:** \`Xgive @user <số tiền>\`\n` +
                `**Ví dụ:** \`Xgive @User 5000\``,
            ),
          );
        return message.reply({
          components: [helpContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (target.id === message.author.id) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> **Không thể chuyển tiền cho chính mình!**",
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (target.bot) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> **Không thể chuyển tiền cho bot!**",
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (amount <= 0) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> **Số tiền phải là số dương!**",
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (amount < 100) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> **Số tiền tối thiểu: `100`** <:Xcoin:1433810075927183441>",
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      let senderData = await User.findOne({ userId: message.author.id });
      if (!senderData) {
        return message.reply({
          content: "> <a:no:1455096623804715080> Bạn chưa chấp nhận TOS!",
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (senderData.money < amount) {
        const errContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <a:no:1455096623804715080> Không Đủ Tiền! <a:pixelcoin:1456194056798339104>",
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> **Số dư:** \`${senderData.money.toLocaleString("vi-VN")}\` <:Xcoin:1433810075927183441>\n` +
                `> **Cần:** \`${amount.toLocaleString("vi-VN")}\` <:Xcoin:1433810075927183441>`,
            ),
          );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      let receiverData = await User.findOne({ userId: target.id });
      if (!receiverData) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <a:no:1455096623804715080> **${target.username}** chưa đăng ký sử dụng bot (Chưa chấp nhận TOS)!`,
          ),
        );
        return message.reply({
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      senderData.money -= amount;
      receiverData.money += amount;
      await senderData.save();
      await receiverData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <a:checkyes:1455096631555915897> Chuyển Tiền Thành Công! <a:pixelcoin:1456194056798339104>",
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> ${message.author} **➜** ${target}\n` +
              `> <a:pixelcoin:1456194056798339104> **Số tiền:** \`${amount.toLocaleString("vi-VN")}\` <:Xcoin:1433810075927183441>\n` +
              `> <:cash:1455874004727500956> **Còn lại:** \`${senderData.money.toLocaleString("vi-VN")}\` <:Xcoin:1433810075927183441>`,
          ),
        );

      await message.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      await updateQuestProgress(message.author.id, "give_money", 1);
    } catch (error) {
      console.error("Lỗi khi thực thi lệnh give:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể chuyển tiền.",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
