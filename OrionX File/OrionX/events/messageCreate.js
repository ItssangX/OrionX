import {
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import logger from "../utils/logger.js";
import { checkTOS, sendTOSMessage } from "../utils/tosHelper.js";
import {
  isCommandDisabled,
  sendDisabledNotice,
} from "../utils/commandHelper.js";
import { Guild, User } from "../database/models.js";
import {
  getCooldown,
  canBypassCooldown,
  formatCooldown,
} from "../config/cooldownConfig.js";
import { addXP } from "../utils/levelSystem.js";
import { updateQuestProgress } from "../utils/questHelper.js";
import { handleChatAI } from "../utils/chatAI_handler.js";
import {
  checkCaptchaStatus,
  handleCaptchaDMMessage,
} from "../utils/captchaHandler.js";

// Cooldown cho XP từ tin nhắn (tránh spam)
const messageCooldowns = new Map();
const MESSAGE_COOLDOWN = 60000; // 1 phút

import { checkAndSendNotification } from "../scripts/thongbao.js";

export default {
  name: "messageCreate",

  async execute(message, client) {
    try {
      // Bỏ qua bot messages
      if (message.author.bot) return;

      // TRIGGER NOTIFICATION SYSTEM
      // Adapt message object to look like interaction for the helper function
      const notificationContext = {
        user: message.author,
        member: message.member,
        channel: message.channel,
        guild: message.guild,
        replied: false,
        deferred: false,
        followUp: async (opts) => message.channel.send(opts),
        isMessage: true, // Flag to identify source if needed
      };

      checkAndSendNotification(notificationContext).catch(() => {});

      const isDM = !message.guild;

      const prefix = process.env.PREFIX;
      const content = message.content;

      // Handle captcha answers in DM before normal command parsing.
      if (isDM) {
        try {
          const captchaHandled = await handleCaptchaDMMessage(message);
          if (captchaHandled) return;
        } catch (err) {
          logger.error("Error while handling captcha DM message:", err);
        }
      }

      // ==========================================
      // XỬ LÝ TIN NHẮN THƯỜNG (KHÔNG PHẢI LỆNH)
      // ==========================================
      if (!isDM && !content.toLowerCase().startsWith(prefix.toLowerCase())) {
        // Kiểm tra cooldown cho XP
        const now = Date.now();
        const cooldownKey = `${message.author.id}-message`;

        if (messageCooldowns.has(cooldownKey)) {
          const expirationTime = messageCooldowns.get(cooldownKey);
          if (now < expirationTime) {
            return; // Vẫn trong cooldown
          }
        }

        // Thêm XP cho tin nhắn thường (+2 XP)
        await addXP(
          message.author.id,
          message.author.username,
          2,
          message.channel,
        );

        // Update quest: send_messages
        await updateQuestProgress(message.author.id, "send_messages", 1);

        // Set cooldown mới
        messageCooldowns.set(cooldownKey, now + MESSAGE_COOLDOWN);

        // Cleanup cooldowns cũ
        setTimeout(() => {
          messageCooldowns.delete(cooldownKey);
        }, MESSAGE_COOLDOWN);

        // ==========================================
        // TRY CHATAI HANDLER (nếu không phải lệnh)
        // ==========================================
        const chatAIHandled = await handleChatAI(message, client);
        if (chatAIHandled) return; // Nếu ChatAI đã xử lý, dừng lại

        return;
      }

      if (isDM && !content.toLowerCase().startsWith(prefix.toLowerCase()))
        return;

      // Parse command và arguments
      const args = content.slice(prefix.length).trim().split(/ +/);

      let commandName = args.shift().toLowerCase();

      // Tìm command
      let command =
        message.client.commands.get(commandName) ||
        message.client.commands.find((cmd) =>
          cmd.aliases?.map((a) => a.toLowerCase()).includes(commandName),
        );

      // Nếu không tìm thấy, hãy thử kết hợp commandName + argument đầu tiên (cho phép khoảng trắng)
      // Ví dụ: "x help" -> tìm "xhelp"
      if (!command && args.length > 0) {
        const combinedCommand = commandName + args[0];
        command =
          message.client.commands.get(combinedCommand) ||
          message.client.commands.find((cmd) =>
            cmd.aliases?.map((a) => a.toLowerCase()).includes(combinedCommand),
          );

        // Nếu tìm thấy, loại bỏ argument đầu tiên khỏi args
        if (command) {
          commandName = combinedCommand;
          args.shift();
        }
      }

      if (!command) return;

      // ============ KIỂM TRA PERMISSIONS ============
      // Kiểm tra bot có đủ quyền reply không (nếu trong server)
      if (
        !isDM &&
        !message.channel
          .permissionsFor(message.guild.members.me)
          .has("SendMessages")
      ) {
        return; // Không thể reply
      }

      // Kiểm tra user permissions (nếu command yêu cầu và trong server)
      if (!isDM && command.userPermissions) {
        const missingPerms = message.member.permissions.missing(
          command.userPermissions,
        );
        if (missingPerms.length > 0) {
          const permEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(
              `<a:no:1455096623804715080> Bạn thiếu quyền: \`${missingPerms.join(", ")}\``,
            )
            .setTimestamp();

          return message.reply({ embeds: [permEmbed] });
        }
      }

      // Kiểm tra bot permissions (nếu command yêu cầu và trong server)
      if (!isDM && command.botPermissions) {
        const missingPerms = message.guild.members.me.permissions.missing(
          command.botPermissions,
        );
        if (missingPerms.length > 0) {
          const permEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(
              `<a:no:1455096623804715080> Bot thiếu quyền: \`${missingPerms.join(", ")}\``,
            )
            .setTimestamp();

          return message.reply({ embeds: [permEmbed] });
        }
      }

      // ============ KIỂM TRA LỆNH BỊ TẮT ============
      const actualCommandName = command.name.toLowerCase();
      const disabledStatus = await isCommandDisabled(
        message,
        commandName,
        actualCommandName,
      );
      if (disabledStatus) {
        return await sendDisabledNotice(
          message,
          disabledStatus,
          commandName,
          prefix,
        );
      }

      // ============ KIỂM TRA TOS ============
      try {
        const hasAcceptedTOS = await checkTOS(message.author);

        if (!hasAcceptedTOS) {
          const dmSent = await sendTOSMessage(message.author);

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

          return message.reply({
            components: [tosContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      } catch (err) {
        // Tiếp tục thực thi nếu có lỗi TOS
      }

      // ============ KIỂM TRA COOLDOWN ============
      // Khởi tạo cooldowns nếu chưa có
      if (!message.client.cooldowns) {
        message.client.cooldowns = new Map();
      }

      const { cooldowns } = message.client;

      if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Map());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.name);

      // Lấy cooldown từ config (dùng tên command thực, không phải alias)
      const cooldownSeconds = command.cooldown ?? getCooldown(command.name);
      const cooldownAmount = cooldownSeconds * 1000;

      // Check nếu user có bypass cooldown không (bypass chỉ áp dụng trong guild cho admin)
      const bypass = !isDM && canBypassCooldown(message.author, message.guild);

      if (!bypass && cooldownSeconds > 0) {
        if (timestamps.has(message.author.id)) {
          const expirationTime =
            timestamps.get(message.author.id) + cooldownAmount;
          const timeLeftMs = expirationTime - now;

          if (now < expirationTime) {
            // ĐANG TRONG COOLDOWN - GỬI THÔNG BÁO

            // Tính Discord timestamp (giây, không phải ms)
            const expirationTimestamp = Math.floor(expirationTime / 1000);

            const cooldownEmbed = new EmbedBuilder()
              .setTitle(
                " <a:clock:1446769163669602335> Cooldown <a:clock:1446769163669602335> ",
              )
              .setDescription(
                `> - Bạn có thể dùng lệnh \`${prefix}${command.name}\` lại vào <t:${expirationTimestamp}:R>\n\n` +
                  `- <a:clock:1446769163669602335> Cooldown: **${formatCooldown(cooldownSeconds)}**`,
              )
              .setFooter({
                text: "Tin nhắn này sẽ tự động xóa khi hết cooldown",
              })
              .setTimestamp();

            try {
              const reply = await message.reply({ embeds: [cooldownEmbed] });

              // Tự động xóa tin nhắn sau khi hết cooldown
              setTimeout(async () => {
                try {
                  await reply.delete();
                } catch (err) {
                  // Tin nhắn có thể đã bị xóa thủ công
                }
              }, timeLeftMs);
            } catch (err) {
              // Không thể gửi tin nhắn cooldown
            }

            return;
          }
        }

        // Set cooldown mới
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
      }

      // ============ UPDATE QUEST: use_commands ============
      // Track lệnh được dùng cho quest
      try {
        await updateQuestProgress(message.author.id, "use_commands", 1);
      } catch (err) {
        logger.warn(
          `<a:no:1455096623804715080> Lỗi update use_commands quest: ${err.message}`,
        );
      }

      // ============ CHECK CAPTCHA ============
      try {
        let captchaData = await User.findOne({ userId: message.author.id })
          .select("userId username guilds captcha")
          .lean();

        if (!captchaData) {
          // Create new user with minimal data
          const newUser = new User({
            userId: message.author.id,
            username: message.author.username,
            guilds: message.guild ? [message.guild.id] : [],
          });
          await newUser.save();
          captchaData = { userId: message.author.id, captcha: {} };
        } else if (
          message.guild &&
          !captchaData.guilds?.includes(message.guild.id)
        ) {
          // Atomic guild update - no need to load/save full doc
          User.updateOne(
            { userId: message.author.id },
            { $addToSet: { guilds: message.guild.id } },
          ).catch(() => {});
        }

        const canProceed = await checkCaptchaStatus(message, captchaData);

        if (!canProceed) {
          return; // Captcha chặn hoặc chưa verify
        }
      } catch (err) {
        // Lỗi kiểm tra Captcha - bỏ qua
      }

      // ============ THỰC THI LỆNH ============
      try {
        await command.execute(message, args);

        // Thêm XP cho lệnh (+4 XP, chỉ ở server)
        if (!isDM) {
          await addXP(
            message.author.id,
            message.author.username,
            4,
            message.channel,
          );
        }
      } catch (err) {
        logger.error(`Lỗi khi thực thi lệnh ${commandName}:`, err);

        const errorEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("<a:no:1455096623804715080> Lỗi")
          .setDescription(
            "💥 Có lỗi xảy ra khi thực thi lệnh!\n\n" +
              `**Lệnh:** \`${prefix}${commandName}\`\n` +
              `**Lỗi:** \`${err.message}\``,
          )
          .setFooter({ text: "Vui lòng liên hệ developer nếu lỗi tiếp diễn" })
          .setTimestamp();

        try {
          await message.reply({ embeds: [errorEmbed] });
        } catch (replyErr) {
          logger.error("Không thể reply error message:", replyErr);
        }
      }
    } catch (globalError) {
      logger.error(
        `[CRITICAL] Lỗi không mong muốn trong messageCreate:`,
        globalError,
      );
    }
  },
};
