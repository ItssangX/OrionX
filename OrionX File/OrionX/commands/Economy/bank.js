import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { User } from "../../database/models.js";
import {
  BANK_CONFIG,
  getInterestStatus,
  claimInterest,
  getBankTierInfo,
  getNextTier,
  calculateTransactionFee,
} from "../../utils/bankHelper.js";

function formatMoney(amount) {
  return amount.toLocaleString("vi-VN");
}

// ================= UI BUILDERS =================

function buildMainBankUI(user, message, interestMsg, canClaimInterest) {
  const currentTier = getBankTierInfo(user.bank.tier);
  const capacity = currentTier.capacity;
  const interestRate = (currentTier.interest * 100).toFixed(1);

  // Progress bar
  const percent = Math.min(1, user.bank.balance / capacity);
  const filled = Math.round(percent * 15);
  const empty = 15 - filled;
  // Format percent to 1 decimal place to avoid long decimals
  const percentFormatted = (percent * 100).toFixed(1);
  const progressBar = `[\`${"■".repeat(filled)}${"□".repeat(empty)}\`] **${percentFormatted}%**`;

  let content =
    `## <:bank:1476487486799745045> OrionX Bank — ${message.author.username}\n` +
    `<:creditcard:1455552752267559013> **Số dư:** \`${formatMoney(user.bank.balance)}\` / \`${formatMoney(capacity)}\` <:Xcoin:1433810075927183441>\n` +
    `${progressBar}\n\n` +
    `<:bluestar_:1476463326824370217> **Tier:** Level ${user.bank.tier}\n` +
    `📈 **Lãi suất:** \`${interestRate}%\` mỗi 24h\n` +
    `${interestMsg}\n\n` +
    `> *Yêu cầu bởi @${message.author.username}*`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("bank_deposit")
      .setLabel("Gửi tiền")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("bank_withdraw")
      .setLabel("Rút tiền")
      .setEmoji("📤")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("bank_upgrade")
      .setLabel("Nâng cấp")
      .setEmoji("<:boostgradient_:1476463332973346880>")
      .setStyle(ButtonStyle.Primary),
  );

  if (canClaimInterest) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("bank_claim_interest")
        .setLabel("Nhận Lãi")
        .setEmoji("💰")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addActionRowComponents(row);
}

function buildClaimSuccessUI(amount, newCash) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## <:greentick_:1476463390426927114> Nhận lãi thành công!\n\n` +
        `<a:pixelcoin:1456194056798339104> **Số tiền nhận:** \`${formatMoney(amount)}\` coins\n` +
        `<a:moneybag:1476448471274881024> **Tiền mặt hiện tại:** \`${formatMoney(newCash)}\` coins`,
    ),
  );
}

function buildDepositResultUI(user, amount, fee, finalAmount) {
  const content =
    `## <:greentick_:1476463390426927114> Gửi tiền thành công\n\n` +
    `📥 **Đã gửi:** \`${formatMoney(amount)}\` coins\n` +
    `💸 **Phí (2%):** \`${formatMoney(fee)}\` coins\n` +
    `💰 **Thực nhận:** \`${formatMoney(finalAmount)}\` coins\n` +
    `<:bank:1476487486799745045> **Số dư Bank:** \`${formatMoney(user.bank.balance)}\` coins`;

  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(content),
  );
}

function buildWithdrawResultUI(user, amount, fee, finalAmount) {
  const content =
    `## <:greentick_:1476463390426927114> Rút tiền thành công\n\n` +
    `📤 **Đã rút:** \`${formatMoney(amount)}\` coins\n` +
    `💸 **Phí (2%):** \`${formatMoney(fee)}\` coins\n` +
    `💰 **Thực nhận:** \`${formatMoney(finalAmount)}\` coins\n` +
    `💵 **Tiền mặt:** \`${formatMoney(user.money)}\` coins`;

  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(content),
  );
}

