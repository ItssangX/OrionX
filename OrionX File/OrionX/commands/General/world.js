import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { createCanvas } from "@napi-rs/canvas";
import { Game2D } from "../../database/models.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Graphics Constants
const TILE_SIZE = 24;
const VIEWPORT_WIDTH = 16;
const VIEWPORT_HEIGHT = 12;
const MAP_WIDTH = 32;
const MAP_HEIGHT = 24;
const CANVAS_WIDTH = TILE_SIZE * VIEWPORT_WIDTH;
const CANVAS_HEIGHT = TILE_SIZE * VIEWPORT_HEIGHT;
const PIXEL_SIZE = 3;

// Assets & Sprites (Reusing and Enhancing from 2dplay)
const SPRITES = {
  player: [
    "..HHHH..",
    ".HHHHHH.",
    "..PPPP..",
    ".BBPBB..",
    ".BBBBBB.",
    ".BBBBBB.",
    "..DDDD..",
    ".DD..DD.",
  ],
};

const PALETTES = {
  default: {
    H: "#FFD700",
    P: "#FFC0CB",
    B: "#4169E1",
    D: "#00008B",
    ".": null,
  },
  other: { H: "#00FF00", P: "#FFC0CB", B: "#FF1493", D: "#8B008B", ".": null },
};

// Map Definition (Premium design)
// Types: grass, stone, water, wood, flower, bench
const WORLD_MAP = [];
function generateWorldMap() {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    WORLD_MAP[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Border
      if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
        WORLD_MAP[y][x] = "stone_wall";
        continue;
      }

      // Central Plaza
      const distCenter = Math.sqrt(
        Math.pow(x - MAP_WIDTH / 2, 2) + Math.pow(y - MAP_HEIGHT / 2, 2),
      );
      if (distCenter < 6) {
        WORLD_MAP[y][x] =
          (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0
            ? "plaza_light"
            : "plaza_dark";
        continue;
      }

      // Decorative items and paths
      const rand = Math.random();
      if (rand < 0.05) WORLD_MAP[y][x] = "flower";
      else if (rand < 0.1) WORLD_MAP[y][x] = "tree";
      else if (rand < 0.12) WORLD_MAP[y][x] = "bench";
      else WORLD_MAP[y][x] = "grass";
    }
  }
  // Central fountain
  const cx = Math.floor(MAP_WIDTH / 2);
  const cy = Math.floor(MAP_HEIGHT / 2);
  WORLD_MAP[cy][cx] = "fountain";
  WORLD_MAP[cy - 1][cx] = "water";
  WORLD_MAP[cy + 1][cx] = "water";
  WORLD_MAP[cy][cx - 1] = "water";
  WORLD_MAP[cy][cx + 1] = "water";
}
generateWorldMap();

const TILE_DATA = {
  grass: { color: "#2d5a27", solid: false },
  plaza_light: { color: "#95a5a6", solid: false },
  plaza_dark: { color: "#7f8c8d", solid: false },
  stone_wall: { color: "#2c3e50", solid: true },
  water: { color: "#3498db", solid: true },
  fountain: { color: "#ecf0f1", solid: true },
  tree: { color: "#1e392a", solid: true },
  flower: { color: "#e74c3c", solid: false },
  bench: { color: "#8b4513", solid: true },
};

// State management
const playerStates = new Map();
const playerMessages = new Map();
const chatHistory = []; // Global chat history for mode 2
const MAX_CHAT_HISTORY = 50;

