import { EmbedBuilder } from "discord.js";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GIFT_EMOJI = "1446769608580399154";
const GIVEAWAY_FILE = join(__dirname, "..", "..", "giveaways.json");

// Load giveaways từ file
function loadGiveaways() {
  try {
    if (fs.existsSync(GIVEAWAY_FILE)) {
      const data = fs.readFileSync(GIVEAWAY_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(
      "<a:no:1455096623804715080> [GIVEAWAY] Lỗi khi load giveaways:",
      error.message,
    );
  }
  return [];
}

// Lưu giveaways vào file
function saveGiveaways(giveaways) {
  try {
    fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(giveaways, null, 2));
  } catch (error) {
    console.error(
      "<a:no:1455096623804715080> [GIVEAWAY] Lỗi khi lưu giveaways:",
      error.message,
    );
  }
}

// Hàm parse thời gian
function parseTime(timeStr) {
  const normalizedStr = timeStr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let totalMs = 0;

  const dayMatch = normalizedStr.match(/(\d+)\s*(ngay|day|d)/i);
  const hourMatch = normalizedStr.match(/(\d+)\s*(gio|hour|h)/i);
  const minuteMatch = normalizedStr.match(/(\d+)\s*(phut|minute|min|m)/i);
  const secondMatch = normalizedStr.match(/(\d+)\s*(giay|second|sec|s)/i);

  if (dayMatch) totalMs += parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000;
  if (hourMatch) totalMs += parseInt(hourMatch[1]) * 60 * 60 * 1000;
  if (minuteMatch) totalMs += parseInt(minuteMatch[1]) * 60 * 1000;
  if (secondMatch) totalMs += parseInt(secondMatch[1]) * 1000;

  return totalMs;
}

// Hàm format thời gian
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ngày`;
  if (hours > 0) return `${hours} giờ`;
  if (minutes > 0) return `${minutes} phút`;
  return `${seconds} giây`;
}

// Hàm gửi DM an toàn
async function safeSendDM(user, content) {
  try {
    await user.send(content);
    return true;
  } catch (error) {
    console.warn(
      `<:warning:1455096625373380691> [GIVEAWAY] Không thể gửi DM cho user ${user.id}:`,
      error.message,
    );
    return false;
  }
}

// Hàm chọn người thắng
async function pickWinners(message, winnerCount) {
  try {
    await message.fetch().catch(() => null);

    console.log(
      `[GIVEAWAY DEBUG] Message reactions cache size: ${message.reactions.cache.size}`,
    );
    console.log(
      `[GIVEAWAY DEBUG] Reactions: ${message.reactions.cache.map((r) => `${r.emoji.name}(${r.emoji.id})`).join(", ")}`,
    );

    const reaction = message.reactions.cache.find(
      (r) =>
        r.emoji?.id === GIFT_EMOJI ||
        r.emoji?.name === "gift" ||
        r.emoji?.name === "\uD83C\uDF81" ||
        r.emoji?.toString?.() === `<:gift:${GIFT_EMOJI}>` ||
        r.emoji?.toString?.() === `<a:gift:${GIFT_EMOJI}>`,
    );
    if (!reaction) {
      console.log(
        `[GIVEAWAY DEBUG] No matching reaction found for GIFT_EMOJI: ${GIFT_EMOJI}`,
      );
      return [];
    }

    const users = await reaction.users.fetch();
    const participants = users.filter((user) => user && !user.bot);

    if (participants.size === 0) return [];

    const participantArray = Array.from(participants.values());
    const winners = [];
    const count = Math.min(winnerCount, participantArray.length);

    while (winners.length < count) {
      const randomIndex = Math.floor(Math.random() * participantArray.length);
      const winner = participantArray[randomIndex];

      if (!winners.includes(winner)) {
        winners.push(winner);
      }
    }

    return winners;
  } catch (error) {
    console.error(
      "<a:no:1455096623804715080> [GIVEAWAY] Lỗi khi chọn người thắng:",
      error.message,
    );
    return [];
  }
}

// Hàm xóa giveaway khỏi file
function removeGiveaway(messageId) {
  try {
    let giveaways = loadGiveaways();
    giveaways = giveaways.filter((g) => g.messageId !== messageId);
    saveGiveaways(giveaways);
  } catch (error) {
    console.error(
      "<a:no:1455096623804715080> [GIVEAWAY] Lỗi khi xóa giveaway:",
      error.message,
    );
  }
}

// Kết thúc giveaway
async function endGiveaway(client, giveawayData) {
  try {
    const channel = await client.channels
      .fetch(giveawayData.channelId)
      .catch(() => null);

    if (!channel) {
      console.log(
        `<:warning:1455096625373380691> [GIVEAWAY] Channel không tồn tại, xóa giveaway ${giveawayData.messageId}`,
      );
      removeGiveaway(giveawayData.messageId);

      try {
        const host = await client.users
          .fetch(giveawayData.hostId)
          .catch(() => null);
        if (host) {
          const errorEmbed = new EmbedBuilder()
            .setColor("#E74C3C")
            .setTitle("<a:no:1455096623804715080> Giveaway Bị Hủy")
            .setDescription(
              `**Xin chào ${host.username}!**\n\n` +
                `> Rất tiếc, giveaway của bạn đã bị hủy vì kênh không còn tồn tại.\n` +
                `> Có thể kênh đã bị xóa hoặc bot mất quyền truy cập.`,
            )
            .addFields(
              {
                name: "<a:clock:1446769163669602335> Phần Thưởng",
                value: `\`\`\`${giveawayData.prize}\`\`\``,
                inline: false,
              },
              {
                name: "📅 Thông Tin",
                value: `> **Thời gian tạo:** <t:${Math.floor((giveawayData.endTime - 86400000) / 1000)}:F>`,
                inline: false,
              },
            )
            .setFooter({ text: "Giveaway System" })
            .setTimestamp();

          await safeSendDM(host, { embeds: [errorEmbed] });
        }
      } catch (err) {
        console.warn(
          "<:warning:1455096625373380691> [GIVEAWAY] Không thể thông báo cho host:",
          err.message,
        );
      }
      return;
    }

    const message = await channel.messages
      .fetch(giveawayData.messageId)
      .catch(() => null);

    if (!message) {
      console.log(
        `<:warning:1455096625373380691> [GIVEAWAY] Message không tồn tại, xóa giveaway ${giveawayData.messageId}`,
      );
      removeGiveaway(giveawayData.messageId);
      return;
    }

    const winners = await pickWinners(message, giveawayData.winnerCount);

    const endEmbed = new EmbedBuilder()
      .setTitle(`**${giveawayData.prize}**`)
      .addFields(
        {
          name: "<a:king:1446770366382084267> Người tạo",
          value: `<@${giveawayData.hostId}>`,
          inline: true,
        },
        {
          name: "<a:gift:1446769608580399154> Người thắng",
          value:
            winners.length > 0
              ? winners.map((w) => w.toString()).join(", ")
              : "Không có người tham gia",
          inline: false,
        },
      )
      .setColor("#FFD700")
      .setTimestamp();

    await message
      .edit({
        content:
          "<a:gift:1446769608580399154> **GIVEAWAY KẾT THÚC** <a:gift:1446769608580399154>",
        embeds: [endEmbed],
      })
      .catch((err) => {
        console.warn(
          "<:warning:1455096625373380691> [GIVEAWAY] Không thể edit message:",
          err.message,
        );
      });

    const guild = channel.guild;
    const guildName = guild.name;
    const guildIcon = guild.iconURL({ dynamic: true, size: 256 }) || null;

    if (winners.length > 0) {
      await channel
        .send({
          content: `### <a:gift:1446769608580399154> Chúc mừng ${winners.map((w) => w.toString()).join(", ")} đã thắng **${giveawayData.prize}**! (Host: <@${giveawayData.hostId}>)\n> - <:link_:1476463379697635348> **[〔 Giveaway〕](${message.url})** <:present:1446769165733199912> `,
          allowedMentions: {
            users: [...winners.map((w) => w.id), giveawayData.hostId],
          },
        })
        .catch(() => null);

      try {
        const host = await client.users
          .fetch(giveawayData.hostId)
          .catch(() => null);
        if (host) {
          const hostEmbed = new EmbedBuilder()
            .setColor("#2ECC71")
            .setDescription(
              `## <a:2giveaway:1446775157036417125> Giveaway Kết Thúc! <a:gift:1446769608580399154>\n\n` +
                `**Xin chào ${host.username}!**\n` +
                `> Giveaway của bạn đã kết thúc và đã chọn được người thắng!`,
            )
            .addFields(
              {
                name: "<a:gift:1446769608580399154> Phần Thưởng",
                value: `\`\`\`${giveawayData.prize}\`\`\``,
                inline: false,
              },
              {
                name: "🏆 Danh Sách Người Thắng",
                value: winners
                  .map((w, i) => `> **${i + 1}.** ${w.tag} (${w.toString()})`)
                  .join("\n"),
                inline: false,
              },
              {
                name: "🔗 Link Giveaway",
                value: `> [〔 Giveaway Link 〕](${message.url})`,
                inline: false,
              },
            )
            .setThumbnail(guildIcon)
            .setFooter({ text: `Giveaway ID: ${message.id} - Giveaway System` })
            .setTimestamp();

          await safeSendDM(host, { embeds: [hostEmbed] });
        }
      } catch (err) {
        console.warn(
          "<:warning:1455096625373380691> [GIVEAWAY] Không thể gửi DM cho host:",
          err.message,
        );
      }

      for (const winner of winners) {
        try {
          const winnerEmbed = new EmbedBuilder()
            .setColor("#FFD700")
            .setDescription(
              `## <a:2giveaway:1446775157036417125> Winner Confirmation! <a:gift:1446769608580399154>\n\n` +
                `**Xin chào ${winner.username}!**\n\n` +
                `> Bạn đã may mắn trúng thưởng trong một giveaway!`,
            )
            .addFields(
              {
                name: "<a:gift:1446769608580399154> Phần Thưởng Của Bạn",
                value: `\`\`\`${giveawayData.prize}\`\`\``,
                inline: false,
              },
              {
                name: "👤 Thông Tin Người Tạo",
                value: `> **Host:** <@${giveawayData.hostId}>`,
                inline: false,
              },
              {
                name: "🔗 Link Giveaway",
                value: `> [Nhấn vào đây để xem](${message.url})`,
                inline: false,
              },
            )
            .setThumbnail(guildIcon)
            .setFooter({ text: `Giveaway ID: ${message.id} - Giveaway System` })
            .setTimestamp();

          await safeSendDM(winner, { embeds: [winnerEmbed] });
        } catch (err) {
          console.warn(
            `<:warning:1455096625373380691> [GIVEAWAY] Lỗi gửi DM cho winner ${winner.tag}:`,
            err.message,
          );
        }
      }
    } else {
      await channel
        .send({
          content: `<a:no:1455096623804715080> Không có ai tham gia giveaway này! <@${giveawayData.hostId}>`,
          allowedMentions: { users: [giveawayData.hostId] },
        })
        .catch(() => null);
    }

    removeGiveaway(giveawayData.messageId);
  } catch (error) {
    console.error(
      "<a:no:1455096623804715080> [GIVEAWAY] Lỗi khi kết thúc giveaway:",
      error.message,
    );
    removeGiveaway(giveawayData.messageId);
  }
}

