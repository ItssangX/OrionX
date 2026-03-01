import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from "discord.js";
import { User } from "../../database/models.js";
import logger from "../../utils/logger.js";
import {
  logAdminAction,
  getAdminLogs,
  getAdminLogsForTarget,
  getAdminLogsPaginated,
  getAdminLogsForTargetPaginated,
} from "../../utils/adminLog.js";
import { ADMIN_ID } from "../../config/captchaConfig.js";

const ADMIN_MAIN = ADMIN_ID;

export default {
  name: "admin",
  aliases: ["adm", "adminlist", "logs", "adminlogs", "log"],
  description: "Hệ thống quản lý admin",

  async execute(message, args) {
    try {
      // Nếu command name là logs/adminlogs/log, langsung hiển thị logs
      const commandName = message.content
        .slice(process.env.PREFIX.length)
        .trim()
        .split(/ +/)[0]
        .toLowerCase();

      let subcommand;
      if (
        commandName === "logs" ||
        commandName === "adminlogs" ||
        commandName === "log"
      ) {
        // Direct call kiểu: x logs hoặc x adminlogs
        subcommand = "logs";
      } else {
        // Normal call kiểu: x admin logs
        subcommand = args[0]?.toLowerCase();
      }

      switch (subcommand) {
        case "add":
          return await handleAdminAdd(message, args);
        case "kick":
          return await handleAdminKick(message, args);
        case "give":
          return await handleAdminGive(message, args);
        case "set":
          return await handleAdminSet(message, args);
        case "list":
          return await handleAdminList(message);
        case "logs":
          return await handleAdminLogs(message, args);
        case "ban":
          return await handleAdminBan(message, args);
        case "unban":
          return await handleAdminUnban(message, args);
        case "mute":
          return await handleAdminMute(message, args);
        case "rsdata":
          return await handleAdminRsData(message, args);
        default:
          const helpContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "## <:staff1:1474807260109607177> Admin SYS <:moderatoricon:1474807258331348992> ",
              ),
            )
            .addSeparatorComponents(
              new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `\`admin add @user\` - Thêm admin (Admin Main)\n` +
                  `\`admin kick @user\` - Xóa admin (Admin Main)\n` +
                  `\`admin give @user <amount>\` - Tặng tiền (Admin)\n` +
                  `\`admin set @user +/-<amount>\` - Set tiền (Admin)\n` +
                  `\`admin list\` - Xem danh sách admin\n` +
                  `\`admin logs [@user]\` - Xem lịch sử admin\n` +
                  `\`admin ban @user [reason]\` - Ban user (Admin Main)\n` +
                  `\`admin ban list\` - Xem danh sách bị ban (Admin Main)\n` +
                  `\`admin unban @user\` - Gỡ ban user (Admin Main)\n` +
                  `\`admin mute @user <time>\` - Mute user (Admin Main)\n` +
                  `\`admin rsdata @user\` - Reset data user (Admin Main)`,
              ),
            );
          return message.reply({
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2,
          });
      }
    } catch (error) {
      logger.error("<a:no:1455096623804715080> Lỗi admin command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể thực thi lệnh.",
        ),
      );
      message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};

// ============================================
// ADMIN ADD
// ============================================
async function handleAdminAdd(message, args) {
  // Chỉ Admin Main có quyền
  if (message.author.id !== ADMIN_MAIN) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Chỉ Admin Main mới có quyền thêm admin!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const target = message.mentions.users.first();
  if (!target) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Vui lòng mention user cần thêm!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  try {
    const user = await User.findOne({ userId: target.id });
    if (!user) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> <a:no:1455096623804715080> **Không tìm thấy user \`${target.username}\`!**`,
        ),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (user.isAdmin) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> <:warning:1455096625373380691> **${target.username}** đã là admin rồi!`,
        ),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    user.isAdmin = true;
    await user.save();

    await logAdminAction(
      message.author.id,
      message.author.username,
      "add",
      target.id,
      target.username,
      null,
      null,
      true,
      null,
      `Added as admin`,
    );
    logger.info(
      `<a:checkyes:1455096631555915897> [ADMIN] Added ${target.username} as admin`,
    );

    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <a:checkyes:1455096631555915897> Thêm Admin Thành Công <:staff1:1474807260109607177>",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> **User:** ${target} (${target.id})\n` +
            `> **Trạng thái:** Đã trở thành Admin\n` +
            `> **Bởi:** ${message.author.username}`,
        ),
      );

    message.reply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    logger.error("Lỗi admin add:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi thêm admin!");
  }
}

