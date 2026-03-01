import { EmbedBuilder } from "discord.js";
import { User } from "../../database/models.js";
import { getNextTier } from "../../utils/bankHelper.js";

function formatMoney(amount) {
  return amount.toLocaleString("vi-VN");
}

export default {
  name: "upgradebank",
  description: "Nâng cấp tài khoản ngân hàng của bạn lên cấp độ tiếp theo",
  aliases: ["bankupgrade", "ub"],

  async execute(message, args) {
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

    const currentTierVal = user.bank.tier || 1;
    const nextTierInfo = getNextTier(currentTierVal);

    if (!nextTierInfo) {
      return message.reply(
        "> 🎉 **Chúc mừng!** Bank của bạn đã đạt cấp độ tối đa (Level 10).",
      );
    }

    const cost = nextTierInfo.cost;

    // Check balance
    if (user.money < cost) {
      const embed = new EmbedBuilder()
        .setColor("#E67E22")
        .setTitle("<:boostgradient_:1476463332973346880> NÂNG CẤP BANK")
        .setDescription(
          `Bạn cần nâng cấp lên **Tier ${nextTierInfo.level}**?\n\n` +
            `💰 **Chi phí:** \`${formatMoney(cost)}\` coins\n` +
            `📦 **Sức chứa mới:** \`${formatMoney(nextTierInfo.capacity)}\`\n` +
            `📈 **Lãi suất mới:** \`${(nextTierInfo.interest * 100).toFixed(1)}%\`\n\n` +
            `❌ **Bạn thiếu:** \`${formatMoney(cost - user.money)}\` coins`,
        );
      return message.reply({ embeds: [embed] });
    }

    // Perform upgrade
    user.money -= cost;
    user.bank.tier = nextTierInfo.level;
    await user.save();

    const embed = new EmbedBuilder()
      .setColor("#F1C40F")
      .setTitle("🎉 NÂNG CẤP THÀNH CÔNG!")
      .setDescription(
        `Bank của bạn đã được nâng cấp lên **Level ${nextTierInfo.level}**!\n\n` +
          `📦 **Sức chứa:** \`${formatMoney(nextTierInfo.capacity)}\` coins\n` +
          `📈 **Lãi suất:** \`${(nextTierInfo.interest * 100).toFixed(1)}%\`\n` +
          `💸 **Đã thanh toán:** \`${formatMoney(cost)}\` coins`,
      );

    message.reply({ embeds: [embed] });
  },
};