export default {
  name: "world",
  aliases: ["chat", "global", "lobby"],
  description: "Tham gia sảnh thế giới tuyệt đẹp để trò chuyện cùng mọi người!",

  async execute(message, args) {
    const playerId = message.author.id;

    // 1. Initial State & Spawning
    if (!playerStates.has(playerId)) {
      // Get all online players to avoid overlap
      const onlinePlayers = await Game2D.find({ location: "global_world" });
      const occupied = new Set(onlinePlayers.map((p) => `${p.x},${p.y}`));

      let x,
        y,
        found = false;
      for (let attempts = 0; attempts < 100; attempts++) {
        x = Math.floor(Math.random() * (MAP_WIDTH - 4)) + 2;
        y = Math.floor(Math.random() * (MAP_HEIGHT - 4)) + 2;
        if (!TILE_DATA[WORLD_MAP[y][x]].solid && !occupied.has(`${x},${y}`)) {
          found = true;
          break;
        }
      }

      if (!found) {
        x = 16;
        y = 12;
      } // Fallback

      playerStates.set(playerId, {
        userId: playerId,
        username: message.author.username,
        x,
        y,
        direction: "down",
        location: "global_world",
        chatMessage: null,
        chatTimeout: null,
        animationFrame: 0,
        mode: 1, // 1 = canvas mode, 2 = chat mode
      });

      // Save to global DB immediately
      await Game2D.findOneAndUpdate(
        { userId: playerId },
        { location: "global_world", x, y },
        { upsert: true },
      );
    }

    const state = playerStates.get(playerId);

    // 2. Initial Rendering based on mode
    if (state.mode === 1) {
      const canvas = await renderWorld(state, playerId);
      const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "world.png",
      });

      const canvasMsg = await message.channel.send({
        content: `### 🌍 Chào mừng **${state.username}** đến với sảnh Thế Giới!`,
        files: [attachment],
      });

      const controlMsg = await message.channel.send({
        components: buildControlUI(state),
      });

      playerMessages.set(playerId, { canvasMsg, controlMsg });
      setupCollector(canvasMsg, controlMsg, state, playerId);
    } else {
      // Mode 2 - Chat interface
      const chatMsg = await message.channel.send({
        content: buildChatInterface(state),
        components: buildChatControls(state),
      });

      playerMessages.set(playerId, { chatMsg });
      setupChatCollector(chatMsg, state, playerId);
    }
  },
};

// --- RENDERER ---
async function renderWorld(localState, currentPlayerId) {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  // Camera math: center viewport on local player
  let startX = localState.x - Math.floor(VIEWPORT_WIDTH / 2);
  let startY = localState.y - Math.floor(VIEWPORT_HEIGHT / 2);

  // Clamp camera to map bounds
  startX = Math.max(0, Math.min(MAP_WIDTH - VIEWPORT_WIDTH, startX));
  startY = Math.max(0, Math.min(MAP_HEIGHT - VIEWPORT_HEIGHT, startY));

  // 1. Draw Background (Tiles)
  for (let y = 0; y < VIEWPORT_HEIGHT; y++) {
    for (let x = 0; x < VIEWPORT_WIDTH; x++) {
      const gx = startX + x;
      const gy = startY + y;
      const type = WORLD_MAP[gy][gx];
      const data = TILE_DATA[type];

      ctx.fillStyle = data.color;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const frame = localState.animationFrame;

      // Premium Rendering
      if (type === "grass") {
        ctx.fillStyle = "#224411";
        if ((gx * gy + gx) % 7 === 0) ctx.fillRect(px + 4, py + 4, 2, 2);
        if ((gx * gy + gy) % 11 === 0) ctx.fillRect(px + 14, py + 16, 2, 2);
      }
      if (type === "flower") {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? "#e74c3c" : "#f1c40f";
        ctx.beginPath();
        ctx.arc(px + 12, py + 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 11, py + 11, 2, 2);
      }
      if (type === "water" || type === "fountain") {
        const ripple = Math.sin(frame * 0.4 + gx * 0.5) * 3;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(px + 4 + ripple, py + 8, TILE_SIZE - 8, 1);
        if (type === "fountain") {
          const spray = (frame % 5) * 2;
          ctx.fillStyle = "#ecf0f1";
          ctx.fillRect(px + 11, py + 12 - spray, 3, 3);
        }
      }
      if (type === "tree") {
        // Trunk
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(px + 10, py + 14, 4, 8);
        // Leaves
        ctx.fillStyle = "#1b5e20";
        ctx.beginPath();
        ctx.arc(px + 12, py + 10, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      if (type === "bench") {
        ctx.fillStyle = "#8d6e63";
        ctx.fillRect(px + 4, py + 8, TILE_SIZE - 8, 8); // Seat
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(px + 4, py + 16, 2, 4); // Legs
        ctx.fillRect(px + TILE_SIZE - 6, py + 16, 2, 4);
      }
      if (type === "stone_wall") {
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }
    }
  }

  // 2. Draw Players (Cross-shard)
  const allPlayers = await Game2D.find({ location: "global_world" });
  for (const p of allPlayers) {
    // Determine coordinates and look
    // If local on this shard, use localState for animations/direction
    const isLocal = playerStates.has(p.userId);
    const renderData = isLocal ? playerStates.get(p.userId) : p;

    const relX = renderData.x - startX;
    const relY = renderData.y - startY;

    if (
      relX >= -1 &&
      relX <= VIEWPORT_WIDTH &&
      relY >= -1 &&
      relY <= VIEWPORT_HEIGHT
    ) {
      const px = relX * TILE_SIZE;
      const py = relY * TILE_SIZE;
      const isSelf = p.userId === currentPlayerId;

      // Drop Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(px + 12, py + 22, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sprite
      drawPixelSprite(
        ctx,
        px,
        py,
        SPRITES.player,
        isSelf ? PALETTES.default : PALETTES.other,
      );

      // Name Tag
      ctx.font = "bold 10px Inter, Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = isSelf ? "#f1c40f" : "#ffffff";
      ctx.fillText(renderData.username || "User", px + 12, py - 5);

      // Chat Bubble
      if (renderData.chatMessage) {
        const text = renderData.chatMessage;
        ctx.font = "9px Arial";
        const metrics = ctx.measureText(text);
        const bw = metrics.width + 12;
        const bh = 16;

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.roundRect(px + 12 - bw / 2, py - 30, bw, bh, 4);
        ctx.fill();

        ctx.fillStyle = "#2c3e50";
        ctx.fillText(text, px + 12, py - 19);
      }
    }
  }

  return canvas;
}

function drawPixelSprite(ctx, x, y, sprite, palette) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const char = sprite[r][c];
      const color = palette[char];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          x + c * PIXEL_SIZE,
          y + r * PIXEL_SIZE,
          PIXEL_SIZE,
          PIXEL_SIZE,
        );
      }
    }
  }
}

