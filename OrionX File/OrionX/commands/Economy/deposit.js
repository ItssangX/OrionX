import { EmbedBuilder } from "discord.js";
import { User } from "../../database/models.js";
import {
  calculateTransactionFee,
  getBankTierInfo,
} from "../../utils/bankHelper.js";

function formatMoney(amount) {
  return amount.toLocaleString("vi-VN");
}

export default {
  name: "deposit",
  description: "Gửi tiền vào tài khoản ngân hàng (Phí 2%)",
  aliases: ["dep", "guitien"],

  async execute(message, args) {
    if (!args[0])
      return message.reply(
        "> ⚠️ Vui lòng nhập số tiền cần gửi! (Ví dụ: `xdeposit 1000` hoặc `xdeposit all`)",
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
      amount = user.money;
    } else {
      amount = parseInt(args[0]);
    }

    if (isNaN(amount) || amount <= 0)
      return message.reply(
        "> <a:no:1455096623804715080> Số tiền không hợp lệ!",
      );
    if (amount > user.money)
      return message.reply(
        "> <a:no:1455096623804715080> Bạn không đủ tiền mặt!",
      );

    const currentTier = getBankTierInfo(user.bank.tier);
    const capacity = currentTier.capacity;

    // Check capacity
    if (user.bank.balance + amount > capacity) {
      const canDeposit = capacity - user.bank.balance;
      if (canDeposit <= 0)
        return message.reply(
          `> <a:no:1455096623804715080> Bank đã đầy! Hãy nâng cấp bank. (Max: \`${formatMoney(capacity)}\`)`,
        );

      // Suggest depositing max possible
      if (args[0].toLowerCase() !== "all") {
        return message.reply(
          `> ⚠️ Bạn chỉ có thể gửi thêm tối đa **${formatMoney(canDeposit)}** coins!`,
        );
      }
      amount = canDeposit;
    }

    const fee = calculateTransactionFee(amount);
    const finalAmount = amount - fee;

    user.money -= amount;
    user.bank.balance += finalAmount;
    await user.save();

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("<:greentick_:1476463390426927114> Giao dịch thành công!")
      .setDescription(
        `📥 **Đã gửi:** \`${formatMoney(amount)}\` coins\n` +
          `💸 **Phí (2%):** \`${formatMoney(fee)}\` coins\n` +
          `💰 **Thực nhận:** \`${formatMoney(finalAmount)}\` coins\n` +
          `<:bank:1476487486799745045> **Số dư Bank:** \`${formatMoney(user.bank.balance)}\` coins`,
      );

    message.reply({ embeds: [embed] });
  },
};
