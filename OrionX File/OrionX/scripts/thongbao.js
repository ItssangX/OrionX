/**
 * ============================================
 * THONGBAO.JS - Hệ thống thông báo tích hợp
 * ============================================
 * File này được import vào bot để tự động gửi thông báo
 * Không cần chạy thủ công.
 *
 * Config bật/tắt và nội dung ở bên dưới.
 */

import { EmbedBuilder, MessageFlags } from "discord.js";
import logger from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const SAVE_FILE = path.join(DATA_DIR, "notified_users.json");

// ============================================
// ⚙️ CẤU HÌNH THÔNG BÁO
// ============================================

export const NOTIFICATION_CONFIG = {
  // Bật/tắt tính năng thông báo (true = bật, false = tắt)
  ENABLED: false,

  // Tiêu đề thông báo
  TITLE: "📢 THÔNG BÁO TỪ ORIONX",

  // Nội dung chính (hỗ trợ Markdown Discord)
  CONTENT: `
Xin chào **{username}**!

## 🆕 Tính năng mới

- 🎮 **2D Game** - Chơi game 2d ngay trên discord!!!
- chơi game 2d ngay trên discord với độ họa pixel cực chi tiết và có thể chơi Online cùng bạn bè trực tiếp trên lệnh không cần qua server hoặc kênh chat!
- chat ngay trong game với mọi người đang chơi và sảnh online cực lớn!.
- tính năng thế giới mở và raid cùng bạn bè sưu tập vật phẩm đánh boss và quái cực đẹp.!
### sử dụng lệnh Xplay để bắt đầu chơi ngay nào!!!
  `.trim(),

  // Màu embed (hex)
  COLOR: 0x5865f2,

  // Hình ảnh (để null nếu không cần)
  THUMBNAIL: null,
  IMAGE:
    "https://media.discordapp.net/attachments/1419668257404878969/1467427406141984778/image.png?ex=698057c5&is=697f0645&hm=e476dea3086fb91d3d84978feed30a5192b427a7700fc796f12a11050aa7e397&=&format=webp&quality=lossless&width=644&height=798",

  // Footer
  FOOTER: {
    TEXT: "Thông Báo Hệ Thống",
    ICON: null,
  },
};

// ============================================
// 🔧 LƯU TRỮ TRẠNG THÁI (PERSISTENT)
// ============================================

// Load danh sách đã thông báo từ file
let notifiedUsers = new Set();

try {
  // Đảm bảo thư mục data tồn tại
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load file nếu tồn tại
  if (fs.existsSync(SAVE_FILE)) {
    const data = fs.readFileSync(SAVE_FILE, "utf-8");
    const json = JSON.parse(data);
    if (Array.isArray(json)) {
      notifiedUsers = new Set(json);
    }
  }
} catch (err) {
  logger.error("❌ Lỗi load notified_users.json:", err);
}

// Hàm lưu trạng thái vào file
function saveNotifiedUsers() {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify([...notifiedUsers]), "utf-8");
  } catch (err) {
    logger.error("❌ Lỗi save notified_users.json:", err);
  }
}

/**
 * Kiểm tra và gửi thông báo cho user nếu chưa nhận
 * @param {import("discord.js").Interaction} interaction
 */
export async function checkAndSendNotification(interaction) {
  // 1. Kiểm tra xem tính năng có bật không
  if (!NOTIFICATION_CONFIG.ENABLED) return;

  // 2. Bỏ qua bot
  if (interaction.user.bot) return;

  // 3. Kiểm tra user đã nhận thông báo chưa (Persistent check)
  if (notifiedUsers.has(interaction.user.id)) return;

  logger.info(
    `[NOTIFY] Gửi thông báo tới user: ${interaction.user.tag} (${interaction.user.id})`,
  );

  // 4. Đánh dấu đã nhận và lưu ngay lập tức
  notifiedUsers.add(interaction.user.id);
  saveNotifiedUsers();

  try {
    // 5. Chuẩn bị nội dung embed
    const personalizedContent = NOTIFICATION_CONFIG.CONTENT.replace(
      /{username}/g,
      interaction.user.username,
    );

    const embed = new EmbedBuilder()
      .setTitle(NOTIFICATION_CONFIG.TITLE)
      .setDescription(personalizedContent)
      .setColor(NOTIFICATION_CONFIG.COLOR)
      .setTimestamp();

    if (NOTIFICATION_CONFIG.THUMBNAIL)
      embed.setThumbnail(NOTIFICATION_CONFIG.THUMBNAIL);
    if (NOTIFICATION_CONFIG.IMAGE) embed.setImage(NOTIFICATION_CONFIG.IMAGE);
    if (NOTIFICATION_CONFIG.FOOTER.TEXT) {
      embed.setFooter({
        text: NOTIFICATION_CONFIG.FOOTER.TEXT,
        iconURL: NOTIFICATION_CONFIG.FOOTER.ICON,
      });
    }

    // 6. Gửi DM cho user
    const dmChannel = await interaction.user.createDM();
    await dmChannel.send({ embeds: [embed] });

    // 7. Thông báo tại kênh hiện tại (Ephemeral hoặc tin nhắn thường)
    try {
      if (interaction.isMessage) {
        // Logic cho messageCreate (prefix commands)
        if (interaction.channel) {
          const msg = await interaction.channel.send({
            content: `🔔 <@${interaction.user.id}>, bạn có thông báo từ OrionX! 📩 **Vui lòng kiểm tra DM.**`,
          });
          setTimeout(() => msg.delete().catch(() => { }), 10000);
        }
      } else if (interaction.replied || interaction.deferred) {
        // Logic cho Slash Commands / Buttons
        await interaction.followUp({
          content: `🔔 **${interaction.user.username}**, bạn có thông báo mới từ hệ thống! 📩 **Vui lòng kiểm tra tin nhắn chờ (DM) ngay nhé.**`,
          flags: [MessageFlags.Ephemeral],
        });
      } else {
        if (interaction.channel) {
          const msg = await interaction.channel.send({
            content: `🔔 <@${interaction.user.id}>, bạn có thông báo từ OrionX! 📩 **Vui lòng kiểm tra DM.**`,
          });
          // Xóa thông báo này sau 10 giây để đỡ spam
          setTimeout(() => msg.delete().catch(() => { }), 10000);
        }
      }
    } catch (e) { }
  } catch (error) {
    // Lỗi thường gặp: User chặn DM
    if (error.code === 50007) {
      logger.warn(
        `❌ Không thể gửi DM thông báo cho ${interaction.user.tag} (User chặn DM)`,
      );
    } else {
      logger.error(`❌ Lỗi gửi thông báo cho ${interaction.user.tag}:`, error);
    }
  }
}
