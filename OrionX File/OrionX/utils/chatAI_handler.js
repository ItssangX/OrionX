import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import logger from "../utils/logger.js";

// Lưu history tin nhắn cho mỗi channel
const chatHistory = new Map();

// Gemini API Server URL (chạy trên server port 3000)
const AI_API_URL = process.env.AI_API_URL || "http://localhost:3000/chat";

// Hàm xử lý ChatAI (có thể gọi từ event khác)
export async function handleChatAI(message, client) {
  const content = message.content.trim();
  const botMention = `<@${client.user.id}>`;

  // CHỈ xử lý khi Tag bot (không phải lệnh)
  if (
    !content.includes(botMention) ||
    content.startsWith(process.env.PREFIX || "x")
  ) {
    return false; // Không xử lý
  }

  const prompt = content.replace(botMention, "").trim();
  if (!prompt) return false;

  const channelId = message.channel.id;
  const history = chatHistory.get(channelId) || [];

  // Thả emoji loading
  let loadingMsg;
  try {
    loadingMsg = await message.reply(
      "<a:loading:1455882249374273536> Đang suy nghĩ...",
    );
  } catch (err) {
    logger.error("Không thể gửi loading:", err);
  }

  try {
    // Chuyển đổi history sang format của Gemini server
    // Gemini server nhận: [{ who: 'you', text: '...' }, { who: 'ai', text: '...' }]
    const formattedHistory = history.map((h) => ({
      who: h.role === "user" ? "you" : "ai",
      text: h.content,
    }));

    // Gọi Gemini API Server (localhost:3000)
    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
        history: formattedHistory.slice(-4),
        source: "discord",
      }),
    });

    // Xử lý rate limit
    if (res.status === 429) {
      if (loadingMsg) {
        try {
          await loadingMsg.delete();
        } catch (_) {}
      }
      await message.reply(
        "<a:clock:1446769163669602335> Bot đang bận, vui lòng thử lại sau 1 phút!",
      );
      return true;
    }

    const data = await res.json();

    // Kiểm tra error từ Gemini server
    if (!res.ok || !data.reply) {
      logger.error("❌ Gemini API Error:", data);
      throw new Error(data.reply || "Gemini API error");
    }

    const reply =
      data.reply || "<a:no:1455096623804715080> AI không thể trả lời lúc này.";

    // Xóa loading (nếu có)
    if (loadingMsg) {
      try {
        await loadingMsg.delete();
      } catch (_) {}
    }

    // Gửi reply với embed
    if (reply.length <= 3500) {
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setAuthor({
          name: "OrionX AI",
          iconURL:
            "https://media.discordapp.net/attachments/1429068134668832848/1456603087501398189/OrionX_Avatar_Gif.gif?ex=696625d6&is=6964d456&hm=ad08299cd8e3f083ea8780e9fcc33bba171986232ff78fe4c733d3320774ebb9&=&width=320&height=320",
        })
        .setTitle("AI Assistant")
        .setURL("https://orxbot.web.app/")
        .setDescription(
          `> **Câu hỏi:** ${prompt.length > 100 ? prompt.slice(0, 100) + "..." : prompt}\n\n${reply}`,
        )
        .setImage(
          "https://media.discordapp.net/attachments/1429068134668832848/1456602423614378026/standard.gif?ex=69662538&is=6964d3b8&hm=ce4a5beaa9c98a20d63e4b619a0e0ad695633894a40b9b0a6d8784e922aba758&=&width=1804&height=105",
        )
        .setFooter({
          text: `Hỏi bởi ${message.author.username} - OrionX | Gemini 2.5 Flash`,
        })
        .setTimestamp();

      try {
        await message.reply({ embeds: [embed] });
      } catch (err) {
        logger.error("Lỗi gửi embed:", err);
        await message.reply(reply.slice(0, 2000));
      }
    } else {
      // Nếu quá dài, chia nhỏ
      for (let i = 0; i < reply.length; i += 2000) {
        try {
          await message.channel.send(reply.slice(i, i + 2000));
        } catch (_) {}
      }
    }

    // Cập nhật history (giữ 4 tin nhắn gần nhất để tiết kiệm tokens)
    chatHistory.set(
      channelId,
      [
        ...history,
        { role: "user", content: prompt },
        { role: "assistant", content: reply },
      ].slice(-4),
    );

    return true; // Đã xử lý
  } catch (err) {
    logger.error("Lỗi khi xử lý Gemini API:", err);
    if (loadingMsg)
      try {
        await loadingMsg.delete();
      } catch (_) {}

    const errorEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("❌ Lỗi AI")
      .setDescription("> Không thể kết nối đến AI.\n> Vui lòng thử lại sau!")
      .setFooter({ text: "OrionX AI - Error" })
      .setTimestamp();

    try {
      await message.reply({ embeds: [errorEmbed] });
    } catch (_) {}
    return true;
  }
}