// --- UI BUILDER ---
function buildControlUI(state) {
  const moveRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("empty_w1")
      .setLabel("⠀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("world_up")
      .setEmoji("🔼")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("empty_w2")
      .setLabel("⠀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );

  const moveRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("world_left")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("world_chat")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("world_right")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary),
  );

  const moveRow3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("world_quit")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("world_down")
      .setEmoji("🔽")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("world_menu")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),
  );

  return [moveRow1, moveRow2, moveRow3];
}

function buildChatInterface(state) {
  let chatContent = `### 💬 Sảnh Thế Giới - Chế độ Chat\n\n`;

  if (chatHistory.length === 0) {
    chatContent += `*Chưa có tin nhắn nào. Hãy là người đầu tiên!*\n\n`;
  } else {
    // Display messages in reverse chronological order (newest first)
    // Show last 15 messages to avoid too long display
    const recentMessages =
      chatHistory.length > 15 ? chatHistory.slice(-15) : chatHistory;
    for (const msg of recentMessages.reverse()) {
      const time = new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      chatContent += `**[${time}] ${msg.username}:** ${msg.content}\n`;
    }
  }

  chatContent += `\n> 📝 Dùng nút 💬 để gửi tin nhắn`;

  // Check if content exceeds Discord's limit (2000 characters for embeds, 4000 for messages)
  if (chatContent.length > 3500) {
    // Clear all chat history and rebuild interface
    chatHistory.length = 0; // Clear the array
    console.log("Chat history cleared due to length limit");
    return `### 💬 Sảnh Thế Giới - Chế độ Chat\n\n*Chat history cleared due to length limit. Please start again!*`;
  }

  return chatContent;
}

function buildChatControls(state) {
  const chatRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("chat_mode_send")
      .setEmoji("💬")
      .setLabel("Chat")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("chat_mode_settings")
      .setEmoji("⚙️")
      .setLabel("Chế độ 1")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("world_quit")
      .setEmoji("🚪")
      .setLabel("Thoát")
      .setStyle(ButtonStyle.Danger),
  );

  return [chatRow];
}

