import { EmbedBuilder } from "discord.js";
import { User } from "../../database/models.js";
import { calculateTransactionFee } from "../../utils/bankHelper.js";

function formatMoney(amount) {
  return amount.toLocaleString("vi-VN");
}

export default {
  name: "withdraw",
  description: "Rút tiền từ tài khoản ngân hàng (Phí 2%)",
  aliases: ["with", "ruttien"],

  async execute(message, args) {
    if (!args[0])
      return message.reply(
        "> ⚠️ Vui lòng nhập số tiền cần rút! (Ví dụ: `xwithdraw 1000` hoặc `xwithdraw all`)",
      );

    // Load user
    let user = await User.findOne({ userId: message.author.id });
    if (!user) {
      user = new User({
        userId: message.author.id,
        username: message.author.username,
      });
      await user.save();
    }

    // Initialize bank if needed
    if (!user.bank || !user.bank.tier) {
      user.bank = {
        balance: 0,
        tier: 1,
        lastInterest: new Date(),
      };
      await user.save();
    }

    let amount;
    if (args[0].toLowerCase() === "all") {
      amount = user.bank.balance;
    } else {
      amount = parseInt(args[0]);
    }

    if (isNaN(amount) || amount <= 0)
      return message.reply(
        "> <a:no:1455096623804715080> Số tiền không hợp lệ!",
      );
    if (amount > user.bank.balance)
      return message.reply(
        "> <a:no:1455096623804715080> Số dư trong bank không đủ!",
      );

    const fee = calculateTransactionFee(amount);
    const finalAmount = amount - fee;

    user.bank.balance -= amount;
    user.money += finalAmount;
    await user.save();

    const embed = new EmbedBuilder()
      .setColor("#ED4245")
      .setTitle("<:greentick_:1476463390426927114> Giao Dịch Thành Công")
      .setDescription(
        `📤 **Đã rút:** \`${formatMoney(amount)}\` coins\n` +
          `💸 **Phí (2%):** \`${formatMoney(fee)}\` coins\n` +
          `💰 **Thực nhận:** \`${formatMoney(finalAmount)}\` coins\n` +
          `💵 **Tiền mặt:** \`${formatMoney(user.money)}\` coins`,
      );

    message.reply({ embeds: [embed] });
  },
};
