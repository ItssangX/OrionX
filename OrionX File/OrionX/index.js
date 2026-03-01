// ==================== FILE: index.js ====================
// File này là entry point chính cho bot Discord
// Khi chạy trực tiếp: Bot chạy như một instance đơn lẻ
// Khi chạy qua shard.js: Bot chạy như một shard trong hệ thống sharding

// Đăng ký sớm nhất để bắt "Invalid shard" trước Winston/logger (tránh log full stack ra console)
function isInvalidShardReason(reason) {
  if (!reason) return false;
  const msg = (reason.message ?? reason.err?.message ?? (typeof reason === 'string' ? reason : String(reason)));
  const stack = (reason.stack ?? reason.err?.stack ?? '');
  return (msg && (msg === 'Invalid shard' || msg.includes('Invalid shard'))) || stack.includes('WebSocketShard.onClose');
}
process.on('unhandledRejection', (reason) => {
  if (isInvalidShardReason(reason)) {
    console.warn('[warn] Invalid shard (disconnect) — bỏ qua.');
    return;
  }
});

import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  ActivityType,
  Options,
  Events,
} from "discord.js";
import logger from "./utils/logger.js";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { ShardRuntime } from "./database/models.js";
import connectDatabase from "./database/connect.js";
import loadCommands from "./handlers/commandHandler.js";
import loadEvents from "./handlers/eventHandler.js";
import { startTopGGServer } from "./api/topggserver.js";
import { startMainServer } from "./api/server.js";
import { initGiveawaySystem } from "./commands/Utility/giveaway.js";
import { Api } from "@top-gg/sdk";
import {
  SERVER_LEADERBOARD_SYNC_INTERVAL_MS,
  syncLocalServerLeaderboardSnapshot,
  getGlobalGuildCountFromRuntime,
  getGlobalGuildCountFromSnapshots,
} from "./utils/serverLeaderboardSnapshot.js";

const execFileAsync = promisify(execFile);

// NOTE: Do not delete sharding env vars here. ShardingManager relies on them
// to populate client.shard.count/ids in the child process.

// ==================== KHỞI TẠO CLIENT ====================
// Client này sẽ được sử dụng cho bot Discord
// Nếu chạy qua ShardingManager, client.shard sẽ có giá trị
// Nếu không có shard, bot đang chạy độc lập



const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  makeCache: Options.cacheWithLimits({
    MessageManager: 10,
    StageInstanceManager: 0,
    PresenceManager: 0,
    ReactionManager: 200,
    ThreadManager: 0,
    ThreadMemberManager: 0,
  }),
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  allowedMentions: {
    repliedUser: false,
  },
});

// ==================== KIỂM TRA SHARDING ====================
// Kiểm tra xem bot có đang chạy trong môi trường sharding không
// client.shard sẽ có giá trị nếu được spawn bởi ShardingManager
// Nếu không có shard, bot đang chạy độc lập
//
// Lưu ý: ShardingManager sẽ set client.shard trước khi file này được import
// Nhưng để an toàn, chúng ta kiểm tra với try-catch

let isSharded = false;
let shardId = null;
let totalShards = 1;

try {
  // Kiểm tra xem client có shard property không
  if (client.shard !== null && client.shard !== undefined) {
    isSharded = true;
    // client.shard.ids là mảng các shard ID mà client này quản lý
    // Thông thường sẽ chỉ có 1 shard ID trong mảng
    shardId =
      Array.isArray(client.shard.ids) && client.shard.ids.length > 0
        ? client.shard.ids[0]
        : null;
    totalShards = client.shard.count || 1;
  }
} catch (error) {
  // Nếu có lỗi khi kiểm tra shard, coi như không sharding
  logger.warn("⚠️ Không thể kiểm tra shard info, giả định chạy độc lập");
  isSharded = false;
  shardId = null;
}

// isShardZero: true nếu là shard 0 hoặc không sharding (chạy độc lập)
// Chỉ shard 0 mới chạy API Server để tránh xung đột port
const isShardZero = shardId === 0 || !isSharded;

// Log thông tin shard
if (isSharded) {
  logger.info(`🔀 Đang chạy trong môi trường SHARDING`);
  logger.info(`📦 Shard ID: ${shardId}`);
  logger.info(`📊 Tổng số shard: ${totalShards}`);
} else {
  logger.info(`🔀 Đang chạy ở chế độ ĐỘC LẬP (không sharding)`);
}