// --- COLLECTOR & LOGIC ---
function setupCollector(canvasMsg, controlMsg, state, playerId) {
  const collector = controlMsg.createMessageComponentCollector({
    idle: 300000,
  }); // 5 minutes

  collector.on("collect", async (i) => {
    if (i.user.id !== playerId)
      return i.reply({ content: "Không phải của bạn!", ephemeral: true });

    if (i.customId === "world_chat") {
      const modal = new ModalBuilder()
        .setCustomId(`world_chat_modal_${playerId}`)
        .setTitle("Nói gì đó ở sảnh thế giới...")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("chat_input")
              .setLabel("Nội dung")
              .setStyle(TextInputStyle.Short)
              .setMaxLength(50)
              .setRequired(true),
          ),
        );
      await i.showModal(modal);

      try {
        const submission = await i.awaitModalSubmit({
          time: 60000,
          filter: (s) => s.customId === `world_chat_modal_${playerId}`,
        });
        try {
          await submission.deferUpdate();
        } catch (e) {
          if (e.code !== 10062) console.error("Modal Defer Error:", e);
        }
        const messageContent =
          submission.fields.getTextInputValue("chat_input");

        // Add to chat history
        const chatEntry = {
          username: state.username,
          content: messageContent,
          timestamp: new Date(),
          userId: playerId,
        };
        chatHistory.push(chatEntry);

        // Keep only recent messages
        if (chatHistory.length > MAX_CHAT_HISTORY) {
          chatHistory.shift();
        }

        state.chatMessage = messageContent;

        if (state.chatTimeout) clearTimeout(state.chatTimeout);
        state.chatTimeout = setTimeout(() => {
          state.chatMessage = null;
          updateWorldView(playerId);
        }, 8000);

        await updateWorldView(playerId);
        // Sync to DB for others
        await Game2D.findOneAndUpdate(
          { userId: playerId },
          { chatMessage: state.chatMessage },
        );

        // Update all chat mode users
        updateAllChatViews();
      } catch (e) { }
      return;
    }

    if (i.customId === "world_menu") {
      // Switch to mode 2
      state.mode = 2;
      await switchToMode2(state, playerId, i);
      return;
    }

    if (i.customId === "world_quit") {
      await Game2D.findOneAndUpdate({ userId: playerId }, { location: "none" });
      playerStates.delete(playerId);
      playerMessages.delete(playerId);
      collector.stop();
      return i.update({
        content: "🏡 Bạn đã rời khỏi Thế Giới!",
        components: [],
      });
    }

    try {
      await i.deferUpdate();
    } catch (e) {
      if (e.code !== 10062) console.error("Defer Error:", e);
      return;
    }

    // Handle movement
    let dx = 0,
      dy = 0;
    if (i.customId === "world_up") dy = -1;
    if (i.customId === "world_down") dy = 1;
    if (i.customId === "world_left") dx = -1;
    if (i.customId === "world_right") dx = 1;

    const nx = state.x + dx;
    const ny = state.y + dy;

    if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
      if (!TILE_DATA[WORLD_MAP[ny][nx]].solid) {
        state.x = nx;
        state.y = ny;
        state.animationFrame++;
        // Update DB
        await Game2D.findOneAndUpdate({ userId: playerId }, { x: nx, y: ny });
      }
    }

    await updateWorldView(playerId);
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "idle") {
      await handleIdleKick(playerId, "canvas");
    }
  });
}

