import { acceptTOS } from "../utils/tosHelper.js";
import { User } from "../database/models.js";
import logger from "../utils/logger.js";
import {
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import {
  isCommandDisabled,
  sendDisabledNotice,
  reply,
  update,
} from "../utils/commandHelper.js";

import { checkAndSendNotification } from "../scripts/thongbao.js";
import {
  checkGlobalCooldown,
  setGlobalCooldown,
} from "../utils/cooldownHelper.js";

export default {
  name: "interactionCreate",

  async execute(interaction) {
    // TRIGGER NOTIFICATION SYSTEM
    checkAndSendNotification(interaction).catch(() => {});

    try {
      // ===== XỬ LÝ NÚT TOS =====
      if (interaction.isButton()) {
        if (interaction.customId === "tos_accept") {
          const success = await acceptTOS(interaction.user.id);

          if (success) {
            const successContainer = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "## <a:checkyes:1455096631555915897> Chấp Nhận Thành Công!",
                ),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "**Cảm ơn bạn đã chấp nhận Điều khoản Sử dụng!**\n\n" +
                    "- <a:2giveaway:1446775157036417125> Giờ bạn có thể sử dụng toàn bộ chức năng của bot.\n" +
                    "- <a:lightbulb:1455096627894423637> Gõ `xhelp` để xem danh sách lệnh.\n\n" +
                    "> - 🔗 Getting Started : https://orxdocs.web.app/gettingstarted\n",
                ),
              );

            await update(interaction, {
              components: [successContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          } else {
            await reply(interaction, {
              content:
                "<a:no:1455096623804715080> Có lỗi xảy ra. Vui lòng thử lại!",
              flags: [MessageFlags.Ephemeral],
            });
          }
          return;
        }

        if (interaction.customId === "tos_decline") {
          const declineContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## <a:no:1455096623804715080> Bạn đã từ chối Điều khoản Sử dụng!",
              ),
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "**Rất tiếc!**\n\n" +
                  "Bạn cần chấp nhận Điều khoản Sử dụng để có thể dùng bot.\n\n" +
                  "🔄 Nếu đổi ý, hãy gõ bất kỳ lệnh nào trong server để nhận lại tin nhắn này.",
              ),
            );

          await update(interaction, {
            components: [declineContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      // ===== XỬ LÝ CAPTCHA ADMIN ACTIONS =====
      if (
        interaction.isButton() &&
        interaction.customId.startsWith("captcha_")
      ) {
        const parts = interaction.customId.split("_");
        const action = parts[1]; // unban, mute, ban
        const targetUserId = parts[parts.length - 1]; // Last part is ID
        // Note: for 'ban_permanent', parts are ['captcha', 'ban', 'permanent', 'ID']

        try {
          const userDoc = await User.findOne({ userId: targetUserId }).select(
            "userId username captcha",
          );
          if (!userDoc) {
            return await reply(interaction, {
              content:
                "<a:no:1455096623804715080> Không tìm thấy user trong database.",
              flags: MessageFlags.Ephemeral,
            });
          }

          // --- UNBAN ---
          if (action === "unban") {
            userDoc.captcha.bannedTemporarily = false;
            userDoc.captcha.isPermBanned = false;
            userDoc.captcha.muteUntil = null;
            userDoc.captcha.commandCount = 0; // Reset count
            userDoc.captcha.verificationPending = false;
            userDoc.captcha.challengeAttempts = 0;
            userDoc.captcha.challengeExpiresAt = null;
            userDoc.captcha.currentCaptchaAnswer = null;
            userDoc.captcha.currentCaptchaId = null;
            await userDoc.save();

            await reply(interaction, {
              content: `<a:checkyes:1455096631555915897> Đã unban user **${userDoc.username}**.`,
              flags: MessageFlags.Ephemeral,
            });

            try {
              const user = await interaction.client.users.fetch(targetUserId);
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor("#00FF00")
                    .setTitle("🔓 Tài khoản đã được mở khóa")
                    .setDescription(
                      "Admin đã mở khóa tài khoản của bạn. Bạn có thể tiếp tục sử dụng bot.",
                    )
                    .setTimestamp(),
                ],
              });
            } catch (e) {
              console.log("Cannot DM user");
            }
          }

          // --- BAN PERMANENT ---
          else if (action === "ban") {
            // parts[2] should be 'permanent'
            userDoc.captcha.isPermBanned = true;
            userDoc.captcha.bannedTemporarily = false;
            userDoc.captcha.verificationPending = false;
            userDoc.captcha.challengeAttempts = 0;
            userDoc.captcha.challengeExpiresAt = null;
            userDoc.captcha.currentCaptchaAnswer = null;
            userDoc.captcha.currentCaptchaId = null;
            await userDoc.save();

            await reply(interaction, {
              content: `⛔ Đã ban vĩnh viễn user **${userDoc.username}**.`,
              flags: MessageFlags.Ephemeral,
            });

            try {
              const user = await interaction.client.users.fetch(targetUserId);
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("⛔ Tài khoản bị khóa vĩnh viễn")
                    .setDescription(
                      "Admin đã khóa vĩnh viễn tài khoản của bạn do vi phạm quy định Captcha.",
                    )
                    .setTimestamp(),
                ],
              });
            } catch (e) {
              console.log("Cannot DM user");
            }
          }

          // --- MUTE MENU ---
          else if (action === "mute") {
            const select = new StringSelectMenuBuilder()
              .setCustomId(`captcha_muteselect_${targetUserId}`)
              .setPlaceholder("Chọn thời gian mute")
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel("1 Ngày")
                  .setValue("1"),
                new StringSelectMenuOptionBuilder()
                  .setLabel("2 Ngày")
                  .setValue("2"),
                new StringSelectMenuOptionBuilder()
                  .setLabel("3 Ngày")
                  .setValue("3"),
                new StringSelectMenuOptionBuilder()
                  .setLabel("7 Ngày")
                  .setValue("7"),
              );

            const row = new ActionRowBuilder().addComponents(select);

            await interaction.reply({
              content: `Chọn thời gian mute cho **${userDoc.username}**:`,
              components: [row],
              ephemeral: true,
            });
          }
        } catch (err) {
          console.error("Error handling captcha admin action:", err);
          await reply(interaction, {
            content: "<a:no:1455096623804715080> Có lỗi xảy ra.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      // ===== XỬ LÝ MUTE SELECTION =====
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith("captcha_muteselect_")
      ) {
        const targetUserId = interaction.customId.split("_")[2];
        const days = parseInt(interaction.values[0]);

        try {
          const userDoc = await User.findOne({ userId: targetUserId }).select(
            "userId username captcha",
          );
          if (!userDoc)
            return interaction.reply({
              content: "User not found",
              ephemeral: true,
            });

          const muteDate = new Date();
          muteDate.setDate(muteDate.getDate() + days);

          userDoc.captcha.muteUntil = muteDate;
          userDoc.captcha.bannedTemporarily = false; // Unban temp but mute
          userDoc.captcha.verificationPending = false;
          userDoc.captcha.challengeAttempts = 0;
          userDoc.captcha.challengeExpiresAt = null;
          userDoc.captcha.currentCaptchaAnswer = null;
          userDoc.captcha.currentCaptchaId = null;
          await userDoc.save();

          await update(interaction, {
            content: `<a:checkyes:1455096631555915897> Đã mute **${userDoc.username}** trong ${days} ngày.`,
            components: [],
          });

          try {
            const user = await interaction.client.users.fetch(targetUserId);
            await user.send({
              embeds: [
                new EmbedBuilder()
                  .setColor("#FFA500")
                  .setTitle("🔇 Bạn đã bị Mute")
                  .setDescription(
                    `Admin đã chuyển trạng thái từ Ban sang Mute.\n⏳ Thời gian: **${days} ngày**\n🔓 Mở khóa vào: <t:${Math.floor(muteDate.getTime() / 1000)}:F>`,
                  )
                  .setTimestamp(),
              ],
            });
          } catch (e) {
            console.log("Cannot DM user");
          }
        } catch (err) {
          console.error(err);
          await interaction.reply({
            content: "Error setting mute",
            ephemeral: true,
          });
        }
        return;
      }
      // ===== XỬ LÝ HELP CATEGORY SELECT (Vĩnh viễn) =====
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "help_category_select"
      ) {
        const category = interaction.values[0];
        const container = new ContainerBuilder();

        switch (category) {
          case "economy":
            container
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "# <a:moneybag:1476448471274881024> **Kinh Tế & Cửa Hàng** <a:Shop:1476477591018934417>",
                ),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## <a:moneybag:1476448471274881024> Economy \n\n` +
                    `- \`xcash/xbal\`: Xem số dư hiện có\n` +
                    `- \`xdaily\`: Nhận thưởng hằng ngày\n` +
                    `- \`xwork\`: Làm việc kiếm tiền\n` +
                    `- \`xvote\`: Vote cho bot nhận quà\n` +
                    `- \`xgive\`: Chuyển tiền cho người khác\n` +
                    `- \`xbank\`: Xem ngân hàng\n` +
                    `- \`xtrade\`: Trao đổi vật phẩm & tiền\n` +
                    `## <a:Shop:1476477591018934417> Shop \n\n` +
                    `- \`xshop\`: Cửa hàng vật phẩm\n` +
                    `- \`xinventory\`: Xem túi đồ cá nhân\n` +
                    `- \`xuse\`: Sử dụng vật phẩm mua từ shop`,
                ),
              );
            break;

          case "games":
            container
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "# <:playing:1476453754160283749> **Games & Casino** <:slotmachine:1476448458415276072>",
                ),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## <:playing:1476453754160283749> Games \n\n` +
                    `- \`Xplay\`: Chơi game OrionX trên nền tảng Web (online)\n` +
                    `- \`XWorld\`: Trò chuyện trực tiếp với toàn bộ người chơi bot (online)\n` +
                    `- \`Xminesweeper\`: Trò chơi dò mìn\n` +
                    `- \`Xmemorycard\`: Trò chơi lật thẻ ghi nhớ\n` +
                    `- \`Xcaro\`: Cờ caro đối kháng\n` +
                    `- \`X8ball\`: Bói toán cầu 8 cơ bản\n` +
                    `- \`Xrps\`: Kéo búa bao classic\n` +
                    `## <:slotmachine:1476448458415276072> Casino \n\n` +
                    `- \`Xblackjack\`: Game bài Blackjack\n` +
                    `- \`Xslots\`: Kéo búa bao classic\n` +
                    `- \`Xcoinflip\`: Tung đồng xu may rủi`,
                ),
              );
            break;

          case "pets":
            container
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "# 🐾 **Pet & Battle** <:Battle:1470101035392565299>",
                ),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## 🐾 Pet System \n\n` +
                    `- \`xhunt\`: Đi săn pet mới\n` +
                    `- \`xzoo/xpets\`: Xem bộ sưu tập pet\n` +
                    `- \`xpetcheck\`: Check chỉ số và favorite pet\n` +
                    `- \`xautohunt\`: Thuê bot đi săn pet tự động\n` +
                    `- \`xsellpet\`: Bán pet dư thừa lấy Xcoin\n` +
                    `## <:Battle:1470101035392565299> Battle System \n\n` +
                    `- \`xbattle\`: Chiến đấu (Auto 3v3)\n` +
                    `- \`xteam\`: Quản lý đội hình pet\n` +
                    `- \`xequip\`: Trang bị pet vào team\n` +
                    `- \`xunequip\`: Tháo pet khỏi team\n` +
                    `## <:weapon:1476469242638504036> Weapon System \n\n` +
                    `- \`xweapon\`: Xem kho vũ khí\n` +
                    `- \`xequipweapon\`: Trang bị vũ khí\n` +
                    `- \`xunequipweapon\`: Tháo vũ khí\n` +
                    `- \`xsellweapon\`: Bán vũ khí`,
                ),
              );
            break;

          case "profile":
            container
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "# <:member:1446769169738502165> **Profile & Social** <:leaderboard:1463850215592165448>",
                ),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## <:member:1446769169738502165> Profile \n\n` +
                    `- \`xprofile\`: Xem hồ sơ cá nhân\n` +
                    `- \`xprofileedit\`: Chỉnh sửa hồ sơ cá nhân\n` +
                    `- \`xcard\`: Tạo thẻ thành viên cá nhân\n` +
                    `- \`xrank\`: Cấp độ và kinh nghiệm\n` +
                    `- \`xstreak\`: Xem chuỗi ngày/thắng liên tiếp\n` +
                    `- \`xquest\`: Hệ thống nhiệm vụ\n` +
                    `## <:leaderboard:1463850215592165448> Social \n\n` +
                    `- \`xtop\`: Bảng xếp hạng`,
                ),
              );
            break;

          case "info":
            container
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "# <:informationbadge:1455096618755031192> **Bot Info & Links** <:regionicon_:1476463334042636361>",
                ),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## <:informationbadge:1455096618755031192> Bot Info & Link \n\n` +
                    `- \`xinvite\`: Lấy Link Invite Bot\n` +
                    `- \`xrules\`: Xem quy định sử dụng bot\n` +
                    `- \`xtos\`: Điều khoản sử dụng dịch vụ\n` +
                    `- \`xping\`: Kiểm tra độ trễ bot\n` +
                    `- \`xservershard\`: Danh sách máy chủ trên Shard của Server\n` +
                    `- \`xweb\`: Xem tất cả website của bot\n` +
                    `- \`xdocs\`: Xem Link Documentation\n` +
                    `- \`xstatus\`: Xem web trạng thái hoạt động của bot và Shard`,
                ),
              );
            break;

          case "utility":
            container
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "# <:Utility:1456810282465624135> **Utility & Config** <:settings:1476490286829146225>",
                ),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## <:Utility:1456810282465624135> Utility \n\n` +
                    `- \`xgstart\`: Tạo sự kiện giveaway\n` +
                    `- \`xtts\`: Chuyển văn bản thành giọng nói (Text-to-speech)\n` +
                    `## <:settings:1476490286829146225> Config \n\n` +
                    `- \`xenable/xdisable\`: Bật/Tắt module lệnh trong server\n` +
                    `- \`xdisablelist\`: Xem các module đang bị tắt`,
                ),
              );
            break;
        }

        // Reset selection placeholder on original message
        const originalMenu = StringSelectMenuBuilder.from(
          interaction.component,
        );
        originalMenu.setPlaceholder("📋 Xem danh mục khác...");
        const row = new ActionRowBuilder().addComponents(originalMenu);

        await reply(interaction, {
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        await interaction.message.edit({ components: [row] });
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(
          interaction.commandName,
        );
        if (!command) return;

        // ============ KIỂM TRA TOS ============
        try {
          const exemptTOSCommands = [
            "help",
            "disable",
            "enable",
            "tos",
            "rules",
          ];
          const isExempt = exemptTOSCommands.includes(
            command.name.toLowerCase(),
          );

          const { checkTOS, sendTOSMessage } =
            await import("../utils/tosHelper.js");
          const hasAcceptedTOS = await checkTOS(interaction.user);

          if (!hasAcceptedTOS && !isExempt) {
            const dmSent = await sendTOSMessage(interaction.user);

            const {
              ContainerBuilder,
              TextDisplayBuilder,
              SeparatorBuilder,
              SeparatorSpacingSize,
            } = await import("discord.js");

            const tosContainer = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## 📜 ĐIỀU KHOẢN SỬ DỤNG"),
              )
              .addSeparatorComponents(
                new SeparatorBuilder()
                  .setDivider(true)
                  .setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  dmSent
                    ? "**Vui lòng kiểm tra DM để chấp nhận ToS trước khi sử dụng bot!**\n\n" +
                        "<a:checkyes:1455096631555915897> Sau khi chấp nhận, bạn có thể thực hiện lệnh ngay lập tức."
                    : "<a:no:1455096623804715080> **Không thể gửi DM cho bạn!**\n\n" +
                        "Vui lòng:\n" +
                        "1. Bật DM từ server members\n" +
                        "2. Thử lại lệnh",
                ),
              );

            return await reply(interaction, {
              components: [tosContainer],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
          }
        } catch (err) {
          console.error("Lỗi check TOS interaction:", err);
        }

        // ============ KIỂM TRA LỆNH BỊ TẮT ============
        const actualCommandName = command.name.toLowerCase();
        const disabledStatus = await isCommandDisabled(
          interaction,
          interaction.commandName,
          actualCommandName,
        );
        if (disabledStatus) {
          return await sendDisabledNotice(
            interaction,
            disabledStatus,
            interaction.commandName,
            "/",
          );
        }

        // ============ KIỂM TRA COOLDOWN ============
        const cooldownCheck = await checkGlobalCooldown(
          interaction.user.id,
          actualCommandName,
          interaction.user,
          interaction.guild,
        );
        if (cooldownCheck.isOnCooldown) {
          const cooldownEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("⏰ Cooldown đang hoạt động")
            .setDescription(
              `Bạn cần chờ **${cooldownCheck.formattedTime}** nữa trước khi sử dụng lệnh này.`,
            )
            .setFooter({ text: `Lệnh: ${interaction.commandName}` })
            .setTimestamp();

          return await reply(interaction, {
            embeds: [cooldownEmbed],
            flags: MessageFlags.Ephemeral,
          });
        }

        // ============ THỰC THI LỆNH ============
        try {
          await command.execute(interaction);

          // Đặt cooldown sau khi thực thi thành công
          await setGlobalCooldown(interaction.user.id, actualCommandName);
        } catch (error) {
          console.error(
            `Lỗi khi thực thi slash command ${interaction.commandName}:`,
            error,
          );

          try {
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp({
                content:
                  "<a:no:1455096623804715080> Có lỗi xảy ra khi thực thi lệnh!",
                flags: MessageFlags.Ephemeral,
              });
            } else {
              await interaction.reply({
                content:
                  "<a:no:1455096623804715080> Có lỗi xảy ra khi thực thi lệnh!",
                flags: MessageFlags.Ephemeral,
              });
            }
          } catch (reportErr) {
            console.error(
              "[INTERACTION ERROR] Failed to report error to user:",
              reportErr.message,
            );
          }
        }
      }
    } catch (globalError) {
      logger.error(
        `[CRITICAL] Lỗi không mong muốn trong interactionCreate:`,
        globalError,
      );
    }
  },
};