client.commands = new Collection();
client.logger = logger; // Thêm logger vào client

logger.info("🚀 Đang khởi động bot...");
client.cooldowns = new Collection();

// ==================== KẾT NỐI DATABASE ====================
// Database được chia sẻ giữa tất cả các shard
// Mongoose tự động quản lý connection pooling
// Mỗi shard có thể đọc/ghi vào database mà không xung đột

try {
  logger.info("🗄️ Bước 1/3: Khởi tạo kết nối Database...");
  await connectDatabase();
} catch (error) {
  logger.error("❌ Lỗi bước 1: Kết nối database thất bại");
  logger.error(error);
  logger.warn(
    "<:warning:1455096625373380691> Bot sẽ cố gắng chạy mà không có database",
  );
}

logger.info("📂 Đang nạp Commands và Events...");
await loadCommands(client);
await loadEvents(client);
logger.info("✅ Commands và Events đã sẵn sàng");

// ==================== API SERVER SETUP ====================
// Khởi động Express server
// Server chỉ chạy trên shard 0 để tránh xung đột port

if (isShardZero) {
  logger.info("🌐 Khởi động Top.gg API Server (Port 4000)...");
  startTopGGServer(client);

  logger.info("🌐 Khởi động Main API Server (Port 5000)...");
  startMainServer(client);
} else {
  logger.info(`⏭️ Shard ${shardId} bỏ qua API Server (chỉ shard 0 chạy)`);
}

logger.info("🔑 Đang đăng nhập bot vào Discord...");
client.login(process.env.TOKEN);

const SHARD_HEARTBEAT_INTERVAL_MS = Number(
  process.env.SHARD_HEARTBEAT_INTERVAL_MS || 30000,
);
const SHARD_HEARTBEAT_CPU_SAMPLE_MS = Number(
  process.env.SHARD_HEARTBEAT_CPU_SAMPLE_MS || 200,
);
let shardRuntimeTimer = null;
let serverLeaderboardSyncTimer = null;

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

function formatCpuModel(model) {
  const normalized = (model || "Unknown CPU").replace(/\s+/g, " ").trim();
  return normalized.length > 70 ? `${normalized.slice(0, 67)}...` : normalized;
}

function resolveCurrentShardId(client) {
  if (Number.isInteger(shardId)) return shardId;
  if (Array.isArray(client?.shard?.ids) && client.shard.ids.length > 0) {
    return Number(client.shard.ids[0]) || 0;
  }
  return 0;
}

async function sampleCpuUsage(sampleMs = SHARD_HEARTBEAT_CPU_SAMPLE_MS) {
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

  const hostCpuPercent =
    totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
  const elapsedMicros = Number(endTime - startTime) / 1000;
  const processMicros = processDiff.user + processDiff.system;
  const processCpuPercent =
    elapsedMicros > 0 ? (processMicros / elapsedMicros) * 100 : 0;

  return {
    hostCpuPercent: roundNumber(clampPercent(hostCpuPercent), 2),
    processCpuPercent: roundNumber(clampPercent(processCpuPercent), 2),
    cpuModel: formatCpuModel(startCpus[0]?.model),
    cpuCores: startCpus.length || 1,
  };
}

async function getGpuSnapshot() {
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

    if (!gpus.length) throw new Error("No NVIDIA GPU metrics");

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

        const value = Number(stdout.trim().split(/\r?\n/).pop()?.trim());
        if (Number.isFinite(value)) {
          const percent = roundNumber(clampPercent(value), 2);
          return {
            percent,
            text: `${roundNumber(percent, 1)}% (Windows GPU Engine)`,
          };
        }
      } catch {
        // Fallback below
      }
    }
  }

  return { percent: null, text: "N/A" };
}