function setupChatCollector(chatMsg, state, playerId) {
  const collector = chatMsg.createMessageComponentCollector({ idle: 300000 }); // 5 minutes

  collector.on("collect", async (i) => {
    if (i.user.id !== playerId)
      return i.reply({ content: "Không phải của bạn!", ephemeral: true });

    if (i.customId === "chat_mode_send") {
      const modal = new ModalBuilder()
        .setCustomId(`chat_mode_modal_${playerId}`)
        .setTitle("Nhắn tin tới sảnh thế giới...")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("chat_input")
              .setLabel("Nội dung tin nhắn")
              .setStyle(TextInputStyle.Short)
              .setMaxLength(50)
              .setRequired(true),
          ),
        );
      await i.showModal(modal);

      try {
        const submission = await i.awaitModalSubmit({
          time: 60000,
          filter: (s) => s.customId === `chat_mode_modal_${playerId}`,
        });
        try {
          await submission.deferUpdate();
        } catch (e) {
          if (e.code !== 10062) console.error("Modal Defer Error:", e);
        }
        const messageContent =
          submission.fields.getTextInputValue("chat_input");

        // Add to chat history
        const chatEntry = {
          username: state.username,
          content: messageContent,
          timestamp: new Date(),
          userId: playerId,
        };
        chatHistory.push(chatEntry);

        // Keep only recent messages
        if (chatHistory.length > MAX_CHAT_HISTORY) {
          chatHistory.shift();
        }

        // Also update for canvas mode
        state.chatMessage = messageContent;
        if (state.chatTimeout) clearTimeout(state.chatTimeout);
        state.chatTimeout = setTimeout(() => {
          state.chatMessage = null;
          if (state.mode === 1) updateWorldView(playerId);
        }, 8000);

        await Game2D.findOneAndUpdate(
          { userId: playerId },
          { chatMessage: state.chatMessage },
        );

        // Update all chat mode users
        updateAllChatViews();
      } catch (e) { }
      return;
    }

    if (i.customId === "chat_mode_settings") {
      // Switch to mode 1
      state.mode = 1;
      await switchToMode1(state, playerId, i);
      return;
    }

    if (i.customId === "world_quit") {
      await Game2D.findOneAndUpdate({ userId: playerId }, { location: "none" });
      playerStates.delete(playerId);
      playerMessages.delete(playerId);
      collector.stop();
      return i.update({
        content: "🏡 Bạn đã rời khỏi Thế Giới!",
        components: [],
      });
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "idle") {
      await handleIdleKick(playerId, "chat");
    }
  });
}

async function handleIdleKick(playerId, mode) {
  const msgs = playerMessages.get(playerId);
  if (!msgs) return;

  try {
    // Update UI to show disabled state
    if (mode === "canvas" && msgs.canvasMsg && msgs.controlMsg) {
      const disabledControls = buildDisabledControls();
      await msgs.controlMsg.edit({
        content:
          "⏰ **Hết giờ!** Bạn đã bị kick khỏi Thế Giới vì không hoạt động trong 5 phút.",
        components: disabledControls,
      });
    } else if (mode === "chat" && msgs.chatMsg) {
      const disabledChatControls = buildDisabledChatControls();
      await msgs.chatMsg.edit({
        content:
          "⏰ **Hết giờ!** Bạn đã bị kick khỏi Thế Giới vì không hoạt động trong 5 phút.",
        components: disabledChatControls,
      });
    }

    // Update database and clean up
    await Game2D.findOneAndUpdate({ userId: playerId }, { location: "none" });
    playerStates.delete(playerId);
    playerMessages.delete(playerId);

    // Update other users' views
    await updateAllChatViews();
  } catch (e) {
    console.error("Error handling idle kick:", e);
  }
}

function buildDisabledControls() {
  const moveRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("disabled_up")
      .setEmoji("🔼")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("disabled_chat")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("disabled_right")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );

  const moveRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("disabled_left")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("disabled_center")
      .setLabel("HẾT GIỜ")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("disabled_down")
      .setEmoji("🔽")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );

  return [moveRow1, moveRow2];
}

function buildDisabledChatControls() {
  const chatRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("disabled_chat")
      .setEmoji("💬")
      .setLabel("Chat")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("disabled_settings")
      .setEmoji("⚙️")
      .setLabel("Chế độ 1")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("disabled_quit")
      .setEmoji("🚪")
      .setLabel("Thoát")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );

  return [chatRow];
}

async function updateWorldView(playerId) {
  const state = playerStates.get(playerId);
  const msgs = playerMessages.get(playerId);
  if (!state || !msgs || !msgs.canvasMsg) return;

  try {
    const onlineCount = await Game2D.countDocuments({
      location: "global_world",
    });
    const canvas = await renderWorld(state, playerId);
    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "world.png",
    });

    await msgs.canvasMsg.edit({
      content: `### 🌍 Sảnh Thế Giới (${onlineCount} người online)\n> - Dùng phím mũi tên để di chuyển, nút 💬 để nhắn tin!`,
      files: [attachment],
    });
  } catch (e) {
    console.error("Update World View Error:", e);
  }
}