function buildUpgradeInfoUI(user, nextTierInfo) {
  const cost = nextTierInfo.cost;
  const lacking = cost - user.money;

  let content =
    `## <:boostgradient_:1476463332973346880> Nâng cấp Bank\n\n` +
    `Nâng cấp lên **Tier ${nextTierInfo.level}**\n\n` +
    `💰 **Chi phí:** \`${formatMoney(cost)}\` coins\n` +
    `📦 **Sức chứa mới:** \`${formatMoney(nextTierInfo.capacity)}\` coins\n` +
    `📈 **Lãi suất mới:** \`${(nextTierInfo.interest * 100).toFixed(1)}%\`\n`;

  if (lacking > 0) {
    content += `\n> ❌ **Thiếu:** \`${formatMoney(lacking)}\` coins`;
    return new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(content),
    );
  }

  content += `\n> <:greentick_:1476463390426927114> Bạn đủ điều kiện nâng cấp!`;

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("bank_confirm_upgrade")
          .setLabel("Xác nhận nâng cấp")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("bank_cancel")
          .setLabel("Hủy")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger),
      ),
    );
}

function buildUpgradeSuccessUI(nextTierInfo, cost) {
  const content =
    `## 🎉 Nâng cấp thành công!\n\n` +
    `Bank đã được nâng cấp lên **Level ${nextTierInfo.level}**\n\n` +
    `📦 **Sức chứa:** \`${formatMoney(nextTierInfo.capacity)}\` coins\n` +
    `📈 **Lãi suất:** \`${(nextTierInfo.interest * 100).toFixed(1)}%\`\n` +
    `💸 **Đã thanh toán:** \`${formatMoney(cost)}\` coins`;

  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(content),
  );
}

function buildErrorUI(text) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> ❌ ${text}`),
  );
}

function buildWarningUI(text) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> ⚠️ ${text}`),
  );
}

function buildDepositModal() {
  return new ModalBuilder()
    .setCustomId("bank_modal_deposit")
    .setTitle("📥 Gửi tiền vào Bank")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_amount_input")
          .setLabel("Số tiền muốn gửi")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Nhập số hoặc "all" để gửi hết')
          .setRequired(true),
      ),
    );
}

function buildWithdrawModal() {
  return new ModalBuilder()
    .setCustomId("bank_modal_withdraw")
    .setTitle("📤 Rút tiền từ Bank")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_amount_input")
          .setLabel("Số tiền muốn rút")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Nhập số hoặc "all" để rút hết')
          .setRequired(true),
      ),
    );
}

// ================= INTEREST MSG BUILDER =================

async function getInterestMsg(userId, user) {
  const status = await getInterestStatus(userId);

  if (status.canClaim) {
    return {
      msg: `> <a:checkyes:1455096631555915897> **Interest Earned:** Có thể nhận \`${formatMoney(status.interestEarned)}\` coins!`,
      canClaim: true,
    };
  }

  if (status.message === "No balance") {
    return {
      msg: "> <:warning:1455096625373380691> Bạn chưa gửi tiền vào Bank để nhận lãi.",
      canClaim: false,
    };
  }

  const nextInterest = new Date(
    new Date(user.bank.lastInterest).getTime() + BANK_CONFIG.INTEREST_CYCLE,
  );
  const timeDiff = nextInterest - new Date();

  if (timeDiff > 0) {
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      msg: `> ⏳ **Nhận lãi sau:** \`${hours}h ${minutes}m\``,
      canClaim: false,
    };
  }

  return { msg: "> ⏳ Đang kiểm tra lãi suất...", canClaim: false };
}

// ================= DEPOSIT / WITHDRAW LOGIC =================