// ============================================
// ADMIN KICK
// ============================================
async function handleAdminKick(message, args) {
  // Chỉ Admin Main có quyền
  if (message.author.id !== ADMIN_MAIN) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Chỉ Admin Main mới có quyền xóa admin!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const target = message.mentions.users.first();
  if (!target) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Vui lòng mention user cần xóa!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  if (target.id === ADMIN_MAIN) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Không thể xóa Admin Main!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  try {
    const user = await User.findOne({ userId: target.id });
    if (!user) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> <a:no:1455096623804715080> **Không tìm thấy user \`${target.username}\`!**`,
        ),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (!user.isAdmin) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> <:warning:1455096625373380691> **${target.username}** không phải admin!`,
        ),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    user.isAdmin = false;
    await user.save();

    await logAdminAction(
      message.author.id,
      message.author.username,
      "kick",
      target.id,
      target.username,
      null,
      null,
      true,
      null,
      `Removed from admin`,
    );
    logger.info(
      `<a:checkyes:1455096631555915897> [ADMIN] Removed ${target.username} from admin`,
    );

    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <a:checkyes:1455096631555915897> Kick Admin Thành Công <:staff1:1474807260109607177>",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> **User:** ${target} (${target.id})\n` +
            `> **Trạng thái:** Không còn là Admin\n` +
            `> **Bởi:** ${message.author.username}`,
        ),
      );

    message.reply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    logger.error("Lỗi admin kick:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi xóa admin!");
  }
}

// ============================================
// ADMIN GIVE (Tặng tiền)
// ============================================
async function handleAdminGive(message, args) {
  const isAdminMain = message.author.id === ADMIN_MAIN;
  const user = await User.findOne({ userId: message.author.id });

  // Chỉ admin có quyền (Admin Main hoặc admin được add)
  if (!isAdminMain && !user?.isAdmin) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Bạn không phải admin!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const target = message.mentions.users.first();
  if (!target) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Vui lòng mention user cần tặng tiền!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const amount = parseInt(args[2]);
  if (isNaN(amount) || amount <= 0) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Vui lòng nhập số tiền hợp lệ! (>0)**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  try {
    const targetUser = await User.findOne({ userId: target.id });
    if (!targetUser) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> <a:no:1455096623804715080> **Không tìm thấy user \`${target.username}\`!**`,
        ),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    targetUser.money += amount;
    await targetUser.save();

    await logAdminAction(
      message.author.id,
      message.author.username,
      "give",
      target.id,
      target.username,
      amount,
      "+",
      true,
      null,
      `Gave ${amount} Xcoin`,
    );
    logger.info(
      `💰 [ADMIN] ${message.author.username} gave ${amount} to ${target.username}`,
    );

    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <a:checkyes:1455096631555915897> Successful! <a:pixelcoin:1456194056798339104> ",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> - <:member:1446769169738502165> **Người nhận:** ${target.username}\n` +
            `> - <a:pixelcoin:1456194056798339104> **Số tiền:** + \`${amount.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
            `> - <a:money:1455553866182430751> **Số dư mới:** \`${targetUser.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
            `> - <:ownericon:1474807272130613268> **Bởi:** ${message.author.username}`,
        ),
      );

    message.reply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    logger.error("Lỗi admin give:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi tặng tiền!");
  }
}

// ============================================
// ADMIN SET (Set tiền)
// ============================================
async function handleAdminSet(message, args) {
  const isAdminMain = message.author.id === ADMIN_MAIN;
  const user = await User.findOne({ userId: message.author.id });

  // Chỉ admin có quyền (Admin Main hoặc admin được add)
  if (!isAdminMain && !user?.isAdmin) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Bạn không phải admin!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const target = message.mentions.users.first();
  if (!target) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Vui lòng mention user!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const amountStr = args[2];
  if (!amountStr || !amountStr.match(/^[+-]\d+$/)) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Format:** `admin set @user +/-<amount>` (ví dụ: +5000 hoặc -3000)",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const amount = parseInt(amountStr);

  try {
    const targetUser = await User.findOne({ userId: target.id });
    if (!targetUser) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> <a:no:1455096623804715080> **Không tìm thấy user \`${target.username}\`!**`,
        ),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const oldMoney = targetUser.money;
    targetUser.money = Math.max(0, targetUser.money + amount);
    await targetUser.save();

    const change = targetUser.money - oldMoney;
    const emoji = change >= 0 ? "📈" : "📉";
    const sign = amount > 0 ? "+" : "";

    await logAdminAction(
      message.author.id,
      message.author.username,
      "set",
      target.id,
      target.username,
      Math.abs(amount),
      sign || "-",
      true,
      null,
      `Set money: ${oldMoney} → ${targetUser.money}`,
    );
    logger.info(
      `💰 [ADMIN] ${message.author.username} set money for ${target.username}: ${amount}`,
    );

    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:checkyes:1455096631555915897> Cập Nhật Tiền Thành Công <a:pixelcoin:1456194056798339104> `,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> **User:** ${target.username}\n` +
            `> **Thay đổi:** \`${change > 0 ? "+" : ""}${change.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
            `> **Số dư:** \`${oldMoney.toLocaleString()}\` → \`${targetUser.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n` +
            `> **Bởi:** ${message.author.username}`,
        ),
      );

    message.reply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    logger.error("Lỗi admin set:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi cập nhật tiền!");
  }
}

