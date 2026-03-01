// ==================== CAI DAT ====================
// npm install express cors helmet express-rate-limit

// ==================== FILE: api/server.js ====================
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Webhook } from "@top-gg/sdk";
import { EmbedBuilder, version as discordJsVersion } from "discord.js";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  User,
  Guild,
  Warning,
  Ticket,
  Giveaway,
  Leaderboard,
  ShardRuntime,
} from "../database/models.js";
import {
  getGlobalGuildCountFromRuntime,
  loadGlobalServerLeaderboard,
  syncLocalServerLeaderboardSnapshot,
} from "../utils/serverLeaderboardSnapshot.js";
import logger from "../utils/logger.js";

const app = express();
const PORT = process.env.API_PORT_SERVER || 5000;
const execFileAsync = promisify(execFile);

// ==================== TRUST PROXY ====================
app.set("trust proxy", 1);

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
});
app.use("/api/", limiter);

// REMOVED: Request logging middleware de giam RAM usage
// Requests van duoc log vao file thong qua logger neu can debug

// ==================== AUTH MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  if (token !== process.env.API_KEY) {
    return res.status(403).json({ error: "Invalid token" });
  }

  next();
};

// ==================== HEALTH CHECK ====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ==================== USER ROUTES ====================

// GET - Lay thong tin user theo ID (PUBLIC)
app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay tat ca users (PUBLIC)
app.get("/api/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select("-__v")
      .limit(limit)
      .skip(skip)
      .sort({ money: -1 });

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Tao user moi (AUTH REQUIRED)
app.post("/api/users", authenticateToken, async (req, res) => {
  try {
    const { userId, username } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const existing = await User.findOne({ userId });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const user = await User.create({
      userId,
      username: username || "Unknown",
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    logger.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT - Cap nhat user (AUTH REQUIRED)
app.put("/api/users/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    delete updates.userId;
    delete updates._id;

    const user = await User.findOneAndUpdate(
      { userId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE - Xoa user (AUTH REQUIRED)
app.delete("/api/users/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOneAndDelete({ userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== GUILD ROUTES ====================

// GET - Lay guild theo ID (PUBLIC)
app.get("/api/guilds/:guildId", async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = await Guild.findOne({ guildId });

    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    res.json({ success: true, data: guild });
  } catch (error) {
    logger.error("Error fetching guild:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay tat ca guilds (PUBLIC)
app.get("/api/guilds", async (req, res) => {
  try {
    const guilds = await Guild.find().select("-__v");
    res.json({ success: true, data: guilds });
  } catch (error) {
    logger.error("Error fetching guilds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Tao guild (AUTH REQUIRED)
app.post("/api/guilds", authenticateToken, async (req, res) => {
  try {
    const { guildId, guildName } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: "guildId is required" });
    }

    const existing = await Guild.findOne({ guildId });
    if (existing) {
      return res.status(409).json({ error: "Guild already exists" });
    }

    const guild = await Guild.create({ guildId, guildName });
    res.status(201).json({ success: true, data: guild });
  } catch (error) {
    logger.error("Error creating guild:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT - Cap nhat guild (AUTH REQUIRED)
app.put("/api/guilds/:guildId", authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;

    delete updates.guildId;
    delete updates._id;

    const guild = await Guild.findOneAndUpdate(
      { guildId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    res.json({ success: true, data: guild });
  } catch (error) {
    logger.error("Error updating guild:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE - Xoa guild (AUTH REQUIRED)
app.delete("/api/guilds/:guildId", authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = await Guild.findOneAndDelete({ guildId });

    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    res.json({ success: true, message: "Guild deleted successfully" });
  } catch (error) {
    logger.error("Error deleting guild:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== ECONOMY ROUTES (DEPRECATED PER-SERVER MODEL) ====================
// Per-server economy has been synchronized to Global User.money.
// Use /api/economy/add-money, /api/economy/remove-money, etc. instead.

// POST - Add money (AUTH REQUIRED)
app.post("/api/economy/add-money", authenticateToken, async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid userId or amount" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.money += amount;
    await user.save();

    res.json({
      success: true,
      data: { userId: user.userId, newBalance: user.money },
    });
  } catch (error) {
    logger.error("Error adding money:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Remove money (AUTH REQUIRED)
app.post("/api/economy/remove-money", authenticateToken, async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid userId or amount" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.money < amount) {
      return res.status(400).json({
        error: "Insufficient balance",
        currentBalance: user.money,
        requestedAmount: amount,
      });
    }

    user.money -= amount;
    await user.save();

    res.json({
      success: true,
      data: {
        userId: user.userId,
        removedAmount: amount,
        newBalance: user.money,
      },
    });
  } catch (error) {
    logger.error("Error removing money:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Set money (AUTH REQUIRED)
app.post("/api/economy/set-money", authenticateToken, async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || amount === undefined || amount < 0) {
      return res.status(400).json({ error: "Invalid userId or amount" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const oldBalance = user.money;
    user.money = amount;
    await user.save();

    res.json({
      success: true,
      data: { userId: user.userId, oldBalance, newBalance: user.money },
    });
  } catch (error) {
    logger.error("Error setting money:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Transfer money (AUTH REQUIRED)
app.post("/api/economy/transfer", authenticateToken, async (req, res) => {
  try {
    const { fromUserId, toUserId, amount } = req.body;

    if (!fromUserId || !toUserId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const sender = await User.findOne({ userId: fromUserId });
    const receiver = await User.findOne({ userId: toUserId });

    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    if (sender.money < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    sender.money -= amount;
    receiver.money += amount;

    await sender.save();
    await receiver.save();

    res.json({
      success: true,
      data: {
        from: { userId: sender.userId, balance: sender.money },
        to: { userId: receiver.userId, balance: receiver.money },
      },
    });
  } catch (error) {
    logger.error("Error transferring money:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== WARNING ROUTES ====================

// GET - Lay warnings cua user trong guild (PUBLIC)
app.get("/api/warnings/:userId/:guildId", async (req, res) => {
  try {
    const { userId, guildId } = req.params;
    const warning = await Warning.findOne({ userId, guildId });

    if (!warning) {
      return res.status(404).json({ error: "Warning record not found" });
    }

    res.json({ success: true, data: warning });
  } catch (error) {
    logger.error("Error fetching warnings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay tat ca warnings cua user (PUBLIC)
app.get("/api/warnings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const warnings = await Warning.find({ userId });
    res.json({ success: true, data: warnings });
  } catch (error) {
    logger.error("Error fetching warnings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Them warning (AUTH REQUIRED)
app.post("/api/warnings", authenticateToken, async (req, res) => {
  try {
    const { userId, guildId, moderatorId, reason } = req.body;

    if (!userId || !guildId || !moderatorId || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let warning = await Warning.findOne({ userId, guildId });

    if (!warning) {
      warning = new Warning({
        userId,
        guildId,
        warnings: [],
        totalWarnings: 0,
      });
    }

    warning.warnings.push({ moderatorId, reason, date: new Date() });
    warning.totalWarnings = warning.warnings.length;
    await warning.save();

    res.status(201).json({ success: true, data: warning });
  } catch (error) {
    logger.error("Error adding warning:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE - Xoa warning (AUTH REQUIRED)
app.delete(
  "/api/warnings/:userId/:guildId/:warningIndex",
  authenticateToken,
  async (req, res) => {
    try {
      const { userId, guildId, warningIndex } = req.params;
      const index = parseInt(warningIndex);

      const warning = await Warning.findOne({ userId, guildId });
      if (!warning) {
        return res.status(404).json({ error: "Warning record not found" });
      }

      if (index < 0 || index >= warning.warnings.length) {
        return res.status(400).json({ error: "Invalid warning index" });
      }

      warning.warnings.splice(index, 1);
      warning.totalWarnings = warning.warnings.length;
      await warning.save();

      res.json({ success: true, data: warning });
    } catch (error) {
      logger.error("Error deleting warning:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ==================== TICKET ROUTES ====================

// GET - Lay ticket theo ID (PUBLIC)
app.get("/api/tickets/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error("Error fetching ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay tickets cua guild (PUBLIC)
app.get("/api/tickets/guild/:guildId", async (req, res) => {
  try {
    const { guildId } = req.params;
    const tickets = await Ticket.find({ guildId });
    res.json({ success: true, data: tickets });
  } catch (error) {
    logger.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay tickets cua user (PUBLIC)
app.get("/api/tickets/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const tickets = await Ticket.find({ userId });
    res.json({ success: true, data: tickets });
  } catch (error) {
    logger.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Tao ticket (AUTH REQUIRED)
app.post("/api/tickets", authenticateToken, async (req, res) => {
  try {
    const { ticketId, guildId, channelId, userId, username, category } =
      req.body;

    if (!ticketId || !guildId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ticket = await Ticket.create({
      ticketId,
      guildId,
      channelId,
      userId,
      username,
      category: category || "support",
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    logger.error("Error creating ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT - Cap nhat ticket (AUTH REQUIRED)
app.put("/api/tickets/:ticketId", authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const updates = req.body;

    delete updates.ticketId;
    delete updates._id;

    const ticket = await Ticket.findOneAndUpdate(
      { ticketId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error("Error updating ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Them message vao ticket (AUTH REQUIRED)
app.post(
  "/api/tickets/:ticketId/messages",
  authenticateToken,
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { authorId, authorName, content } = req.body;

      if (!authorId || !content) {
        return res
          .status(400)
          .json({ error: "authorId and content are required" });
      }

      const ticket = await Ticket.findOneAndUpdate(
        { ticketId },
        {
          $push: {
            messages: {
              authorId,
              authorName: authorName || "Unknown",
              content,
              timestamp: new Date(),
            },
          },
        },
        { returnDocument: 'after' },
      );

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      res.json({ success: true, data: ticket });
    } catch (error) {
      logger.error("Error adding message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE - Xoa ticket (AUTH REQUIRED)
app.delete("/api/tickets/:ticketId", authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOneAndDelete({ ticketId });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    logger.error("Error deleting ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== GIVEAWAY ROUTES ====================

// GET - Lay giveaway theo ID (PUBLIC)
app.get("/api/giveaways/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const giveaway = await Giveaway.findOne({ messageId });

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    res.json({ success: true, data: giveaway });
  } catch (error) {
    logger.error("Error fetching giveaway:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay giveaways cua guild (PUBLIC)
app.get("/api/giveaways/guild/:guildId", async (req, res) => {
  try {
    const { guildId } = req.params;
    const giveaways = await Giveaway.find({ guildId });
    res.json({ success: true, data: giveaways });
  } catch (error) {
    logger.error("Error fetching giveaways:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Tao giveaway (AUTH REQUIRED)
app.post("/api/giveaways", authenticateToken, async (req, res) => {
  try {
    const { messageId, channelId, guildId, prize, winners, endTime, hostId } =
      req.body;

    if (!messageId || !guildId || !prize) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const giveaway = await Giveaway.create({
      messageId,
      channelId,
      guildId,
      prize,
      winners: winners || 1,
      endTime: new Date(endTime),
      hostId,
    });

    res.status(201).json({ success: true, data: giveaway });
  } catch (error) {
    logger.error("Error creating giveaway:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT - Cap nhat giveaway (AUTH REQUIRED)
app.put("/api/giveaways/:messageId", authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const updates = req.body;

    delete updates.messageId;
    delete updates._id;

    const giveaway = await Giveaway.findOneAndUpdate(
      { messageId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    res.json({ success: true, data: giveaway });
  } catch (error) {
    logger.error("Error updating giveaway:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Tham gia giveaway (AUTH REQUIRED)
app.post(
  "/api/giveaways/:messageId/participate",
  authenticateToken,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const giveaway = await Giveaway.findOne({ messageId });

      if (!giveaway) {
        return res.status(404).json({ error: "Giveaway not found" });
      }

      if (giveaway.ended) {
        return res.status(400).json({ error: "Giveaway has ended" });
      }

      if (giveaway.participants.includes(userId)) {
        return res.status(400).json({ error: "Already participated" });
      }

      giveaway.participants.push(userId);
      await giveaway.save();

      res.json({ success: true, data: giveaway });
    } catch (error) {
      logger.error("Error joining giveaway:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE - Xoa giveaway (AUTH REQUIRED)
app.delete("/api/giveaways/:messageId", authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const giveaway = await Giveaway.findOneAndDelete({ messageId });

    if (!giveaway) {
      return res.status(404).json({ error: "Giveaway not found" });
    }

    res.json({ success: true, message: "Giveaway deleted successfully" });
  } catch (error) {
    logger.error("Error deleting giveaway:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== LEADERBOARD ROUTES ====================

// GET - Leaderboard tien (PUBLIC)
app.get("/api/leaderboard/money", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const users = await User.find()
      .select("userId username money")
      .sort({ money: -1 })
      .limit(limit);

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      username: user.username || `User ${user.userId.slice(0, 8)}`,
      money: user.money || 0,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Leaderboard level (PUBLIC)
app.get("/api/leaderboard/level", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const users = await User.find()
      .select("userId username level exp")
      .sort({ level: -1, exp: -1 })
      .limit(limit);

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      username: user.username || `User ${user.userId.slice(0, 8)}`,
      level: user.level || 1,
      exp: user.exp || 0,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay leaderboard saved (PUBLIC)
app.get("/api/leaderboards/:guildId/:type", async (req, res) => {
  try {
    const { guildId, type } = req.params;
    const leaderboard = await Leaderboard.findOne({ guildId, type });

    if (!leaderboard) {
      return res.status(404).json({ error: "Leaderboard not found" });
    }

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Tao/update leaderboard (AUTH REQUIRED)
app.post("/api/leaderboards", authenticateToken, async (req, res) => {
  try {
    const { guildId, type, users } = req.body;

    if (!guildId || !type) {
      return res.status(400).json({ error: "guildId and type are required" });
    }

    const leaderboard = await Leaderboard.findOneAndUpdate(
      { guildId, type },
      {
        users: users || [],
        lastUpdate: new Date(),
      },
      { upsert: true, returnDocument: 'after' },
    );

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error("Error updating leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== STATS ROUTES ====================

// GET - Thong ke tong quan (PUBLIC) - Aggregated from all shards
app.get("/api/stats", async (req, res) => {
  try {
    const client = req.app.locals.client;
    const totalUsers = await User.countDocuments();

    // Lay so guilds toan bot tu Mongo shard telemetry (cross-machine/cross-shard).
    let totalGuilds = 0;
    const botId = client?.user?.id || null;
    if (botId) {
      const runtimeSummary = await getGlobalGuildCountFromRuntime(botId);
      totalGuilds = runtimeSummary.totalGuilds;
    }

    // Fallback neu telemetry chua co du lieu.
    if (!totalGuilds && client && client.shard) {
      const guildCounts =
        await client.shard.fetchClientValues("guilds.cache.size");
      totalGuilds = guildCounts.reduce((a, b) => a + b, 0);
    } else if (!totalGuilds && client) {
      totalGuilds = client.guilds.cache.size;
    } else if (!totalGuilds) {
      totalGuilds = await Guild.countDocuments();
    }

    const totalTickets = await Ticket.countDocuments();
    const totalGiveaways = await Giveaway.countDocuments();

    const totalMoney = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$money" } } },
    ]);

    const avgLevel = await User.aggregate([
      { $group: { _id: null, avg: { $avg: "$level" } } },
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalGuilds,
        totalTickets,
        totalGiveaways,
        totalMoney: totalMoney[0]?.total || 0,
        averageLevel: Math.round(avgLevel[0]?.avg || 0),
      },
    });
  } catch (error) {
    logger.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ==================== BATTLE STATS ====================
// GET - Lay thong ke battle cua user
app.get("/api/battle/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select(
      "battleWinStreak maxBattleWinStreak totalBattleWins",
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: {
        userId,
        totalBattleWins: user.totalBattleWins || 0,
        currentStreak: user.battleWinStreak || 0,
        maxStreak: user.maxBattleWinStreak || 0,
      },
    });
  } catch (error) {
    logger.error("Error fetching battle stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Top battle wins
app.get("/api/battle/top/wins", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const users = await User.find({ totalBattleWins: { $gt: 0 } })
      .select(
        "userId username totalBattleWins battleWinStreak maxBattleWinStreak",
      )
      .sort({ totalBattleWins: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error("Error fetching top battle wins:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== PETS ====================
// GET - Lay tat ca pet cua user
app.get("/api/pets/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select("pets");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: user.pets || [],
      count: (user.pets || []).length,
    });
  } catch (error) {
    logger.error("Error fetching pets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== QUESTS ====================
// GET - Lay quest progress cua user
app.get("/api/quest/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select("quests");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: user.quests || null,
    });
  } catch (error) {
    logger.error("Error fetching quest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== STREAKS ====================
// GET - Lay thong tin streak cua user
app.get("/api/streak/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select(
      "dailyStreak battleWinStreak maxBattleWinStreak",
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: {
        userId,
        dailyStreak: user.dailyStreak || 0,
        battleWinStreak: user.battleWinStreak || 0,
        maxBattleWinStreak: user.maxBattleWinStreak || 0,
      },
    });
  } catch (error) {
    logger.error("Error fetching streak:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== LEADERBOARDS ====================
// GET - Top users by money
app.get("/api/leaderboard/money", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const users = await User.find()
      .select("userId username money")
      .sort({ money: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Top users by level
app.get("/api/leaderboard/level", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const users = await User.find()
      .select("userId username level exp")
      .sort({ level: -1, exp: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error("Error fetching level leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Top users by battle wins
app.get("/api/leaderboard/battle", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const users = await User.find({ totalBattleWins: { $gt: 0 } })
      .select(
        "userId username totalBattleWins battleWinStreak maxBattleWinStreak",
      )
      .sort({ totalBattleWins: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error("Error fetching battle leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Top users by daily streak
app.get("/api/leaderboard/streak", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const users = await User.find({ dailyStreak: { $gt: 0 } })
      .select("userId username dailyStreak")
      .sort({ dailyStreak: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error("Error fetching streak leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== ADMIN LOGS ====================
// GET - Lay admin logs (AUTH REQUIRED)
app.get("/api/admin/logs", authenticateToken, async (req, res) => {
  try {
    const { AdminLog } = await import("../database/models.js");
    const limit = parseInt(req.query.limit) || 20;
    const logs = await AdminLog.find().sort({ timestamp: -1 }).limit(limit);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error("Error fetching admin logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET - Lay admin logs theo admin ID (AUTH REQUIRED)
app.get("/api/admin/logs/:adminId", authenticateToken, async (req, res) => {
  try {
    const { AdminLog } = await import("../database/models.js");
    const { adminId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const logs = await AdminLog.find({ adminId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error("Error fetching admin logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== SERVER INFO ====================
const METRIC_CPU_SAMPLE_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roundNumber(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function toMb(bytes) {
  return roundNumber((Number(bytes) || 0) / 1024 / 1024, 2);
}

function averageNumbers(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  if (!numbers.length) return null;
  return roundNumber(
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
    2,
  );
}

function formatCpuModel(model) {
  const normalized = (model || "Unknown CPU").replace(/\s+/g, " ").trim();
  return normalized.length > 70 ? `${normalized.slice(0, 67)}...` : normalized;
}

function getCurrentShardId(client) {
  if (!client?.shard) return 0;
  if (Array.isArray(client.shard.ids) && client.shard.ids.length > 0) {
    return Number(client.shard.ids[0]) || 0;
  }
  return 0;
}

function normalizeErrorMessage(error) {
  if (!error) return "Unknown error";
  if (error.message) return String(error.message);
  return String(error);
}

async function sampleLocalCpuUsage(sampleMs = METRIC_CPU_SAMPLE_MS) {
  const startCpus = os.cpus();
  const startProcess = process.cpuUsage();
  const startTime = process.hrtime.bigint();

  await sleep(sampleMs);

  const endCpus = os.cpus();
  const processDiff = process.cpuUsage(startProcess);
  const endTime = process.hrtime.bigint();

  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < startCpus.length; i += 1) {
    const startTimes = startCpus[i].times;
    const endTimes = endCpus[i]?.times || startTimes;

    const coreIdle = endTimes.idle - startTimes.idle;
    const coreTotal =
      (endTimes.user - startTimes.user) +
      (endTimes.nice - startTimes.nice) +
      (endTimes.sys - startTimes.sys) +
      (endTimes.irq - startTimes.irq) +
      coreIdle;

    idleDiff += coreIdle;
    totalDiff += coreTotal;
  }

  const systemCpuPercent =
    totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
  const elapsedMicros = Number(endTime - startTime) / 1000;
  const processMicros = processDiff.user + processDiff.system;
  const processCpuPercent =
    elapsedMicros > 0 ? (processMicros / elapsedMicros) * 100 : 0;

  return {
    systemCpuPercent: roundNumber(clampPercent(systemCpuPercent), 2),
    processCpuPercent: roundNumber(clampPercent(processCpuPercent), 2),
    cpuModel: formatCpuModel(startCpus[0]?.model),
    cpuCores: startCpus.length || 1,
  };
}

async function getLocalGpuSnapshot() {
  try {
    const { stdout } = await execFileAsync(
      "nvidia-smi",
      [
        "--query-gpu=name,utilization.gpu,memory.used,memory.total",
        "--format=csv,noheader,nounits",
      ],
      { timeout: 1500, windowsHide: true },
    );

    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const gpus = lines
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim());
        if (parts.length < 2) return null;

        const usage = Number(parts[1]);
        const memoryUsed = Number(parts[2]);
        const memoryTotal = Number(parts[3]);
        return {
          name: parts[0],
          usage: Number.isFinite(usage) ? usage : null,
          memoryUsed: Number.isFinite(memoryUsed) ? memoryUsed : null,
          memoryTotal: Number.isFinite(memoryTotal) ? memoryTotal : null,
        };
      })
      .filter(Boolean);

    if (!gpus.length) {
      throw new Error("No NVIDIA GPU metrics");
    }

    const usageValues = gpus
      .map((gpu) => gpu.usage)
      .filter((usage) => Number.isFinite(usage));
    const avgUsage = usageValues.length
      ? usageValues.reduce((sum, usage) => sum + usage, 0) / usageValues.length
      : null;

    if (gpus.length === 1) {
      const gpu = gpus[0];
      const usageText =
        avgUsage === null ? "N/A" : `${roundNumber(clampPercent(avgUsage), 1)}%`;
      const memoryText =
        Number.isFinite(gpu.memoryUsed) && Number.isFinite(gpu.memoryTotal)
          ? ` | VRAM ${Math.round(gpu.memoryUsed)}/${Math.round(gpu.memoryTotal)} MB`
          : "";

      return {
        percent: avgUsage === null ? null : roundNumber(clampPercent(avgUsage), 2),
        text: `${usageText} (${gpu.name})${memoryText}`,
      };
    }

    return {
      percent: avgUsage === null ? null : roundNumber(clampPercent(avgUsage), 2),
      text:
        avgUsage === null
          ? `${gpus.length} NVIDIA GPUs`
          : `${roundNumber(clampPercent(avgUsage), 1)}% avg (${gpus.length} NVIDIA GPUs)`,
    };
  } catch {
    if (process.platform === "win32") {
      try {
        const script =
          "$samples=(Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction SilentlyContinue).CounterSamples; " +
          "if(-not $samples){''; exit 0}; " +
          "$active=$samples | Where-Object { $_.InstanceName -match 'engtype_3D|engtype_Compute' }; " +
          "if(-not $active){$active=$samples}; " +
          "$avg=($active | Measure-Object -Property CookedValue -Average).Average; " +
          "if($null -eq $avg){''} else {[Math]::Round($avg,2)}";

        const { stdout } = await execFileAsync(
          "powershell",
          ["-NoProfile", "-Command", script],
          { timeout: 1800, windowsHide: true },
        );

        const lastLine = stdout.trim().split(/\r?\n/).pop()?.trim();
        const value = Number(lastLine);
        if (Number.isFinite(value)) {
          const clamped = roundNumber(clampPercent(value), 2);
          return {
            percent: clamped,
            text: `${roundNumber(clamped, 1)}% (Windows GPU Engine)`,
          };
        }
      } catch {
        // Fall through to N/A
      }
    }
  }

  return { percent: null, text: "N/A" };
}

async function collectLocalShardSnapshot(client, sampleMs = METRIC_CPU_SAMPLE_MS) {
  const [cpuStats, gpuStats] = await Promise.all([
    sampleLocalCpuUsage(sampleMs),
    getLocalGpuSnapshot(),
  ]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const processMem = process.memoryUsage();
  const guilds = client?.guilds?.cache?.size || 0;
  const members =
    client?.guilds?.cache?.reduce((sum, guild) => sum + (guild.memberCount || 0), 0) ||
    0;

  return {
    shardId: getCurrentShardId(client),
    online: true,
    guilds,
    members,
    wsPing: Math.round(client?.ws?.ping || 0),
    uptimeMs: client?.uptime || 0,
    processRamMb: toMb(processMem.rss),
    processHeapUsedMb: toMb(processMem.heapUsed),
    processHeapTotalMb: toMb(processMem.heapTotal),
    hostRamUsedMb: toMb(usedMem),
    hostRamTotalMb: toMb(totalMem),
    hostRamPercent: roundNumber((usedMem / totalMem) * 100, 2),
    cpuPercent: cpuStats.systemCpuPercent,
    processCpuPercent: cpuStats.processCpuPercent,
    gpuPercent: gpuStats.percent,
    gpuText: gpuStats.text,
    cpuModel: cpuStats.cpuModel,
    cpuCores: cpuStats.cpuCores,
    hostname: os.hostname(),
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    pid: process.pid,
    generatedAt: new Date().toISOString(),
  };
}

async function collectShardSnapshots(client, sampleMs = METRIC_CPU_SAMPLE_MS) {
  if (!client?.shard) {
    return [await collectLocalShardSnapshot(client, sampleMs)];
  }

  const localShardIds =
    Array.isArray(client.shard.ids) && client.shard.ids.length > 0
      ? client.shard.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [0];
  const tasks = localShardIds.map(async (targetShardId) => {
    try {
      const result = await client.shard.broadcastEval(
        async (c, context) => {
          const osModule = await import("os");
          const osApi = osModule.default || osModule;
          const childModule = await import("child_process");
          const childApi = childModule.default || childModule;
          const utilModule = await import("util");
          const utilApi = utilModule.default || utilModule;
          const execFileAsyncLocal = utilApi.promisify(childApi.execFile);
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const round = (value, digits = 2) =>
            Number(Number(value || 0).toFixed(digits));
          const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));
          const mb = (bytes) => round((Number(bytes) || 0) / 1024 / 1024, 2);
          const cpuModel = (model) => {
            const normalized = (model || "Unknown CPU")
              .replace(/\s+/g, " ")
              .trim();
            return normalized.length > 70
              ? `${normalized.slice(0, 67)}...`
              : normalized;
          };

          const sampleMsLocal = Number(context?.sampleMs) || 250;
          const startCpus = osApi.cpus();
          const startProcess = process.cpuUsage();
          const startTime = process.hrtime.bigint();
          await wait(sampleMsLocal);
          const endCpus = osApi.cpus();
          const processDiff = process.cpuUsage(startProcess);
          const endTime = process.hrtime.bigint();

          let idleDiff = 0;
          let totalDiff = 0;
          for (let i = 0; i < startCpus.length; i += 1) {
            const startTimes = startCpus[i].times;
            const endTimes = endCpus[i]?.times || startTimes;
            const coreIdle = endTimes.idle - startTimes.idle;
            const coreTotal =
              (endTimes.user - startTimes.user) +
              (endTimes.nice - startTimes.nice) +
              (endTimes.sys - startTimes.sys) +
              (endTimes.irq - startTimes.irq) +
              coreIdle;
            idleDiff += coreIdle;
            totalDiff += coreTotal;
          }

          const systemCpuPercent =
            totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
          const elapsedMicros = Number(endTime - startTime) / 1000;
          const processMicros = processDiff.user + processDiff.system;
          const processCpuPercent =
            elapsedMicros > 0 ? (processMicros / elapsedMicros) * 100 : 0;

          let gpuPercent = null;
          let gpuText = "N/A";
          try {
            const { stdout } = await execFileAsyncLocal(
              "nvidia-smi",
              [
                "--query-gpu=name,utilization.gpu,memory.used,memory.total",
                "--format=csv,noheader,nounits",
              ],
              { timeout: 1500, windowsHide: true },
            );

            const lines = stdout
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);
            const gpus = lines
              .map((line) => {
                const parts = line.split(",").map((part) => part.trim());
                if (parts.length < 2) return null;
                const usage = Number(parts[1]);
                const memoryUsed = Number(parts[2]);
                const memoryTotal = Number(parts[3]);
                return {
                  name: parts[0],
                  usage: Number.isFinite(usage) ? usage : null,
                  memoryUsed: Number.isFinite(memoryUsed) ? memoryUsed : null,
                  memoryTotal: Number.isFinite(memoryTotal) ? memoryTotal : null,
                };
              })
              .filter(Boolean);

            if (gpus.length) {
              const usageValues = gpus
                .map((gpu) => gpu.usage)
                .filter((usage) => Number.isFinite(usage));
              const avgUsage = usageValues.length
                ? usageValues.reduce((sum, usage) => sum + usage, 0) /
                usageValues.length
                : null;

              if (avgUsage !== null) {
                gpuPercent = round(clamp(avgUsage), 2);
              }

              if (gpus.length === 1) {
                const gpu = gpus[0];
                const usageText =
                  avgUsage === null ? "N/A" : `${round(clamp(avgUsage), 1)}%`;
                const memoryText =
                  Number.isFinite(gpu.memoryUsed) && Number.isFinite(gpu.memoryTotal)
                    ? ` | VRAM ${Math.round(gpu.memoryUsed)}/${Math.round(gpu.memoryTotal)} MB`
                    : "";
                gpuText = `${usageText} (${gpu.name})${memoryText}`;
              } else {
                gpuText =
                  avgUsage === null
                    ? `${gpus.length} NVIDIA GPUs`
                    : `${round(clamp(avgUsage), 1)}% avg (${gpus.length} NVIDIA GPUs)`;
              }
            }
          } catch {
            if (process.platform === "win32") {
              try {
                const script =
                  "$samples=(Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction SilentlyContinue).CounterSamples; " +
                  "if(-not $samples){''; exit 0}; " +
                  "$active=$samples | Where-Object { $_.InstanceName -match 'engtype_3D|engtype_Compute' }; " +
                  "if(-not $active){$active=$samples}; " +
                  "$avg=($active | Measure-Object -Property CookedValue -Average).Average; " +
                  "if($null -eq $avg){''} else {[Math]::Round($avg,2)}";
                const { stdout } = await execFileAsyncLocal(
                  "powershell",
                  ["-NoProfile", "-Command", script],
                  { timeout: 1800, windowsHide: true },
                );
                const value = Number(
                  stdout.trim().split(/\r?\n/).pop()?.trim(),
                );
                if (Number.isFinite(value)) {
                  gpuPercent = round(clamp(value), 2);
                  gpuText = `${round(gpuPercent, 1)}% (Windows GPU Engine)`;
                }
              } catch {
                // Keep N/A
              }
            }
          }

          const totalMem = osApi.totalmem();
          const freeMem = osApi.freemem();
          const usedMem = totalMem - freeMem;
          const processMem = process.memoryUsage();
          const localShardId =
            Array.isArray(c.shard?.ids) && c.shard.ids.length > 0
              ? Number(c.shard.ids[0]) || 0
              : 0;

          return {
            shardId: localShardId,
            online: true,
            guilds: c.guilds.cache.size,
            members: c.guilds.cache.reduce(
              (sum, guild) => sum + (guild.memberCount || 0),
              0,
            ),
            wsPing: Math.round(c.ws?.ping || 0),
            uptimeMs: c.uptime || 0,
            processRamMb: mb(processMem.rss),
            processHeapUsedMb: mb(processMem.heapUsed),
            processHeapTotalMb: mb(processMem.heapTotal),
            hostRamUsedMb: mb(usedMem),
            hostRamTotalMb: mb(totalMem),
            hostRamPercent: round((usedMem / totalMem) * 100, 2),
            cpuPercent: round(clamp(systemCpuPercent), 2),
            processCpuPercent: round(clamp(processCpuPercent), 2),
            gpuPercent,
            gpuText,
            cpuModel: cpuModel(startCpus[0]?.model),
            cpuCores: startCpus.length || 1,
            hostname: osApi.hostname(),
            os: `${osApi.type()} ${osApi.release()} (${osApi.arch()})`,
            nodeVersion: process.version,
            pid: process.pid,
            generatedAt: new Date().toISOString(),
          };
        },
        { shard: targetShardId, context: { sampleMs } },
      );

      const snapshot = Array.isArray(result) ? result[0] : result;
      if (!snapshot) {
        return {
          shardId: targetShardId,
          online: false,
          error: "No runtime data returned",
        };
      }

      return {
        ...snapshot,
        shardId: Number(snapshot.shardId ?? targetShardId),
        online: true,
      };
    } catch (error) {
      return {
        shardId: targetShardId,
        online: false,
        error: normalizeErrorMessage(error),
      };
    }
  });

  const snapshots = await Promise.all(tasks);
  return snapshots.sort((a, b) => (a.shardId || 0) - (b.shardId || 0));
}

const SHARD_HEARTBEAT_STALE_MS = Number(
  process.env.SHARD_HEARTBEAT_STALE_MS || 90000,
);

function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function isRecentHeartbeat(value, staleMs = SHARD_HEARTBEAT_STALE_MS) {
  const timestamp = value ? new Date(value).getTime() : 0;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  return Date.now() - timestamp <= staleMs;
}

async function loadMongoShardSnapshots(botId) {
  if (!botId) return [];

  const docs = await ShardRuntime.find({ botId }).lean();
  return docs.map((doc) => {
    const heartbeatAt =
      doc.lastHeartbeatAt || doc.generatedAt || doc.updatedAt || null;
    const fresh = isRecentHeartbeat(heartbeatAt);

    return {
      shardId: toSafeNumber(doc.shardId, 0),
      online: Boolean(doc.online) && fresh,
      guilds: toSafeNumber(doc.guilds, 0),
      members: toSafeNumber(doc.members, 0),
      wsPing: toSafeNumber(doc.wsPing, 0),
      uptimeMs: toSafeNumber(doc.uptimeMs, 0),
      processRamMb: toSafeNumber(doc.processRamMb, 0),
      processHeapUsedMb: toSafeNumber(doc.processHeapUsedMb, 0),
      processHeapTotalMb: toSafeNumber(doc.processHeapTotalMb, 0),
      hostRamUsedMb: toSafeNumber(doc.hostRamUsedMb, 0),
      hostRamTotalMb: toSafeNumber(doc.hostRamTotalMb, 0),
      hostRamPercent: toSafeNumber(doc.hostRamPercent, 0),
      cpuPercent: toSafeNumber(doc.cpuPercent, 0),
      processCpuPercent: toSafeNumber(doc.processCpuPercent, 0),
      gpuPercent:
        doc.gpuPercent === null || doc.gpuPercent === undefined
          ? null
          : toSafeNumber(doc.gpuPercent, null),
      gpuText: doc.gpuText || "N/A",
      cpuModel: doc.cpuModel || "Unknown CPU",
      cpuCores: toSafeNumber(doc.cpuCores, 0),
      hostname: doc.hostname || null,
      os: doc.os || null,
      nodeVersion: doc.nodeVersion || process.version,
      pid: toSafeNumber(doc.pid, 0),
      generatedAt: heartbeatAt ? new Date(heartbeatAt).toISOString() : null,
      source: "mongo",
      stale: !fresh,
      error: fresh ? doc.error || null : "Shard heartbeat stale",
    };
  });
}

function mergeShardSnapshots(liveSnapshots, mongoSnapshots, expectedShardCount) {
  const liveMap = new Map(
    (liveSnapshots || []).map((snapshot) => [
      toSafeNumber(snapshot.shardId, 0),
      { ...snapshot, source: "live", stale: false },
    ]),
  );
  const mongoMap = new Map(
    (mongoSnapshots || []).map((snapshot) => [
      toSafeNumber(snapshot.shardId, 0),
      snapshot,
    ]),
  );

  const highestShardId = Math.max(
    expectedShardCount - 1,
    ...Array.from(liveMap.keys(), (id) => toSafeNumber(id, -1)),
    ...Array.from(mongoMap.keys(), (id) => toSafeNumber(id, -1)),
  );
  const shardCount = Math.max(expectedShardCount || 1, highestShardId + 1, 1);

  const merged = [];
  for (let shardId = 0; shardId < shardCount; shardId += 1) {
    const live = liveMap.get(shardId);
    const mongo = mongoMap.get(shardId);

    if (live?.online) {
      merged.push(live);
      continue;
    }

    if (mongo?.online) {
      merged.push(mongo);
      continue;
    }

    if (live) {
      merged.push(live);
      continue;
    }

    if (mongo) {
      merged.push(mongo);
      continue;
    }

    merged.push({
      shardId,
      online: false,
      guilds: 0,
      members: 0,
      wsPing: 0,
      uptimeMs: 0,
      processRamMb: 0,
      processHeapUsedMb: 0,
      processHeapTotalMb: 0,
      hostRamUsedMb: 0,
      hostRamTotalMb: 0,
      hostRamPercent: 0,
      cpuPercent: 0,
      processCpuPercent: 0,
      gpuPercent: null,
      gpuText: "N/A",
      cpuModel: "Unknown CPU",
      cpuCores: 0,
      hostname: null,
      os: null,
      nodeVersion: process.version,
      pid: 0,
      generatedAt: null,
      source: "none",
      stale: true,
      error: "No shard telemetry data",
    });
  }

  return merged.sort((a, b) => (a.shardId || 0) - (b.shardId || 0));
}

// GET - Thong tin bot (PUBLIC) - Aggregated from all shards + per-shard runtime metrics
app.get("/api/bot/info", async (req, res) => {
  try {
    const client = req.app.locals.client;

    if (!client) {
      return res.status(503).json({ error: "Bot not connected" });
    }

    const reportedShardCount = client.shard ? client.shard.count || 1 : 1;
    const liveShardSnapshots = await collectShardSnapshots(client);
    const mongoShardSnapshots = await loadMongoShardSnapshots(
      client.user?.id || null,
    );
    const shardSnapshots = mergeShardSnapshots(
      liveShardSnapshots,
      mongoShardSnapshots,
      reportedShardCount,
    );
    const shardCount = Math.max(reportedShardCount, shardSnapshots.length);
    const onlineShards = shardSnapshots.filter((snapshot) => snapshot.online);

    const totalGuilds = onlineShards.reduce(
      (sum, snapshot) => sum + (snapshot.guilds || 0),
      0,
    );
    const totalMembers = onlineShards.reduce(
      (sum, snapshot) => sum + (snapshot.members || 0),
      0,
    );
    const totalProcessRamMb = roundNumber(
      onlineShards.reduce(
        (sum, snapshot) => sum + (Number(snapshot.processRamMb) || 0),
        0,
      ),
      2,
    );

    const avgCpuPercent = averageNumbers(
      onlineShards.map((snapshot) => snapshot.cpuPercent),
    );
    const avgProcessCpuPercent = averageNumbers(
      onlineShards.map((snapshot) => snapshot.processCpuPercent),
    );
    const avgGpuPercent = averageNumbers(
      onlineShards.map((snapshot) => snapshot.gpuPercent),
    );

    const primaryShard =
      onlineShards.find((snapshot) => snapshot.shardId === 0) ||
      onlineShards[0] ||
      null;

    const currentPing = Number.isFinite(client.ws?.ping)
      ? Math.round(client.ws.ping)
      : averageNumbers(onlineShards.map((snapshot) => snapshot.wsPing)) || 0;

    res.json({
      success: true,
      data: {
        name: client.user?.username || "OrionXVIP",
        botId: client.user?.id || null,
        status: onlineShards.length > 0 ? "online" : "offline",
        guilds: totalGuilds,
        members: totalMembers,
        uptime: primaryShard?.uptimeMs || client.uptime || 0,
        ping: currentPing,
        shards: shardCount,
        nodeVersion: process.version,
        discordJsVersion,
        generatedAt: new Date().toISOString(),
        shardSummary: {
          total: shardCount,
          online: onlineShards.length,
          offline: Math.max(0, shardCount - onlineShards.length),
        },
        totals: {
          processRamMb: totalProcessRamMb,
          processRamGb: roundNumber(totalProcessRamMb / 1024, 2),
          averageCpuPercent: avgCpuPercent,
          averageProcessCpuPercent: avgProcessCpuPercent,
          averageGpuPercent: avgGpuPercent,
        },
        system: primaryShard
          ? {
            shardId: primaryShard.shardId,
            hostname: primaryShard.hostname,
            os: primaryShard.os,
            nodeVersion: primaryShard.nodeVersion,
            pid: primaryShard.pid,
            hostRamUsedMb: primaryShard.hostRamUsedMb,
            hostRamTotalMb: primaryShard.hostRamTotalMb,
            hostRamPercent: primaryShard.hostRamPercent,
            cpuPercent: primaryShard.cpuPercent,
            processCpuPercent: primaryShard.processCpuPercent,
            gpuPercent: primaryShard.gpuPercent,
            gpuText: primaryShard.gpuText,
            processRamMb: primaryShard.processRamMb,
          }
          : null,
        shardDetails: shardSnapshots,
      },
    });
  } catch (error) {
    logger.error("Error fetching bot info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function respondGlobalServerLeaderboard(req, res, client, limit) {
  const botId = client.user?.id || null;
  if (!botId) {
    return res.status(503).json({ error: "Bot not ready" });
  }

  await syncLocalServerLeaderboardSnapshot(client).catch((error) => {
    logger.warn(
      `Leaderboard snapshot sync warning: ${error?.message || String(error)}`,
    );
  });

  const registeredUsers = await User.countDocuments({
    tosAccepted: true,
    money: { $gt: 0 },
  });

  if (!registeredUsers) {
    return res.json({
      success: true,
      data: [],
      total: 0,
      registeredUsers: 0,
      limit,
      message: "No eligible users found",
    });
  }

  const { rows, total } = await loadGlobalServerLeaderboard(botId, { limit });
  const results = rows.map((server, index) => ({
    rank: index + 1,
    guildId: server.guildId,
    guildName: server.guildName,
    totalMoney: server.totalMoney,
    memberCount: server.memberCount,
    registeredCount: server.registeredCount,
    shardId: server.shardId,
    lastSyncedAt: server.lastSyncedAt,
  }));

  return res.json({
    success: true,
    data: results,
    total,
    registeredUsers,
    limit,
  });
}

// GET - Top servers by total money
app.get("/api/leaderboard/server", async (req, res) => {
  try {
    const limit = Math.max(
      1,
      Math.min(100, Number.parseInt(req.query.limit, 10) || 10),
    );
    const client = req.app.locals.client;

    if (!client) {
      logger.warn("Leaderboard API called but Bot not connected yet");
      return res.status(503).json({ error: "Bot not connected" });
    }

    return await respondGlobalServerLeaderboard(req, res, client, limit);
  } catch (err) {
    logger.error("Error in server leaderboard API:", err);
    res
      .status(500)
      .json({ error: "Internal server error", message: err.message });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Global error:", err);
  res.status(500).json({
    error: "Something went wrong",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export function startMainServer(client) {
  // Store client in app locals for access in routes
  app.locals.client = client;

  const PORT = process.env.API_PORT || 5000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`✅ Main API Server listening on port ${PORT}`);
    logger.info(`🌐 API URL: http://localhost:${PORT}/api`);
  });

  // Expose server instance for graceful shutdown
  app.locals.server = server;

  return app;
}

export default app;



