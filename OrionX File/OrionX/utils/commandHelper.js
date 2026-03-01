import {
  ContainerBuilder,
  MessageFlags,
  PermissionsBitField,
  TextDisplayBuilder,
} from "discord.js";
import { Guild } from "../database/models.js";

/**
 * Thống nhất cách phản hồi cho cả Message và Interaction
 */
export async function reply(source, options) {
  try {
    if (source.deferred || source.replied) {
      return await source.editReply(options);
    }

    // Nếu là Interaction (Slash)
    if (
      source.isChatInputCommand?.() ||
      source.isButton?.() ||
      source.isStringSelectMenu?.()
    ) {
      return await source.reply(options);
    }

    // Nếu là Message (Prefix)
    return await source.reply(options);
  } catch (err) {
    if (err.code === 10062 || err.code === 40060) {
      // Unknown interaction or Interaction has already been acknowledged
      // This is expected if the network is slow or the interaction expired
      // Just log a warning to avoid cluttering the console with stack traces
      console.warn(
        `[REPLY WARNING] Interaction expired or unknown: ${err.message}`,
      );
      return;
    }
    console.error("[REPLY ERROR] Failed to send response:", err.message);
    // Only log, don't rethrow to avoid crash
  }
}

/**
 * Lấy User ID từ nguồn bất kỳ
 */
export function getUserId(source) {
  return source.author?.id || source.user?.id;
}

/**
 * Lấy User object
 */
export function getUser(source) {
  return source.author || source.user;
}

/**
 * Lấy tham số/options từ nguồn bất kỳ
 */
export function getOption(interaction, name, type = "string") {
  if (!interaction.options) return null;

  switch (type) {
    case "string":
      return interaction.options.getString(name);
    case "user":
      return interaction.options.getUser(name);
    case "number":
      return (
        interaction.options.getNumber(name) ||
        interaction.options.getInteger(name)
      );
    case "boolean":
      return interaction.options.getBoolean(name);
    default:
      return interaction.options.get(name);
  }
}

/**
 * Tính toán số tiền cược (all, half, hoặc số cụ thể)
 */
export function getBetAmount(input, userMoney, maxBet = 250000) {
  if (!input) return 0;

  let amount = 0;
  if (input.toLowerCase() === "all") {
    amount = userMoney;
  } else if (input.toLowerCase() === "half") {
    amount = Math.floor(userMoney / 2);
  } else {
    // Xử lý các tiền tố như 1k, 1m...
    let raw = input.toLowerCase().replace(/,/g, "");
    if (raw.endsWith("k")) amount = parseFloat(raw) * 1000;
    else if (raw.endsWith("m")) amount = parseFloat(raw) * 1000000;
    else amount = parseFloat(raw);
  }

  if (maxBet > 0 && amount > maxBet) amount = maxBet;
  return Math.floor(amount);
}

/**
 * Kiểm tra lệnh có bị tắt trong kênh này không
 */
export async function isCommandDisabled(
  source,
  commandName,
  actualCommandName,
) {
  if (!source.guild) return false;

  // Danh sách lệnh LUÔN LUÔN hoạt động (không thể disable)
  const exemptCommands = ["disable", "enable", "disablelist", "disabledlist"];

  if (
    exemptCommands.includes(commandName) ||
    exemptCommands.includes(actualCommandName)
  ) {
    return false;
  }

  try {
    const guildData = await Guild.findOne({ guildId: source.guild.id });
    if (!guildData?.disabledCommands?.length) return false;

    const channelConfig = guildData.disabledCommands.find(
      (dc) => dc.channelId === source.channel.id,
    );
    if (!channelConfig) return false;

    if (channelConfig.commands.includes("all")) return "all";
    if (
      channelConfig.commands.includes(commandName) ||
      channelConfig.commands.includes(actualCommandName)
    )
      return "single";

    return false;
  } catch (err) {
    console.error("Lỗi check disabled commands:", err);
    return false;
  }
}

/**
 * Gửi thông báo lệnh bị tắt
 */
export async function sendDisabledNotice(
  source,
  type,
  commandName,
  prefix = "x",
) {
  const messageText =
    type === "all"
      ? `## <a:no:1455096623804715080> **Lệnh Bị Tắt**\n - Tất cả lệnh đã bị tắt trên kênh này!\n\n> - Dùng lệnh \`${prefix}enable all\` để bật lại`
      : `## <a:no:1455096623804715080> **Lệnh Bị Tắt**\n - Lệnh \`${prefix}${commandName}\` đã bị tắt trên kênh này!\n\n> - Dùng lệnh \`${prefix}enable (${commandName})\` để bật lại`;

  const disabledContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(messageText),
  );

  const isInteraction =
    source.isChatInputCommand?.() ||
    source.isButton?.() ||
    source.isStringSelectMenu?.();
  const flags = isInteraction
    ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    : MessageFlags.IsComponentsV2;

  return await reply(source, { components: [disabledContainer], flags });
}

/**
 * Thống nhất cách update cho Interaction (Component)
 */
export async function update(interaction, options) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(options);
    }

    if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
      return await interaction.update(options);
    }

    // Fallback to message edit if interaction expired or isn't a component
    if (interaction.message) {
      return await interaction.message.edit(options);
    }

    return await reply(interaction, options);
  } catch (err) {
    // If Unknown Interaction (expired token), try falling back to message edit
    if (err.code === 10062 && interaction.message) {
      try {
        return await interaction.message.edit(options);
      } catch (editErr) {
        console.error("[UPDATE FALLBACK ERROR]", editErr.message);
      }
    }
    console.error("[UPDATE ERROR] Failed to update interaction:", err.message);
  }
}

/**
 * Tạo collector với auto-reject cho người không phải chủ sở hữu
 * @param {Message} message - Message chứa buttons/select menus
 * @param {string} ownerId - ID của người sở hữu (người dùng lệnh)
 * @param {object} options - Options cho collector (time, etc.)
 * @returns {InteractionCollector} Collector đã được cấu hình
 */
export function createOwnerCollector(message, ownerId, options = {}) {
  const collector = message.createMessageComponentCollector({
    ...options,
    // Không dùng filter ở đây, xử lý trong collect event
  });

  // Lắng nghe sự kiện collect để kiểm tra quyền
  const originalOn = collector.on.bind(collector);
  const collectHandlers = [];

  collector.on = function (event, handler) {
    if (event === "collect") {
      collectHandlers.push(handler);
      return this;
    }
    return originalOn(event, handler);
  };

  // Override collect logic
  originalOn("collect", async (interaction) => {
    // Kiểm tra quyền sở hữu
    if (interaction.user.id !== ownerId) {
      try {
        await interaction.reply({
          content:
            "<a:no:1455096623804715080> Đây không phải nút của bạn! Hãy tự sử dụng lệnh để có nút riêng.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        // Ignore errors if already replied
      }
      return; // Không gọi handlers
    }

    // Gọi tất cả handlers đã đăng ký
    for (const handler of collectHandlers) {
      try {
        await handler(interaction);
      } catch (err) {
        if (err.code === 10062 || err.code === 40060) {
          console.warn(
            `[COLLECTOR WARNING] Interaction expired or unknown during handler: ${err.message}`,
          );
        } else {
          console.error("[COLLECTOR ERROR] Handler failed:", err);
        }
      }
    }
  });

  return collector;
}