// Global Sync Ticker
setInterval(async () => {
  if (playerStates.size === 0) return;

  // We can use a global lock or just Shard 0 logic if we have access to client
  // For simplicity, update all local views every 5 seconds (slower for background sync)
  // and let movement/chat trigger immediate updates.
  for (const [pid, state] of playerStates.entries()) {
    try {
      if (state.mode === 1) {
        await updateWorldView(pid);
      } else {
        await updateChatView(pid);
      }
    } catch (e) { }
  }
}, 5000); // Background refresh every 5s to see other players' movements

// --- MODE SWITCHING FUNCTIONS ---
async function switchToMode2(state, playerId, interaction) {
  const msgs = playerMessages.get(playerId);
  if (!msgs) return;

  try {
    // Delete old messages safely
    try {
      if (msgs.canvasMsg) await msgs.canvasMsg.delete().catch(() => { });
      if (msgs.controlMsg) await msgs.controlMsg.delete().catch(() => { });
    } catch (e) {
      console.log(
        "Warning: Could not delete old messages, they may have been already deleted",
      );
    }

    // Create new chat interface
    const chatMsg = await interaction.channel.send({
      content: buildChatInterface(state),
      components: buildChatControls(state),
    });

    playerMessages.set(playerId, { chatMsg });
    setupChatCollector(chatMsg, state, playerId);

    try {
      await interaction.update({
        content: "🔄 Đã chuyển sang chế độ Chat!",
        components: [],
      });
    } catch (e) {
      // If interaction update fails, send a new message
      await interaction.channel.send("🔄 Đã chuyển sang chế độ Chat!");
    }
  } catch (e) {
    console.error("Error switching to mode 2:", e);
    try {
      await interaction.followup({
        content: "❌ Có lỗi xảy ra khi chuyển chế độ!",
        ephemeral: true,
      });
    } catch (followupError) {
      console.error("Could not send error followup:", followupError);
    }
  }
}

async function switchToMode1(state, playerId, interaction) {
  const msgs = playerMessages.get(playerId);
  if (!msgs) return;

  try {
    // Delete old chat message safely
    try {
      if (msgs.chatMsg) await msgs.chatMsg.delete().catch(() => { });
    } catch (e) {
      console.log(
        "Warning: Could not delete old chat message, it may have been already deleted",
      );
    }

    // Create new canvas interface
    const canvas = await renderWorld(state, playerId);
    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "world.png",
    });

    const canvasMsg = await interaction.channel.send({
      content: `### 🌍 Sảnh Thế Giới`,
      files: [attachment],
    });

    const controlMsg = await interaction.channel.send({
      components: buildControlUI(state),
    });

    playerMessages.set(playerId, { canvasMsg, controlMsg });
    setupCollector(canvasMsg, controlMsg, state, playerId);

    try {
      await interaction.update({
        content: "🔄 Đã chuyển sang chế độ Canvas!",
        components: [],
      });
    } catch (e) {
      // If interaction update fails, send a new message
      await interaction.channel.send("🔄 Đã chuyển sang chế độ Canvas!");
    }
  } catch (e) {
    console.error("Error switching to mode 1:", e);
    try {
      await interaction.followup({
        content: "❌ Có lỗi xảy ra khi chuyển chế độ!",
        ephemeral: true,
      });
    } catch (followupError) {
      console.error("Could not send error followup:", followupError);
    }
  }
}

async function updateChatView(playerId) {
  const state = playerStates.get(playerId);
  const msgs = playerMessages.get(playerId);
  if (!state || !msgs || !msgs.chatMsg) return;

  try {
    await msgs.chatMsg.edit({
      content: buildChatInterface(state),
      components: buildChatControls(state),
    });
  } catch (e) {
    console.error("Update Chat View Error:", e);
  }
}

async function updateAllChatViews() {
  for (const [playerId, state] of playerStates.entries()) {
    if (state.mode === 2) {
      try {
        await updateChatView(playerId);
      } catch (e) { }
    }
  }
}