async function processDeposit(user, amountStr) {
  let amount;
  if (amountStr.toLowerCase() === "all") {
    amount = user.money;
  } else {
    amount = parseInt(amountStr);
  }

  if (amountStr.toLowerCase() === "all") {
    if (amount <= 0) return { error: "Bạn không đủ tiền mặt!" };
  } else {
    if (isNaN(amount) || amount <= 0) return { error: "Số tiền không hợp lệ!" };
    if (amount > user.money) return { error: "Bạn không đủ tiền mặt!" };
  }

  const currentTier = getBankTierInfo(user.bank.tier);
  const capacity = currentTier.capacity;

  if (user.bank.balance + amount > capacity) {
    const canDeposit = capacity - user.bank.balance;
    if (canDeposit <= 0) {
      return {
        error: `Bank đã đầy! Hãy nâng cấp. (Max: \`${formatMoney(capacity)}\`)`,
      };
    }
    if (amountStr.toLowerCase() !== "all") {
      return {
        warning: `Chỉ có thể gửi thêm tối đa **${formatMoney(canDeposit)}** coins!`,
      };
    }
    amount = canDeposit;
  }

  const fee = calculateTransactionFee(amount);
  const finalAmount = amount - fee;

  user.money -= amount;
  user.bank.balance += finalAmount;
  await user.save();

  return { success: true, amount, fee, finalAmount, user };
}

async function processWithdraw(user, amountStr) {
  let amount;
  if (amountStr.toLowerCase() === "all") {
    amount = user.bank.balance;
  } else {
    amount = parseInt(amountStr);
  }

  if (amountStr.toLowerCase() === "all") {
    if (amount <= 0) return { error: "Số dư trong bank không đủ!" };
  } else {
    if (isNaN(amount) || amount <= 0) return { error: "Số tiền không hợp lệ!" };
    if (amount > user.bank.balance)
      return { error: "Số dư trong bank không đủ!" };
  }

  const fee = calculateTransactionFee(amount);
  const finalAmount = amount - fee;

  user.bank.balance -= amount;
  user.money += finalAmount;
  await user.save();

  return { success: true, amount, fee, finalAmount, user };
}

// ================= MAIN EXPORT =================

