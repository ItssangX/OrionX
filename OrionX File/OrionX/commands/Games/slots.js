import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { User } from "../../database/models.js";
import { updateQuestProgress } from "../../utils/questHelper.js";
import { calculateReward } from "../../utils/buffHelper.js";
import {
  getBetAmount,
  createOwnerCollector,
} from "../../utils/commandHelper.js";

const SLOT_EMOJIS = ["🍎", "🍒", "🍇", "💎", "7️⃣", "🔔"];

export default {
  name: "slots",
  aliases: ["sl", "slot"],

  async execute(message, args) {
    try {
      const betInput = args[0]?.toLowerCase();

      if (!betInput) {
        const guideContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <:slotmachine:1476448458415276072> SLOTS MACHINE",
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Cú pháp:** \`Xslots <tiền>\`\n` +
                `**Ví dụ:** \`Xslots 1000\`\n\n` +
                `### 🏆 Phần Thưởng\n` +
                `> 🎰 **3 Giống nhau:** x2.0 (Lãi 100%)\n` +
                `> 🔹 **2 Giống nhau:** x1.5 (Lãi 50%)`,
            ),
          );
        return message.reply({
          components: [guideContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      let userData = await User.findOne({ userId: message.author.id });
      if (!userData) {
        userData = await User.create({
          userId: message.author.id,
          username: message.author.username,
          money: 0,
        });
      }

      const betAmount = getBetAmount(betInput, userData.money, 250000);

      if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply({
          content: "> <a:no:1455096623804715080> Số tiền không hợp lệ!",
        });
      }

      if (betAmount < 1000 || betAmount > 250000) {
        return message.reply({
          content:
            "> <a:no:1455096623804715080> Cược từ `1,000` đến `250,000` <:Xcoin:1433810075927183441>!",
        });
      }

      if (userData.money < betAmount) {
        return message.reply({
          content: `> <a:no:1455096623804715080> Không đủ tiền! (Có: \`${userData.money.toLocaleString()}\`)`,
        });
      }

      await User.updateOne(
        { userId: message.author.id },
        { $inc: { money: -betAmount } },
      );

      const spinContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <:slotmachine:1476448458415276072> Slots Spinning... <:slotmachine:1476448458415276072>",
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <a:slots:1459178421602095186> | <a:slots:1459178421602095186> | <a:slots:1459178421602095186>\n\n` +
              `*Đang quay thưởng...*`,
          ),
        );

      const msg = await message.reply({
        components: [spinContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const slot1 = SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];
      const slot2 = SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];
      const slot3 = SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];

      let winMultiplier = 0;
      let isWin = false;

      if (slot1 === slot2 && slot2 === slot3) {
        winMultiplier = 2;
        isWin = true;
      } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
        winMultiplier = 1.5;
        isWin = true;
      }

      let finalMoney;
      let buffInfo = "";
      let multipliers = [];

      if (isWin) {
        const baseWinAmount = Math.floor(betAmount * winMultiplier);
        const currentUserData = await User.findOne({
          userId: message.author.id,
        });
        const {
          total,
          multipliers: activeMultipliers,
          bonus,
        } = calculateReward(currentUserData, baseWinAmount, "gambling");

        const result = await User.findOneAndUpdate(
          { userId: message.author.id },
          { $inc: { money: total } },
          { returnDocument: "after" },
        );
        finalMoney = result.money;

        multipliers = activeMultipliers;
        if (bonus > 0) {
          buffInfo = `\n💡 **Buff bonus:** +\`${bonus.toLocaleString()}\` <:Xcoin:1433810075927183441>`;
          if (multipliers.length > 0) {
            buffInfo += `\n✨ **Active buffs:** ${multipliers.map((m) => `\`${m.name}\``).join(", ")}`;
          }
        }
      } else {
        const result = await User.findOne({ userId: message.author.id });
        finalMoney = result.money;
      }
      await updateQuestProgress(message.author.id, "game_play", 1);

      let displayWinAmount = isWin ? Math.floor(betAmount * winMultiplier) : 0;
      if (isWin) {
        const currentUserData = await User.findOne({
          userId: message.author.id,
        });
        const rewardCalc = calculateReward(
          currentUserData,
          displayWinAmount,
          "gambling",
        );
        displayWinAmount = rewardCalc.total;
      }

      const resultContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <:slotmachine:1476448458415276072> Kết Quả: ${isWin ? `Thắng x${winMultiplier}! <a:2giveaway:1446775157036417125>` : "Thua! <a:dollar2:1476448466203971655> "}`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## > ${slot1} | ${slot2} | ${slot3} <\n\n` +
              `> - <a:pixelcoin:1456194056798339104> **Cược:** \`${betAmount.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
              `> - <a:dollar2:1476448466203971655> **Biến động:** ${isWin ? "+" : "-"}\`${isWin ? displayWinAmount.toLocaleString() : betAmount.toLocaleString()}\` <:Xcoin:1433810075927183441>${buffInfo}\n` +
              `> - <a:moneybag:1476448471274881024> **Số dư:** \`${finalMoney.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
          ),
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`slots_retry_${betAmount}`)
          .setLabel("🎰")
          .setStyle(ButtonStyle.Primary),
      );

      resultContainer.addActionRowComponents(row);

      await msg.edit({
        components: [resultContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      const collector = createOwnerCollector(msg, message.author.id, {
        time: 30000,
      });

      collector.on("collect", async (i) => {
        if (i.customId.startsWith("slots_retry_")) {
          const amt = i.customId.split("_")[2];
          await i.reply({
            content: `<a:slots:1459178421602095186> Gõ chát \`Xs ${amt}\` để chơi tiếp nha!`,
            flags: [MessageFlags.Ephemeral],
          });
        }
      });
    } catch (error) {
      console.error("Slots error:", error);
      message.reply("> <a:no:1455096623804715080> Lỗi game slots!");
    }
  },
};
