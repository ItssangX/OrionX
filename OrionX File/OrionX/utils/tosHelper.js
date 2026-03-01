import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import logger from "./logger.js";
import { User } from "../database/models.js";
import mongoose from "mongoose";

export async function checkTOS(user) {
  try {
    // CHECK MONGODB ĐÃ KẾT NỐI CHƯA
    if (mongoose.connection.readyState !== 1) {
      logger.error("MongoDB chưa kết nối!");
      return true; // Cho phép dùng nếu DB lỗi
    }

    let userData = await User.findOne({ userId: user.id })
      .select("tosAccepted")
      .lean();

    if (!userData) {
      // User chưa có data -> Chưa chấp nhận TOS
      return false;
    }

    return userData.tosAccepted;
  } catch (error) {
    logger.error("Lỗi check TOS:", error);
    return true; // CHO PHÉP DÙNG NẾU CÓ LỖI
  }
}

export async function sendTOSMessage(user) {
  try {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## 📜 Điều Khoản Sử Dụng [ OrionX ]",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "**Chào mừng bạn đến với OrionX!**\n\n" +
            "- Để tiếp tục, vui lòng đọc và chấp nhận quy định của chúng tôi.\n\n" +
            "🔗 https://orxdocs.web.app/Tos \n\n" +
            " **Tóm tắt:**\n " +
            "> - Không spam hoặc lạm dụng bot\n" +
            "> - Tuân thủ quy tắc của Discord và server\n" +
            "> - Dữ liệu của bạn sẽ được lưu trữ để bot hoạt động\n\n" +
            " **Bạn có đồng ý với các điều khoản trên không?** ",
        ),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tos_accept")
        .setLabel("✅ Tôi đồng ý")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("tos_decline")
        .setLabel("❌Tôi từ chối")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setLabel("📖 Xem chi tiết")
        .setStyle(ButtonStyle.Link)
        .setURL("https://orxdocs.web.app/Tos"),
    );

    container.addActionRowComponents(row);

    await user.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return true;
  } catch (error) {
    logger.error("Không thể gửi DM:", error);
    return false;
  }
}

export async function acceptTOS(userId) {
  try {
    await User.updateOne(
      { userId },
      {
        $set: {
          tosAccepted: true,
          tosAcceptedAt: new Date(),
        },
        $setOnInsert: {
          userId: userId,
          username: `User_${userId}`,
          money: 0,
          level: 1,
        },
      },
      { upsert: true },
    );

    logger.info(`User ${userId} đã chấp nhận TOS`);
    return true;
  } catch (error) {
    logger.error("Lỗi chấp nhận TOS:", error);
    return false;
  }
}