export default {
  name: "bank",
  description: "Quản lý tài khoản ngân hàng của bạn",
  aliases: ["atm", "bk", "nganhang"],

  async execute(message, args) {
    const subCommand = args[0]?.toLowerCase();

    // Load / init user
    let user = await User.findOne({ userId: message.author.id });
    if (!user) {
      user = new User({
        userId: message.author.id,
        username: message.author.username,
      });
      await user.save();
    }
    if (!user.bank || !user.bank.tier) {
      user.bank = { balance: 0, tier: 1, lastInterest: new Date() };
      await user.save();
    }

    // Sub-command shortcuts (text-based, no buttons)
    if (
      subCommand === "deposit" ||
      subCommand === "gui" ||
      subCommand === "dep"
    ) {
      const result = await processDeposit(user, args[1] || "");
      if (!args[1])
        return message.reply({
          components: [
            buildWarningUI(
              "Nhập số tiền cần gửi! (Ví dụ: `xbank dep 1000` hoặc `xbank dep all`)",
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      if (result.error)
        return message.reply({
          components: [buildErrorUI(result.error)],
          flags: MessageFlags.IsComponentsV2,
        });
      if (result.warning)
        return message.reply({
          components: [buildWarningUI(result.warning)],
          flags: MessageFlags.IsComponentsV2,
        });
      return message.reply({
        components: [
          buildDepositResultUI(
            result.user,
            result.amount,
            result.fee,
            result.finalAmount,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
    if (
      subCommand === "withdraw" ||
      subCommand === "rut" ||
      subCommand === "with"
    ) {
      const result = await processWithdraw(user, args[1] || "");
      if (!args[1])
        return message.reply({
          components: [
            buildWarningUI(
              "Nhập số tiền cần rút! (Ví dụ: `xbank with 1000` hoặc `xbank with all`)",
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      if (result.error)
        return message.reply({
          components: [buildErrorUI(result.error)],
          flags: MessageFlags.IsComponentsV2,
        });
      if (result.warning)
        return message.reply({
          components: [buildWarningUI(result.warning)],
          flags: MessageFlags.IsComponentsV2,
        });
      return message.reply({
        components: [
          buildWithdrawResultUI(
            result.user,
            result.amount,
            result.fee,
            result.finalAmount,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
    if (subCommand === "upgrade" || subCommand === "nangcap") {
      const nextTierInfo = getNextTier(user.bank.tier || 1);
      if (!nextTierInfo)
        return message.reply({
          components: [
            buildWarningUI("🎉 Bank đã đạt cấp độ tối đa (Level 10)."),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      if (user.money < nextTierInfo.cost)
        return message.reply({
          components: [buildUpgradeInfoUI(user, nextTierInfo)],
          flags: MessageFlags.IsComponentsV2,
        });

      // Directly upgrade via text command
      user.money -= nextTierInfo.cost;
      user.bank.tier = nextTierInfo.level;
      await user.save();
      return message.reply({
        components: [buildUpgradeSuccessUI(nextTierInfo, nextTierInfo.cost)],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // --- MAIN BANK UI (no sub-command) ---
    const { msg: interestMsg, canClaim: canClaimInterest } =
      await getInterestMsg(message.author.id, user);

    const container = buildMainBankUI(
      user,
      message,
      interestMsg,
      canClaimInterest,
    );
    const msg = await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    // ================= BUTTON COLLECTOR =================
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000, // 2 phút timeout
    });

    collector.on("collect", async (interaction) => {
      try {
        // Guard: chỉ người gửi lệnh mới click được
        if (interaction.user.id !== message.author.id) {
          try {
            return await interaction.reply({
              content: "> 🚫 Không phải lệnh của bạn!",
              flags: MessageFlags.Ephemeral,
            });
          } catch {
            return; // interaction đã expired, bỏ qua
          }
        }

        // deposit/withdraw -> showModal rồi awaitModalSubmit inline
        if (interaction.customId === "bank_deposit") {
          await interaction.showModal(buildDepositModal());

          // awaitModalSubmit: wait cho user submit modal này, tied to interaction này
          const modalSubmit = await interaction
            .awaitModalSubmit({
              filter: (i) => i.customId === "bank_modal_deposit",
              time: 30000,
            })
            .catch(() => null);

          if (!modalSubmit) return; // user đóng modal hoặc timeout

          try {
            await modalSubmit.deferUpdate();
          } catch (e) {
            // Ignore if interaction expired, we still want to process the data
          }

          user = await User.findOne({ userId: message.author.id });
          const input = modalSubmit.fields
            .getTextInputValue("bank_amount_input")
            .trim();
          const result = await processDeposit(user, input);

          if (result.error) {
            await msg.edit({ components: [buildErrorUI(result.error)] });
          } else if (result.warning) {
            await msg.edit({ components: [buildWarningUI(result.warning)] });
          } else {
            user = result.user;
            await msg.edit({
              components: [
                buildDepositResultUI(
                  user,
                  result.amount,
                  result.fee,
                  result.finalAmount,
                ),
              ],
            });
          }

          setTimeout(async () => {
            try {
              user = await User.findOne({ userId: message.author.id });
              const { msg: intMsg, user: u } = await getInterestMsg(
                message.author.id,
                user,
              );
              user = u;
              await msg.edit({
                components: [buildMainBankUI(user, message, intMsg)],
              });
            } catch (e) {
              /* msg đã xóa */
            }
          }, 3000);
          return;
        }

        if (interaction.customId === "bank_withdraw") {
          await interaction.showModal(buildWithdrawModal());

          const modalSubmit = await interaction
            .awaitModalSubmit({
              filter: (i) => i.customId === "bank_modal_withdraw",
              time: 30000,
            })
            .catch(() => null);

          if (!modalSubmit) return;

          try {
            await modalSubmit.deferUpdate();
          } catch (e) {
            // Ignore if interaction expired
          }

          user = await User.findOne({ userId: message.author.id });
          const input = modalSubmit.fields
            .getTextInputValue("bank_amount_input")
            .trim();
          const result = await processWithdraw(user, input);

          if (result.error) {
            await msg.edit({ components: [buildErrorUI(result.error)] });
          } else {
            user = result.user;
            await msg.edit({
              components: [
                buildWithdrawResultUI(
                  user,
                  result.amount,
                  result.fee,
                  result.finalAmount,
                ),
              ],
            });
          }

          setTimeout(async () => {
            try {
              user = await User.findOne({ userId: message.author.id });
              const { msg: intMsg, canClaim } = await getInterestMsg(
                message.author.id,
                user,
              ); // Update here
              await msg.edit({
                components: [buildMainBankUI(user, message, intMsg, canClaim)],
              }); // Update here
            } catch (e) {
              /* msg đã xóa */
            }
          }, 3000);
          return;
        }

        // --- CLAIM INTEREST ---
        if (interaction.customId === "bank_claim_interest") {
          try {
            await interaction.deferUpdate();
          } catch (e) {}

          const claimResult = await claimInterest(message.author.id);

          if (claimResult.success) {
            await msg.edit({
              components: [
                buildClaimSuccessUI(
                  claimResult.interestEarned,
                  claimResult.newCash,
                ),
              ],
            });

            setTimeout(async () => {
              try {
                user = await User.findOne({ userId: message.author.id });
                const { msg: intMsg, canClaim } = await getInterestMsg(
                  message.author.id,
                  user,
                );
                await msg.edit({
                  components: [
                    buildMainBankUI(user, message, intMsg, canClaim),
                  ],
                });
              } catch (e) {}
            }, 3000);
          } else {
            await interaction.followUp({
              content: `> ❌ ${claimResult.message}`,
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }

        // Còn lại (upgrade/confirm/cancel) -> deferUpdate rồi msg.edit
        try {
          await interaction.deferUpdate();
        } catch (e) {}

        // Refresh user data từ DB sau khi đã ack
        user = await User.findOne({ userId: message.author.id });

        switch (interaction.customId) {
          // ─── Upgrade button ───
          case "bank_upgrade": {
            const nextTierInfo = getNextTier(user.bank.tier || 1);
            if (!nextTierInfo) {
              await msg.edit({
                components: [
                  buildWarningUI("🎉 Bank đã đạt cấp độ tối đa (Level 10)."),
                ],
              });
              break;
            }
            await msg.edit({
              components: [buildUpgradeInfoUI(user, nextTierInfo)],
            });
            break;
          }

          // ─── Confirm upgrade ───
          case "bank_confirm_upgrade": {
            const nextTierInfo = getNextTier(user.bank.tier || 1);
            if (!nextTierInfo) break;

            if (user.money < nextTierInfo.cost) {
              await msg.edit({
                components: [buildUpgradeInfoUI(user, nextTierInfo)],
              });
              break;
            }

            user.money -= nextTierInfo.cost;
            user.bank.tier = nextTierInfo.level;
            await user.save();

            await msg.edit({
              components: [
                buildUpgradeSuccessUI(nextTierInfo, nextTierInfo.cost),
              ],
            });
            setTimeout(async () => {
              user = await User.findOne({ userId: message.author.id });
              const { msg: intMsg, canClaim: canClaimInterest } =
                await getInterestMsg(message.author.id, user);
              await msg.edit({
                components: [
                  buildMainBankUI(user, message, intMsg, canClaimInterest),
                ],
              });
            }, 3000);
            break;
          }

          // ─── Cancel ───
          case "bank_cancel": {
            const { msg: intMsg, canClaim: canClaimInterest } =
              await getInterestMsg(message.author.id, user);
            await msg.edit({
              components: [
                buildMainBankUI(user, message, intMsg, canClaimInterest),
              ],
            });
            break;
          }
        }
      } catch (err) {
        console.error("Bank Interaction Error:", err);
      }
    });

    collector.on("end", async () => {
      try {
        await msg.edit({
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "> <a:clock:1446769163669602335> Phiên bank đã hết thời gian. Gửi lệnh lại để tương tác.",
              ),
            ),
          ],
        });
      } catch (e) {
        // Message đã bị xóa hoặc không editable
      }
    });
  },
};
