/**
 * Express API Server cho Top.gg Webhook
 * Lắng nghe POST /topgg từ Top.gg
 * Xử lý vote rewards: +100k coin + DM cảm ơn
 */

import express from "express";
import logger from "../utils/logger.js";
import { User } from "../database/models.js";
import { EmbedBuilder } from "discord.js";
import { updateChecklist } from "../utils/checklistHelper.js";

export function startTopGGServer(client) {
  const app = express();
  app.use(express.json());

  const PORT = process.env.API_PORT_TOPGG || 4000;

  /**
   * POST /topgg
   * Body: { user: "userId", bot: "botId", type: "upvote" }
   * Header: Authorization: BOT_API_SECRET
   */
  app.post("/topgg", async (req, res) => {
    try {
      // Validate authorization
      const auth = req.headers.authorization;
      if (auth !== process.env.BOT_API_SECRET) {
        logger.warn(`❌ Unauthorized Top.gg request: ${auth}`);
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { user, bot, type } = req.body;

      // Validate fields
      if (!user || !bot) {
        return res.status(400).json({ error: "Missing user or bot" });
      }

      // Verify bot ID
      if (bot !== process.env.CLIENT_ID) {
        logger.warn(
          `⚠️ Bot ID mismatch: expected ${process.env.CLIENT_ID}, got ${bot}`,
        );
        return res.status(400).json({ error: "Bot ID mismatch" });
      }

      // Log vote received
      logger.info(`🗳️ User ${user} đã vote cho bot! (Type: ${type})`);

      // Phần thưởng mặc định mỗi lần vote: 50,000 XCoin
      // Có thể override bằng biến môi trường TOPGG_REWARD
      const rewardRaw = parseInt(process.env.TOPGG_REWARD || "50000", 10);
      const rewardAmount = Number.isFinite(rewardRaw) ? rewardRaw : 50000;

      // Anti-spam: không cho nhận thưởng nếu trong vòng 10 phút đã nhận rồi
      // Có thể chỉnh qua TOPGG_VOTE_DEDUPE_MINUTES (mặc định 10)
      const dedupeRaw = parseInt(
        process.env.TOPGG_VOTE_DEDUPE_MINUTES || "10",
        10,
      );
      const dedupeMinutes = Number.isFinite(dedupeRaw) ? dedupeRaw : 10;
      const cooldownMs = dedupeMinutes * 60 * 1000;
      const now = new Date();
      const eligibleAt = new Date(now.getTime() - cooldownMs);

      // Attempt atomic reward (dedupe within cooldown window)
      const updatedUser = await User.findOneAndUpdate(
        {
          userId: user,
          $or: [
            { lastVoteAt: { $exists: false } },
            { lastVoteAt: { $lte: eligibleAt } },
          ],
        },
        {
          $inc: { money: rewardAmount },
          $set: { lastVoteAt: now },
        },
        { returnDocument: "after" },
      );

      if (!updatedUser) {
        const existingUser = await User.findOne({ userId: user });
        if (!existingUser) {
          logger.warn(`⚠️ User not found: ${user}`);
          return res.status(404).json({ error: "User not found" });
        }

        await updateChecklist(user, "vote");
        logger.info(`⏭️ User ${user} đã nhận thưởng vote gần đây, bỏ qua`);
        return res.json({
          success: true,
          message: "Vote already rewarded recently",
          user,
          reward: 0,
        });
      }

      await updateChecklist(user, "vote");
      logger.info(
        `💰 User ${user} nhận +${rewardAmount.toLocaleString()} coin`,
      );

      // Send DM to user
      try {
        const userObj = await client.users.fetch(user);
        const embed = new EmbedBuilder()
          .setColor("#FFD700")
          .setDescription(
            "## 🗳️ Vote System 🗳️\n" +
              "- Cảm ơn bạn đã vote cho [ **OrionX** ] trên Top.gg!",
          )
          .addFields({
            name: "<a:gift:1446769608580399154> Phần Thưởng <a:gift:1446769608580399154>",
            value: `> - \`${rewardAmount.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
          })
          .setTimestamp();

        await userObj.send({ embeds: [embed] });
        logger.info(`📧 DM sent thành công đến user ${user}`);
      } catch (err) {
        logger.warn(`⚠️ Could not send DM to ${user}: ${err.message}`);
      }

      return res.json({
        success: true,
        message: "Vote recorded and rewarded",
        user,
        reward: rewardAmount,
      });
    } catch (error) {
      logger.error("❌ Error in /topgg webhook:", error.message);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", bot: client.user?.tag, server: "Top.gg Webhook" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`✅ Top.gg API Server listening on port ${PORT}`);
    logger.info(`🌐 Webhook URL: http://localhost:${PORT}/topgg`);
  });

  return app;
}