async function collectShardRuntimeSnapshot(client) {
  if (!client?.user?.id) return null;

  const [cpuStats, gpuStats] = await Promise.all([
    sampleCpuUsage(),
    getGpuSnapshot(),
  ]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const processMem = process.memoryUsage();
  const localShardId = resolveCurrentShardId(client);
  const guildCount = client?.guilds?.cache?.size || 0;
  const memberCount =
    client?.guilds?.cache?.reduce((sum, guild) => sum + (guild.memberCount || 0), 0) ||
    0;

  return {
    botId: client.user.id,
    shardId: localShardId,
    totalShards: totalShards || 1,
    online: true,
    guilds: guildCount,
    members: memberCount,
    wsPing: Math.round(client?.ws?.ping || 0),
    uptimeMs: client.uptime || 0,
    processRamMb: toMb(processMem.rss),
    processHeapUsedMb: toMb(processMem.heapUsed),
    processHeapTotalMb: toMb(processMem.heapTotal),
    hostRamUsedMb: toMb(usedMem),
    hostRamTotalMb: toMb(totalMem),
    hostRamPercent: roundNumber((usedMem / totalMem) * 100, 2),
    cpuPercent: cpuStats.hostCpuPercent,
    processCpuPercent: cpuStats.processCpuPercent,
    gpuPercent: gpuStats.percent,
    gpuText: gpuStats.text,
    cpuModel: cpuStats.cpuModel,
    cpuCores: cpuStats.cpuCores,
    hostname: os.hostname(),
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    pid: process.pid,
    generatedAt: new Date(),
    lastHeartbeatAt: new Date(),
    error: null,
  };
}

async function upsertShardRuntimeSnapshot(client) {
  try {
    const snapshot = await collectShardRuntimeSnapshot(client);
    if (!snapshot) return;

    await ShardRuntime.updateOne(
      { botId: snapshot.botId, shardId: snapshot.shardId },
      { $set: snapshot },
      { upsert: true },
    );
  } catch (error) {
    logger.warn(
      `⚠️ Không thể cập nhật shard runtime telemetry: ${error?.message || String(error)}`,
    );
  }
}

async function markShardRuntimeOffline(client, errorMessage = "Shard process stopped") {
  try {
    if (!client?.user?.id) return;
    const localShardId = resolveCurrentShardId(client);

    await ShardRuntime.updateOne(
      { botId: client.user.id, shardId: localShardId },
      {
        $set: {
          botId: client.user.id,
          shardId: localShardId,
          totalShards: totalShards || 1,
          online: false,
          error: errorMessage,
          generatedAt: new Date(),
          lastHeartbeatAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    logger.warn(
      `⚠️ Không thể đánh dấu shard offline telemetry: ${error?.message || String(error)}`,
    );
  }
}

function startShardRuntimeSync(client) {
  if (shardRuntimeTimer) clearInterval(shardRuntimeTimer);

  upsertShardRuntimeSnapshot(client);

  shardRuntimeTimer = setInterval(() => {
    upsertShardRuntimeSnapshot(client);
  }, SHARD_HEARTBEAT_INTERVAL_MS);

  if (typeof shardRuntimeTimer.unref === "function") {
    shardRuntimeTimer.unref();
  }

  logger.info(
    `📡 Shard runtime telemetry enabled (interval ${SHARD_HEARTBEAT_INTERVAL_MS}ms)`,
  );
}

async function syncServerLeaderboardSnapshot(client) {
  try {
    const summary = await syncLocalServerLeaderboardSnapshot(client);
    logger.info(
      `🏰 Server leaderboard snapshot synced (shard ${summary.shardId}, guilds ${summary.guildsSynced}, took ${summary.tookMs}ms)`,
    );
  } catch (error) {
    logger.warn(
      `⚠️ Không thể đồng bộ server leaderboard snapshot: ${error?.message || String(error)}`,
    );
  }
}

function startServerLeaderboardSync(client) {
  if (serverLeaderboardSyncTimer) clearInterval(serverLeaderboardSyncTimer);

  syncServerLeaderboardSnapshot(client);

  serverLeaderboardSyncTimer = setInterval(() => {
    syncServerLeaderboardSnapshot(client);
  }, SERVER_LEADERBOARD_SYNC_INTERVAL_MS);

  if (typeof serverLeaderboardSyncTimer.unref === "function") {
    serverLeaderboardSyncTimer.unref();
  }

  logger.info(
    `🏰 Server leaderboard snapshot sync enabled (interval ${SERVER_LEADERBOARD_SYNC_INTERVAL_MS}ms)`,
  );
}

// ==================== SET BOT PRESENCE ====================
// Set bot status khi ready: "Playing xhelp | OrionX Bot"
client.once(Events.ClientReady, async () => {
  logger.info(`🤖 Bot đã sẵn sàng: ${client.user.tag}`);

  // Set presence: Playing xhelp | OrionX Bot
  client.user.setPresence({
    activities: [
      {
        name: "xhelp | OrionX Bot",
        type: ActivityType.Streaming,
        url: "https://twitch.tv/itssangz_"
      },
    ],
    status: "online",
  });

  logger.info("✅ Đã set presence: Playing xhelp | OrionX Bot");

  // Khởi động hệ thống giveaway (load từ file json)
  initGiveawaySystem(client);
  startShardRuntimeSync(client);
  startServerLeaderboardSync(client);
});

// ✅ Set global client cho API (Vercel webhook)
global.discordClient = client;

// ==================== GRACEFUL SHUTDOWN ====================
// Xử lý tắt bot một cách an toàn khi nhận tín hiệu từ hệ điều hành
// Quan trọng khi chạy trong môi trường sharding để tránh mất dữ liệu

async function gracefulShutdown() {
  logger.warn("\n⏹️ Đang tắt bot...");

  try {
    // Destroy client để đóng kết nối Discord một cách an toàn
    if (shardRuntimeTimer) {
      clearInterval(shardRuntimeTimer);
      shardRuntimeTimer = null;
    }
    if (serverLeaderboardSyncTimer) {
      clearInterval(serverLeaderboardSyncTimer);
      serverLeaderboardSyncTimer = null;
    }

    await markShardRuntimeOffline(client, "Graceful shutdown");
    client.destroy();

    logger.info("✅ Bot đã được tắt an toàn");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Lỗi khi tắt bot:", error);
    process.exit(1);
  }
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// ==================== XỬ LÝ LỖI ====================
// Xử lý các lỗi không được bắt trong code

process.on("unhandledRejection", (error) => {
  if (isInvalidShardReason(error)) return; // đã xử lý ở handler phía trên
  const errorMessage = error?.message || String(error);
  if (
    errorMessage.includes("MESSAGE_REFERENCE_UNKNOWN_MESSAGE") ||
    errorMessage.includes("Invalid Form Body") ||
    errorMessage.includes("Unknown interaction")
  ) {
    logger.warn("⚠️ Bỏ qua lỗi nhẹ của Discord/Interaction");
    return;
  }
  logger.error("❌ Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("❌ CRITICAL Uncaught Exception:");
  logger.error(error);
  logger.warn("🛡️ Bot đã được bảo vệ: Tiếp tục chạy mà không shutdown.");
});

// ==================== TOP.GG STATS POSTING ====================
// Gửi server count lên Top.gg hỗ trợ cả sharding
const topgg = process.env.TOPGG_TOKEN ? new Api(process.env.TOPGG_TOKEN) : null;

async function postToTopgg() {
  if (!topgg) return;
  if (!isShardZero) return; // Chỉ gửi từ shard 0 để tránh trùng lặp

  try {
    let serverCount = 0;
    const botId = client.user?.id || null;
    const runtimeSummary = await getGlobalGuildCountFromRuntime(
      botId,
    );

    if (runtimeSummary.totalGuilds > 0) {
      serverCount = runtimeSummary.totalGuilds;
    } else {
      const snapshotSummary = await getGlobalGuildCountFromSnapshots(botId);
      if (snapshotSummary.totalGuilds > 0) {
        serverCount = snapshotSummary.totalGuilds;
      }
    }

    if (!serverCount && !isSharded) {
      serverCount = client.guilds.cache.size;
    }

    if (!serverCount && isSharded) {
      logger.warn(
        "⚠️ Bỏ qua post Top.gg vì chưa có dữ liệu guild toàn bot từ Mongo (tránh gửi sai theo shard local).",
      );
      return;
    }

    await topgg.postStats({ serverCount });
    logger.info(
      `✅ OrionX đã gửi server count lên Top.gg: ${serverCount} servers`,
    );
  } catch (err) {
    logger.error("❌ Lỗi gửi stats lên Top.gg:", err);
  }
}



// ==================== SCHEDULE TOP.GG TASKS ====================
// Chỉ shard 0 mới chạy các task định kỳ này
if (isShardZero) {
  const TOPGG_INITIAL_POST_DELAY_MS = Number(
    process.env.TOPGG_INITIAL_POST_DELAY_MS || 60000,
  );

  const initialTopggTimer = setTimeout(() => {
    postToTopgg();
  }, TOPGG_INITIAL_POST_DELAY_MS);
  if (typeof initialTopggTimer.unref === "function") {
    initialTopggTimer.unref();
  }

  // Gửi server count lên Top.gg mỗi 30 phút
  const topggIntervalTimer = setInterval(postToTopgg, 30 * 60 * 1000);
  if (typeof topggIntervalTimer.unref === "function") {
    topggIntervalTimer.unref();
  }


}