// ============================================
// ADMIN LIST (Danh sách admin)
// ============================================
async function handleAdminList(message) {
  try {
    const admins = await User.find({ isAdmin: true })
      .select("userId username")
      .sort({ _id: -1 });

    if (admins.length === 0) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Không có admin nào!**",
        ),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const listContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <:staff1:1474807260109607177> Admin List <:moderatoricon:1474807258331348992> (${admins.length})`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      );

    let adminList = "";
    admins.forEach((admin, index) => {
      const tag =
        admin.userId === ADMIN_MAIN ? " <:ownerids:1455536322297991457>" : "";
      adminList += `${index + 1}. **${admin.username}**${tag}\n\`ID: ${admin.userId}\`\n\n`;
    });

    listContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(adminList),
    );
    listContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `*Yêu cầu bởi ${message.author.username}*`,
      ),
    );

    message.reply({
      components: [listContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    logger.error("Lỗi admin list:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi lấy danh sách admin!");
  }
}

// ============================================
// ADMIN LOGS (Xem lịch sử admin)
// ============================================
async function handleAdminLogs(message, args) {
  const isAdminMain = message.author.id === ADMIN_MAIN;
  const user = await User.findOne({ userId: message.author.id });
  const isAdmin = user?.isAdmin || isAdminMain;

  // Chỉ admin có quyền xem logs
  if (!isAdmin) {
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> **Bạn không phải admin!**",
      ),
    );
    return message.reply({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const targetMention = message.mentions.users.first();
  const page = 0;
  const logsPerPage = 10;

  try {
    // Nếu mention user, hiển thị logs của user đó
    if (targetMention) {
      await displayAdminLogsForTarget(
        message,
        targetMention.id,
        page,
        logsPerPage,
        isAdminMain,
        isAdmin,
      );
    } else {
      // Hiển thị tất cả logs với menu chọn admin
      await displayAllLogsWithFilter(message, page, logsPerPage, isAdminMain);
    }
  } catch (error) {
    logger.error("Lỗi admin logs:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi lấy lịch sử!");
  }
}

// Hiển thị menu chọn admin
async function displayAdminSelectionMenu(message, page, logsPerPage) {
  try {
    const admins = await User.find({ isAdmin: true })
      .select("userId username")
      .sort({ _id: -1 });

    if (admins.length === 0) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent("> ℹ️ **Không có admin nào!**"),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // Tạo select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("select_admin_logs")
      .setPlaceholder("Chọn admin để xem logs...");

    admins.slice(0, 25).forEach((admin) => {
      const label =
        admin.userId === ADMIN_MAIN ? `${admin.username} 👑` : admin.username;
      selectMenu.addOptions({
        label: label,
        value: admin.userId,
        description: `Xem logs của ${admin.username}`,
      });
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 📋 LỊCH SỬ ADMIN"),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Có **${admins.length}** admin. Chọn admin để xem chi tiết logs của họ.`,
        ),
      )
      .addActionRowComponents(row);

    const reply = await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    // Handle select menu
    const collector = reply.createMessageComponentCollector({
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content:
            "> <a:no:1455096623804715080> Bạn không có quyền sử dụng menu này!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.isStringSelectMenu()) {
        const selectedAdminId = interaction.values[0];

        try {
          // Không dùng deferUpdate vì sẽ dùng update sau đó
          // await interaction.deferUpdate();

          const { logs, total, pages } = await getAdminLogsPaginated(
            selectedAdminId,
            0,
            logsPerPage,
          );

          if (logs.length === 0) {
            const errContainer =
              new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "> ℹ️ **Admin này không có log nào!**",
                ),
              );
            return interaction.followUp({
              components: [errContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          }

          const adminName = logs[0]?.adminUsername || "Unknown";
          const logsContainer = buildLogsContainer(
            0,
            logs,
            total,
            pages,
            selectedAdminId,
            message.author.username,
            adminName,
          );

          // Gửi tin nhắn mới với logs
          // Cập nhật interaction thay vì followUp để tránh lỗi
          await interaction.update({
            components: [logsContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          // Hiển thị logs với pagination (chuyền interaction thay vì reply)
          await displayLogsWithPagination(
            interaction,
            logsContainer,
            0,
            logsPerPage,
            selectedAdminId,
            true,
            message,
          );
        } catch (error) {
          logger.error("Lỗi khi chọn admin:", error);
          interaction.followUp({
            content: "> <a:no:1455096623804715080> Lỗi khi tải logs!",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    });

    collector.on("end", () => {
      // Collector expired
    });
  } catch (error) {
    logger.error("Lỗi display admin selection:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi tải danh sách admin!");
  }
}

// Hiển thị tất cả logs với menu chọn admin
async function displayAllLogsWithFilter(
  message,
  page,
  logsPerPage,
  isAdminMain,
) {
  try {
    // Lấy tất cả logs của tất cả admin
    const logsData = await getAdminLogsPaginated(null, page, logsPerPage);
    const { logs, total, pages } = logsData;

    if (logs.length === 0) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent("> ℹ️ **Không có log nào!**"),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // Lấy danh sách admin để tạo select menu
    const admins = await User.find({ isAdmin: true })
      .select("userId username")
      .sort({ _id: -1 });

    // Build logs container
    const logsContainer = buildLogsContainer(
      page,
      logs,
      total,
      pages,
      null,
      message.author.username,
      "Tất cả Admin",
    );

    // Tạo select menu chọn admin
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("filter_admin_logs_all")
      .setPlaceholder("Chọn admin để filter logs...");

    // Thêm option "Tất cả"
    selectMenu.addOptions({
      label: "📊 Tất cả logs",
      value: "all",
      description: "Xem logs của tất cả admin",
    });

    // Thêm các admin
    admins.slice(0, 24).forEach((admin) => {
      const label =
        admin.userId === ADMIN_MAIN ? `${admin.username} 👑` : admin.username;
      selectMenu.addOptions({
        label: label,
        value: admin.userId,
        description: `Xem logs của ${admin.username}`,
      });
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Thêm row chọn admin vào container
    logsContainer.addActionRowComponents(row);

    // Thêm nút chuyển trang
    const paginationRow = new ActionRowBuilder();

    if (page > 0) {
      paginationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_logs_page_prev_all_${page}`)
          .setLabel("⬅️ Trang trước")
          .setStyle(ButtonStyle.Primary),
      );
    }

    if (page < pages - 1) {
      paginationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_logs_page_next_all_${page}`)
          .setLabel("Trang sau ➡️")
          .setStyle(ButtonStyle.Primary),
      );
    }

    if (paginationRow.components.length > 0) {
      logsContainer.addActionRowComponents(paginationRow);
    }

    const reply = await message.reply({
      components: [logsContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // Handle interactions
    const collector = reply.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content:
            "> <a:no:1455096623804715080> Bạn không có quyền sử dụng menu này!",
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        if (interaction.isStringSelectMenu()) {
          // Handle select menu
          const selectedAdminId = interaction.values[0];
          let newLogsData = {};
          if (selectedAdminId === "all") {
            newLogsData = await getAdminLogsPaginated(null, 0, logsPerPage);
          } else {
            newLogsData = await getAdminLogsPaginated(
              selectedAdminId,
              0,
              logsPerPage,
            );
          }

          const {
            logs: newLogs,
            total: newTotal,
            pages: newPages,
          } = newLogsData;

          if (newLogs.length === 0) {
            const errContainer =
              new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  "> ℹ️ **Không có log nào!**",
                ),
              );
            return interaction.followUp({
              components: [errContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          }

          const adminData =
            selectedAdminId === "all"
              ? "Tất cả Admin"
              : newLogs[0]?.adminUsername || "Unknown";
          const updatedContainer = buildLogsContainer(
            0,
            newLogs,
            newTotal,
            newPages,
            selectedAdminId === "all" ? null : selectedAdminId,
            message.author.username,
            adminData,
          );

          // Tạo lại select menu
          const newSelectMenu = new StringSelectMenuBuilder()
            .setCustomId("filter_admin_logs_all")
            .setPlaceholder("Chọn admin để filter logs...");

          newSelectMenu.addOptions({
            label: "📊 Tất cả logs",
            value: "all",
            description: "Xem logs của tất cả admin",
          });

          admins.slice(0, 24).forEach((admin) => {
            const label =
              admin.userId === ADMIN_MAIN
                ? `${admin.username} 👑`
                : admin.username;
            newSelectMenu.addOptions({
              label: label,
              value: admin.userId,
              description: `Xem logs của ${admin.username}`,
            });
          });

          const newRow = new ActionRowBuilder().addComponents(newSelectMenu);
          updatedContainer.addActionRowComponents(newRow);

          // Thêm nút chuyển trang (reset về page 0)
          const newPaginationRow = new ActionRowBuilder();

          if (0 < newPages - 1) {
            newPaginationRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`admin_logs_page_next_${selectedAdminId}_0`)
                .setLabel("Trang sau ➡️")
                .setStyle(ButtonStyle.Primary),
            );
          }

          if (newPaginationRow.components.length > 0) {
            updatedContainer.addActionRowComponents(newPaginationRow);
          }

          await interaction.update({
            components: [updatedContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } else if (interaction.isButton()) {
          // Handle pagination buttons
          const [action, targetId, currentPage] = interaction.customId
            .split("_")
            .slice(3);
          const pageNum = parseInt(currentPage);
          const newPage = action === "next" ? pageNum + 1 : pageNum - 1;

          let newLogsData = {};
          if (targetId === "all") {
            newLogsData = await getAdminLogsPaginated(
              null,
              newPage,
              logsPerPage,
            );
          } else {
            newLogsData = await getAdminLogsPaginated(
              targetId,
              newPage,
              logsPerPage,
            );
          }

          const {
            logs: newLogs,
            total: newTotal,
            pages: newPages,
          } = newLogsData;

          const adminData =
            targetId === "all"
              ? "Tất cả Admin"
              : newLogs[0]?.adminUsername || "Unknown";
          const updatedContainer = buildLogsContainer(
            newPage,
            newLogs,
            newTotal,
            newPages,
            targetId === "all" ? null : targetId,
            message.author.username,
            adminData,
          );

          // Tạo lại select menu
          const newSelectMenu = new StringSelectMenuBuilder()
            .setCustomId("filter_admin_logs_all")
            .setPlaceholder("Chọn admin để filter logs...");

          newSelectMenu.addOptions({
            label: "📊 Tất cả logs",
            value: "all",
            description: "Xem logs của tất cả admin",
          });

          admins.slice(0, 24).forEach((admin) => {
            const label =
              admin.userId === ADMIN_MAIN
                ? `${admin.username} 👑`
                : admin.username;
            newSelectMenu.addOptions({
              label: label,
              value: admin.userId,
              description: `Xem logs của ${admin.username}`,
            });
          });

          const newRow = new ActionRowBuilder().addComponents(newSelectMenu);
          updatedContainer.addActionRowComponents(newRow);

          // Thêm nút chuyển trang
          const newPaginationRow = new ActionRowBuilder();

          if (newPage > 0) {
            newPaginationRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`admin_logs_page_prev_${targetId}_${newPage}`)
                .setLabel("⬅️ Trang trước")
                .setStyle(ButtonStyle.Primary),
            );
          }

          if (newPage < newPages - 1) {
            newPaginationRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`admin_logs_page_next_${targetId}_${newPage}`)
                .setLabel("Trang sau ➡️")
                .setStyle(ButtonStyle.Primary),
            );
          }

          if (newPaginationRow.components.length > 0) {
            updatedContainer.addActionRowComponents(newPaginationRow);
          }

          await interaction.update({
            components: [updatedContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      } catch (error) {
        logger.error("Lỗi khi handle interaction:", error);
        interaction.reply({
          content: "> <a:no:1455096623804715080> Lỗi khi cập nhật!",
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on("end", () => {
      // Collector expired
    });
  } catch (error) {
    logger.error("Lỗi display all logs with filter:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi lấy lịch sử!");
  }
}

// Hiển thị logs của một admin cụ thể (target)
async function displayAdminLogsForTarget(
  message,
  targetAdminId,
  page,
  logsPerPage,
  isAdminMain,
  isAdmin,
) {
  try {
    const logsData = await getAdminLogsPaginated(
      targetAdminId,
      page,
      logsPerPage,
    );
    const { logs, total, pages } = logsData;

    if (logs.length === 0) {
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent("> ℹ️ **Không có log nào!**"),
      );
      return message.reply({
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const adminName = logs[0]?.adminUsername || "Unknown";
    const logsContainer = buildLogsContainer(
      page,
      logs,
      total,
      pages,
      targetAdminId,
      message.author.username,
      adminName,
    );
    await displayLogsWithPagination(
      message,
      logsContainer,
      page,
      logsPerPage,
      targetAdminId,
      isAdminMain,
    );
  } catch (error) {
    logger.error("Lỗi display logs for target:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi lấy lịch sử!");
  }
}

// Build container cho logs
function buildLogsContainer(
  pageNum,
  logsArray,
  totalLogs,
  totalPages,
  selectedAdminId,
  requesterUsername,
  adminName = null,
) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        adminName
          ? `## 📋 Logs Admin - ${adminName} (${totalLogs} tổng cộng)`
          : `## 📋 Logs Admin -  (${totalLogs} tổng cộng)`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );

  let logsList = "";
  logsArray.forEach((log, index) => {
    const date = new Date(log.timestamp).toLocaleDateString("vi-VN");
    const time = new Date(log.timestamp).toLocaleTimeString("vi-VN");
    const action = log.action.toUpperCase();
    const amount = log.amount ? ` (\`${log.amountSign}${log.amount}\`)` : "";
    const status = log.success
      ? "<a:checkyes:1455096631555915897>"
      : "<a:no:1455096623804715080>";

    logsList += `**${index + 1}.** [${date} ${time}] ${status}\n`;
    logsList += `> ${log.adminUsername} → ${log.targetUsername}\n`;
    logsList += `> **Action:** ${action}${amount}\n\n`;
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(logsList),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Trang ${pageNum + 1}/${totalPages}** | *Yêu cầu bởi ${requesterUsername}*`,
    ),
  );

  return container;
}

// Hiển thị logs với nút pagination
async function displayLogsWithPagination(
  message,
  initialContainer,
  page,
  logsPerPage,
  selectedAdminId,
  isAdminMain,
  originalMessage = null,
) {
  try {
    // Thêm nút pagination vào container
    const row = new ActionRowBuilder();

    if (page > 0) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `admin_logs_page_prev_${selectedAdminId || "all"}_${page}`,
          )
          .setLabel("⬅️ Trang trước")
          .setStyle(ButtonStyle.Primary),
      );
    }

    if (
      page <
      (initialContainer._components[3]?.label?.split("/")[1] || 1) - 1
    ) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `admin_logs_page_next_${selectedAdminId || "all"}_${page}`,
          )
          .setLabel("Trang sau ➡️")
          .setStyle(ButtonStyle.Primary),
      );
    }

    if (row.components.length > 0) {
      initialContainer.addActionRowComponents(row);
    }

    const reply = await message.reply({
      components: [initialContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // Handle pagination buttons
    const collector = reply.createMessageComponentCollector({
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (
        interaction.user.id !==
        (originalMessage?.author.id || message.author.id)
      ) {
        return interaction.reply({
          content:
            "> <a:no:1455096623804715080> Bạn không có quyền sử dụng nút này!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.isButton()) {
        const parts = interaction.customId.split("_");
        const action = parts[3]; // next / prev
        const targetId = parts[4]; // adminId or "all"
        const pageNum = parseInt(parts[5]);
        const newPage = action === "next" ? pageNum + 1 : pageNum - 1;

        try {
          let newLogsData = {};
          if (targetId !== "all") {
            newLogsData = await getAdminLogsPaginated(
              targetId,
              newPage,
              logsPerPage,
            );
          } else {
            newLogsData = await getAdminLogsPaginated(
              null,
              newPage,
              logsPerPage,
            );
          }

          const {
            logs: newLogs,
            total: newTotal,
            pages: newPages,
          } = newLogsData;

          const adminData =
            targetId === "all"
              ? "Tất cả Admin"
              : newLogs[0]?.adminUsername || "Admin";

          const updatedContainer = buildLogsContainer(
            newPage,
            newLogs,
            newTotal,
            newPages,
            targetId === "all" ? null : targetId,
            originalMessage?.author.username || message.author.username,
            adminData,
          );

          // Build row pagination cho container mới
          const newRow = new ActionRowBuilder();

          if (newPage > 0) {
            newRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`admin_logs_page_prev_${targetId}_${newPage}`)
                .setLabel("⬅️ Trang trước")
                .setStyle(ButtonStyle.Primary),
            );
          }

          if (newPage < newPages - 1) {
            newRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`admin_logs_page_next_${targetId}_${newPage}`)
                .setLabel("Trang sau ➡️")
                .setStyle(ButtonStyle.Primary),
            );
          }

          if (newRow.components.length > 0) {
            updatedContainer.addActionRowComponents(newRow);
          }

          await interaction.update({
            components: [updatedContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } catch (error) {
          logger.error("Lỗi khi cập nhật logs:", error);
          if (!interaction.replied && !interaction.deferred) {
            interaction.reply({
              content: "> <a:no:1455096623804715080> Lỗi khi tải trang!",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    });

    collector.on("end", () => {
      // Collector expired
    });
  } catch (error) {
    logger.error("Lỗi display logs with pagination:", error);
  }
}

// ============================================
// ADMIN BAN / UNBAN / MUTE / RSDATA
// ============================================

async function handleAdminBan(message, args) {
  if (message.author.id !== ADMIN_MAIN) {
    return message.reply(
      "> <a:no:1455096623804715080> Chỉ **Admin Main** mới được dùng lệnh này!",
    );
  }

  // admin ban list
  if (args[1]?.toLowerCase() === "list") {
    try {
      const bannedUsers = await User.find({
        "captcha.isPermBanned": true,
      }).select("userId username captcha.bannedReason captcha.bannedAt");
      if (bannedUsers.length === 0) {
        return message.reply("> ℹ️ **Không có user nào bị ban!**");
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 🔨 DANH SÁCH USER BỊ BAN (${bannedUsers.length})`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        );

      let list = "";
      bannedUsers.forEach((u, i) => {
        const date = u.captcha?.bannedAt
          ? new Date(u.captcha.bannedAt).toLocaleDateString("vi-VN")
          : "Unknown";
        list += `**${i + 1}. ${u.username}** (\`${u.userId}\`)\n> 📅 ${date} - 📝 ${u.captcha?.bannedReason || "Không lý do"}\n\n`;
      });

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(list),
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      logger.error("Lỗi ban list:", error);
      return message.reply(
        "> <a:no:1455096623804715080> Lỗi khi lấy danh sách ban!",
      );
    }
  }

  const target = message.mentions.users.first();
  if (!target) {
    const usage = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## 🔨 LỆNH BAN USER\n> Cú pháp: `admin ban @user [lý do]`\n> Ví dụ: `admin ban @BadUser Spam bot`",
      ),
    );
    return message.reply({
      components: [usage],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  if (target.id === message.author.id)
    return message.reply("> ❌ Không thể tự ban chính mình!");
  if (target.id === ADMIN_MAIN)
    return message.reply("> ❌ Không thể ban Admin Main!");

  const reason = args.slice(2).join(" ") || "Không có lý do";

  try {
    let userData = await User.findOne({ userId: target.id });
    if (!userData)
      userData = new User({ userId: target.id, username: target.username });

    if (userData.captcha?.isPermBanned)
      return message.reply(`> ⚠️ **${target.username}** đã bị ban rồi!`);

    if (!userData.captcha) userData.captcha = {};
    userData.captcha.isPermBanned = true;
    userData.captcha.bannedReason = reason;
    userData.captcha.bannedAt = new Date();
    userData.captcha.bannedBy = message.author.id;
    await userData.save();

    const success = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:moderatoricon:1474807258331348992> User Đã Bị Ban",
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> **User:** ${target.username} (\`${target.id}\`)\n> **Lý do:** ${reason}\n> **Bởi:** ${message.author.username}`,
        ),
      );

    message.reply({
      components: [success],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    logger.error("Lỗi ban:", error);
    message.reply("> ❌ Lỗi khi ban user!");
  }
}

async function handleAdminUnban(message, args) {
  if (message.author.id !== ADMIN_MAIN)
    return message.reply("> <a:no:1455096623804715080> Chỉ **Admin Main**!");

  const target = message.mentions.users.first();
  if (!target) return message.reply("> Cú pháp: `admin unban @user` ");

  try {
    const userData = await User.findOne({ userId: target.id });
    if (!userData || !userData.captcha?.isPermBanned)
      return message.reply("> ⚠️ User này không bị ban!");

    userData.captcha.isPermBanned = false;
    userData.captcha.bannedReason = null;
    userData.captcha.bannedAt = null;
    userData.captcha.bannedBy = null;
    await userData.save();

    message.reply(
      `> <a:checkyes:1455096631555915897> Đã gỡ ban cho **${target.username}**`,
    );
  } catch (error) {
    logger.error("Lỗi unban:", error);
    message.reply("> <a:no:1455096623804715080> Lỗi khi unban!");
  }
}

async function handleAdminMute(message, args) {
  if (message.author.id !== ADMIN_MAIN)
    return message.reply("> <a:no:1455096623804715080> Chỉ **Admin Main**!");

  const target = message.mentions.users.first();
  const timeStr = args[2];

  if (!target || !timeStr) {
    return message.reply(
      "> Cú pháp: `admin mute @user <thời gian>` (10m, 1h, 1d)",
    );
  }

  // Parse thời gian đơn giản
  const match = timeStr.match(/^(\d+)(m|h|d)$/i);
  if (!match) return message.reply("> ❌ Format thời gian: `10m`, `1h`, `1d`!");

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let ms = 0;
  if (unit === "m") ms = value * 60 * 1000;
  else if (unit === "h") ms = value * 60 * 60 * 1000;
  else if (unit === "d") ms = value * 24 * 60 * 60 * 1000;

  if (ms > 30 * 24 * 60 * 60 * 1000)
    return message.reply("> ❌ Tối đa 30 ngày!");

  try {
    let userData = await User.findOne({ userId: target.id });
    if (!userData)
      userData = new User({ userId: target.id, username: target.username });

    const muteUntil = new Date(Date.now() + ms);
    if (!userData.captcha) userData.captcha = {};
    userData.captcha.muteUntil = muteUntil;
    userData.captcha.mutedBy = message.author.id;
    await userData.save();

    message.reply(
      `> 🔇 Đã mute **${target.username}** đến <t:${Math.floor(muteUntil.getTime() / 1000)}:f>`,
    );
  } catch (error) {
    logger.error("Lỗi mute:", error);
    message.reply("> ❌ Lỗi khi mute!");
  }
}

async function handleAdminRsData(message, args) {
  if (message.author.id !== ADMIN_MAIN)
    return message.reply("> <a:no:1455096623804715080> Chỉ **Admin Main**!");

  const target = message.mentions.users.first();
  if (!target)
    return message.reply(
      "> Cú pháp: `admin rsdata @user` (CẢNH BÁO: XÓA HẾT DATA)",
    );

  try {
    const userData = await User.findOne({ userId: target.id });
    if (!userData) return message.reply("> ⚠️ User không tồn tại!");

    // Confirmation logic
    const confirm = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <:warning:1455096625373380691> Xác Nhận Reset Data: ${target.username} <:warning:1455096625373380691>`,
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> **Hành động không thể hoàn tác!**",
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("rs_confirm")
            .setLabel("Xóa Data")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("rs_cancel")
            .setLabel("Hủy")
            .setStyle(ButtonStyle.Secondary),
        ),
      );

    const replyMsg = await message.reply({
      components: [confirm],
      flags: MessageFlags.IsComponentsV2,
    });
    const collector = replyMsg.createMessageComponentCollector({ time: 30000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({
          content: "Nút này không dành cho bạn",
          flags: MessageFlags.Ephemeral,
        });

      if (i.customId === "rs_cancel") {
        const cancelContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:checkyes:1455096631555915897> Đã hủy reset data.",
          ),
        );

        await i.update({
          components: [cancelContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return collector.stop();
      }

      // Reset
      userData.money = 0;
      userData.bank = { balance: 0, capacity: 50000, tier: 1 };
      userData.level = 1;
      userData.exp = 0;
      userData.pets = [];
      userData.weapons = [];
      userData.inventory = [];
      await userData.save();

      await i.update({
        content: `> 🗑️ Đã xóa sạch dữ liệu của **${target.username}**!`,
        components: [],
      });
      collector.stop();
    });
  } catch (error) {
    logger.error("Lỗi rsdata:", error);
    message.reply("> ❌ Lỗi khi reset data!");
  }
}