// Schedule giveaway
function scheduleGiveaway(client, giveawayData) {
  const timeLeft = giveawayData.endTime - Date.now();

  if (timeLeft <= 0) {
    endGiveaway(client, giveawayData);
  } else {
    setTimeout(() => endGiveaway(client, giveawayData), timeLeft);
  }
}

function getCurrentShardInfo(client) {
  if (!client?.shard) {
    return { isSharded: false, shardId: null, totalShards: 1 };
  }

  const shardId =
    Array.isArray(client.shard.ids) && client.shard.ids.length > 0
      ? Number(client.shard.ids[0])
      : null;

  return {
    isSharded: true,
    shardId,
    totalShards: Number(client.shard.count) || 1,
  };
}

function getGuildOwnerShardId(guildId, totalShards) {
  try {
    return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
  } catch {
    return null;
  }
}

export default {
  name: "gstart",
  description: "Tạo giveaway mới",
  async execute(message, args) {
    if (args.length < 3) {
      const errorMsg = await message
        .reply(
          "### <a:no:1455096623804715080> Sử dụng: `xgstart <thời gian> <số người thắng> <phần thưởng>`\n> - Ví dụ: `xgstart 1day 2 Nitro Discord`",
        )
        .catch(() => null);

      if (!errorMsg) {
        await safeSendDM(
          message.author,
          `<a:no:1455096623804715080> **Không thể tạo giveaway**\n` +
            `Bot không có quyền gửi tin nhắn trong kênh đó.\n\n` +
            `**Cách sử dụng:**\n` +
            `\`xgstart <thời gian> <số người thắng> <phần thưởng>\`\n` +
            `**Ví dụ:** \`xgstart 1day 2 Nitro Discord\``,
        );
      }
      return;
    }

    const timeStr = args[0];
    const winnerCount = parseInt(args[1]);
    const prize = args.slice(2).join(" ");

    if (isNaN(winnerCount) || winnerCount < 1) {
      const errorMsg = await message
        .reply(
          "<a:no:1455096623804715080> Số người thắng phải là số lớn hơn 0!",
        )
        .catch(() => null);
      if (!errorMsg) {
        await safeSendDM(
          message.author,
          `<a:no:1455096623804715080> Số người thắng phải là số lớn hơn 0!`,
        );
      }
      return;
    }

    if (winnerCount > 20) {
      const errorMsg = await message
        .reply("<a:no:1455096623804715080> Số người thắng tối đa là 20!")
        .catch(() => null);
      if (!errorMsg) {
        await safeSendDM(
          message.author,
          `<a:no:1455096623804715080> Số người thắng tối đa là 20!`,
        );
      }
      return;
    }

    const duration = parseTime(timeStr);
    if (duration === 0) {
      const errorMsg = await message
        .reply(
          "<a:no:1455096623804715080> Thời gian không hợp lệ! Sử dụng: `1day`, `2h`, `30m`, `45s`",
        )
        .catch(() => null);
      if (!errorMsg) {
        await safeSendDM(
          message.author,
          `<a:no:1455096623804715080> Thời gian không hợp lệ! Sử dụng: \`1day\`, \`2h\`, \`30m\`, \`45s\``,
        );
      }
      return;
    }

    const minDuration = 10000; // 10 giây
    const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 ngày

    if (duration < minDuration) {
      const errorMsg = await message
        .reply(
          `<a:no:1455096623804715080> Thời gian tối thiểu là ${formatDuration(minDuration)}!`,
        )
        .catch(() => null);
      if (!errorMsg) {
        await safeSendDM(
          message.author,
          `<a:no:1455096623804715080> Thời gian tối thiểu là ${formatDuration(minDuration)}!`,
        );
      }
      return;
    }

    if (duration > maxDuration) {
      const errorMsg = await message
        .reply(
          `<a:no:1455096623804715080> Thời gian tối đa là ${formatDuration(maxDuration)}!`,
        )
        .catch(() => null);
      if (!errorMsg) {
        await safeSendDM(
          message.author,
          `<a:no:1455096623804715080> Thời gian tối đa là ${formatDuration(maxDuration)}!`,
        );
      }
      return;
    }

    const endTime = Date.now() + duration;
    const endTimeUnix = Math.floor(endTime / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`**${prize}**`)
      .addFields(
        {
          name: "<a:king:1446770366382084267> Người tạo",
          value: message.author.toString(),
          inline: true,
        },
        {
          name: "<:member:1446769169738502165> Số người thắng",
          value: winnerCount.toString(),
          inline: true,
        },
        {
          name: "<a:clock:1446769163669602335> Kết thúc",
          value: `<t:${endTimeUnix}:R>`,
          inline: false,
        },
      )
      .setColor("#FF69B4")
      .setThumbnail(
        message.author.displayAvatarURL({ dynamic: true, size: 128 }),
      )
      .setImage(
        "https://media.discordapp.net/attachments/1429068134668832848/1431629371315327016/standard_6.gif?ex=6934d280&is=69338100&hm=0e640fabe25649e8e4837c72e340efab18148624ab9fa7663d64f4b7838046af&=&width=1804&height=105",
      )
      .setFooter({ text: "Thả emoji gift để tham gia!" })
      .setTimestamp();

    const giveawayMsg = await message.channel
      .send({
        content:
          "## <a:2giveaway:1446775157036417125> GIVEAWAY <a:2giveaway:1446775157036417125>",
        embeds: [embed],
      })
      .catch(async (err) => {
        console.warn(
          "<:warning:1455096625373380691> [GIVEAWAY] Không thể gửi giveaway message:",
          err.message,
        );

        await safeSendDM(
          message.author,
          `<a:no:1455096623804715080> **Không thể tạo giveaway**\n` +
            `Bot không có quyền gửi tin nhắn hoặc embed trong kênh đó.\n\n` +
            `**Lý do có thể:**\n` +
            `- Bot thiếu quyền \`Send Messages\`\n` +
            `- Bot thiếu quyền \`Embed Links\`\n` +
            `- Kênh bị khóa hoặc chỉ dành cho admin\n\n` +
            `Vui lòng kiểm tra quyền của bot trong kênh đó!`,
        );

        return null;
      });

    if (!giveawayMsg) return;

    await giveawayMsg.react(GIFT_EMOJI).catch((err) => {
      console.warn(
        "<:warning:1455096625373380691> [GIVEAWAY] Không thể react emoji:",
        err.message,
      );

      safeSendDM(
        message.author,
        `## <:warning:1455096625373380691> **Cảnh báo**\n` +
          `> - Giveaway đã được tạo nhưng bot không thể thêm reaction.\n` +
          `> - Người dùng có thể tự thêm reaction emoji <:gift:1446769608580399154> để tham gia.`,
      );
    });

    const giveawayData = {
      messageId: giveawayMsg.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
      hostId: message.author.id,
      prize: prize,
      winnerCount: winnerCount,
      endTime: endTime,
    };

    const giveaways = loadGiveaways();
    giveaways.push(giveawayData);
    saveGiveaways(giveaways);

    scheduleGiveaway(message.client, giveawayData);

    message.delete().catch(() => {
      console.warn(
        "<:warning:1455096625373380691> [GIVEAWAY] Không thể xóa command message (thiếu quyền Manage Messages)",
      );
    });

    console.log(
      `<a:checkyes:1455096631555915897> [GIVEAWAY] Đã tạo giveaway "${prize}" (${formatDuration(duration)}) bởi ${message.author.tag}`,
    );

    try {
      const guild = message.guild;
      const channel = message.channel;
      const guildIcon = guild.iconURL({ dynamic: true, size: 256 }) || null;

      const createEmbed = new EmbedBuilder()
        .setColor("#3498DB")
        .setDescription(
          `## <a:2giveaway:1446775157036417125> Giveaway Created <a:2giveaway:1446775157036417125>\n\n` +
            `- **Xin chào ${message.author.username}!**\n\n` +
            `> - Giveaway của bạn đã được tạo thành công và đang hoạt động!`,
        )
        .addFields(
          {
            name: "<a:gift:1446769608580399154> Phần Thưởng",
            value: `\`\`\`${prize}\`\`\``,
            inline: false,
          },
          {
            name: "🔗 Link Giveaway",
            value: `> [〔 Giveaway Link 〕](${giveawayMsg.url})`,
            inline: false,
          },
        )
        .setThumbnail(guildIcon)
        .setFooter({ text: `Giveaway ID: ${giveawayMsg.id} - Giveaway System` })
        .setTimestamp();

      await safeSendDM(message.author, { embeds: [createEmbed] });
    } catch (err) {
      console.warn(
        "<:warning:1455096625373380691> [GIVEAWAY] Không thể gửi DM thông báo tạo giveaway:",
        err.message,
      );
    }
  },
};

// Export hàm init để sử dụng trong main bot file
export function initGiveawaySystem(client) {
  const giveaways = loadGiveaways();
  const { isSharded, shardId, totalShards } = getCurrentShardInfo(client);

  let scheduledCount = 0;
  let skippedCount = 0;

  giveaways.forEach((giveaway) => {
    if (!isSharded) {
      scheduleGiveaway(client, giveaway);
      scheduledCount += 1;
      return;
    }

    const ownerShardId = getGuildOwnerShardId(giveaway.guildId, totalShards);

    if (ownerShardId === null || ownerShardId !== shardId) {
      skippedCount += 1;
      return;
    }

    scheduleGiveaway(client, giveaway);
    scheduledCount += 1;
  });

  if (isSharded) {
    console.log(
      `📦 [GIVEAWAY] Shard ${shardId}/${totalShards - 1}: loaded ${giveaways.length}, scheduled ${scheduledCount}, skipped ${skippedCount}`,
    );
  } else {
    console.log(`📦 [GIVEAWAY] Đã load ${giveaways.length} giveaway(s)`);
  }
}

export { GIFT_EMOJI };
