import {
  User,
  ShardRuntime,
  ServerLeaderboardSnapshot,
} from "../database/models.js";

function toSafePositiveNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export const SERVER_LEADERBOARD_SYNC_INTERVAL_MS = toSafePositiveNumber(
  process.env.SERVER_LEADERBOARD_SYNC_INTERVAL_MS,
  10 * 60 * 1000,
);

export const SERVER_LEADERBOARD_STALE_MS = toSafePositiveNumber(
  process.env.SERVER_LEADERBOARD_STALE_MS,
  SERVER_LEADERBOARD_SYNC_INTERVAL_MS * 3,
);

const SERVER_LEADERBOARD_MEMBER_FETCH_TIMEOUT_MS = toSafePositiveNumber(
  process.env.SERVER_LEADERBOARD_MEMBER_FETCH_TIMEOUT_MS,
  2000,
);

const SERVER_LEADERBOARD_MEMBER_FETCH_MAX_GUILD_SIZE = toSafePositiveNumber(
  process.env.SERVER_LEADERBOARD_MEMBER_FETCH_MAX_GUILD_SIZE,
  5000,
);

const SHARD_HEARTBEAT_STALE_MS = toSafePositiveNumber(
  process.env.SHARD_HEARTBEAT_STALE_MS,
  90000,
);

function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function resolveCurrentShardId(client) {
  if (Array.isArray(client?.shard?.ids) && client.shard.ids.length > 0) {
    return Number(client.shard.ids[0]) || 0;
  }
  return 0;
}

function isRecent(value, staleMs) {
  const timestamp = value ? new Date(value).getTime() : 0;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  return Date.now() - timestamp <= staleMs;
}

async function loadRegisteredUserMoneyMap() {
  const users = await User.find({
    tosAccepted: true,
    money: { $gt: 0 },
  })
    .select("userId money")
    .lean();

  const userMap = new Map();
  for (const user of users) {
    if (!user?.userId) continue;
    userMap.set(user.userId, toSafeNumber(user.money, 0));
  }

  return { userMap, registeredUsersCount: users.length };
}

async function getGuildMembersForSnapshot(
  guild,
  fetchTimeoutMs,
  maxGuildSizeForFetch,
) {
  if (!guild?.members) return guild?.members?.cache || new Map();

  if ((guild.memberCount || 0) > maxGuildSizeForFetch) {
    return guild.members.cache;
  }

  try {
    return await guild.members
      .fetch({ time: fetchTimeoutMs })
      .catch(() => guild.members.cache);
  } catch {
    return guild.members.cache;
  }
}

async function computeGuildSnapshot(
  guild,
  userMoneyMap,
  fetchTimeoutMs,
  maxGuildSizeForFetch,
) {
  if (!guild?.id) return null;

  const members = await getGuildMembersForSnapshot(
    guild,
    fetchTimeoutMs,
    maxGuildSizeForFetch,
  );

  let totalMoney = 0;
  let registeredCount = 0;

  for (const [memberId] of members) {
    const money = userMoneyMap.get(memberId);
    if (!money) continue;
    totalMoney += money;
    registeredCount += 1;
  }

  return {
    guildId: guild.id,
    guildName: guild.name || "Unknown Server",
    memberCount: toSafeNumber(guild.memberCount, 0),
    registeredCount,
    totalMoney,
  };
}

async function runWithConcurrency(items, limit, task) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const safeLimit = Math.max(1, toSafeNumber(limit, 1));
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await task(current));
    }
  }

  const workers = Array.from(
    { length: Math.min(safeLimit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function syncLocalServerLeaderboardSnapshot(client, options = {}) {
  if (!client?.user?.id) {
    return {
      botId: null,
      shardId: 0,
      guildsSynced: 0,
      registeredUsersCount: 0,
      tookMs: 0,
    };
  }

  const startedAt = Date.now();
  const botId = client.user.id;
  const shardId = resolveCurrentShardId(client);
  const guilds = Array.from(client.guilds?.cache?.values() || []);
  const fetchTimeoutMs = toSafePositiveNumber(
    options.fetchTimeoutMs,
    SERVER_LEADERBOARD_MEMBER_FETCH_TIMEOUT_MS,
  );
  const maxGuildSizeForFetch = toSafePositiveNumber(
    options.maxGuildSizeForFetch,
    SERVER_LEADERBOARD_MEMBER_FETCH_MAX_GUILD_SIZE,
  );
  const concurrency = toSafePositiveNumber(options.concurrency, 3);
  const syncedAt = new Date();

  const { userMap, registeredUsersCount } = await loadRegisteredUserMoneyMap();

  const snapshotRows = (
    await runWithConcurrency(guilds, concurrency, async (guild) =>
      computeGuildSnapshot(guild, userMap, fetchTimeoutMs, maxGuildSizeForFetch),
    )
  ).filter(Boolean);

  if (snapshotRows.length > 0) {
    await ServerLeaderboardSnapshot.bulkWrite(
      snapshotRows.map((row) => ({
        updateOne: {
          filter: { botId, guildId: row.guildId },
          update: {
            $set: {
              botId,
              shardId,
              guildId: row.guildId,
              guildName: row.guildName,
              memberCount: row.memberCount,
              registeredCount: row.registeredCount,
              totalMoney: row.totalMoney,
              lastSyncedAt: syncedAt,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  const localGuildIds = snapshotRows.map((row) => row.guildId);
  if (localGuildIds.length === 0) {
    await ServerLeaderboardSnapshot.deleteMany({ botId, shardId });
  } else {
    await ServerLeaderboardSnapshot.deleteMany({
      botId,
      shardId,
      guildId: { $nin: localGuildIds },
    });
  }

  return {
    botId,
    shardId,
    guildsSynced: snapshotRows.length,
    registeredUsersCount,
    tookMs: Date.now() - startedAt,
    syncedAt,
  };
}

async function getOnlineShardIds(botId, staleMs = SHARD_HEARTBEAT_STALE_MS) {
  if (!botId) return [];

  const docs = await ShardRuntime.find({ botId })
    .select("shardId online lastHeartbeatAt generatedAt updatedAt")
    .lean();

  const shardIds = new Set();
  for (const doc of docs) {
    const heartbeatAt =
      doc?.lastHeartbeatAt || doc?.generatedAt || doc?.updatedAt || null;
    if (!doc?.online || !isRecent(heartbeatAt, staleMs)) continue;
    shardIds.add(toSafeNumber(doc.shardId, 0));
  }

  return Array.from(shardIds).sort((a, b) => a - b);
}

export async function loadGlobalServerLeaderboard(botId, options = {}) {
  if (!botId) {
    return {
      rows: [],
      total: 0,
      onlineShardIds: [],
      usedOnlineShardFilter: false,
    };
  }

  const includeOfflineShards = Boolean(options.includeOfflineShards);
  const staleMs = toSafePositiveNumber(
    options.staleMs,
    SERVER_LEADERBOARD_STALE_MS,
  );
  const limit = Number(options.limit);
  const onlineShardIds = includeOfflineShards
    ? []
    : await getOnlineShardIds(botId, options.shardHeartbeatStaleMs);

  const query = { botId };
  const usedOnlineShardFilter = !includeOfflineShards && onlineShardIds.length > 0;
  if (usedOnlineShardFilter) {
    query.shardId = { $in: onlineShardIds };
  }

  if (staleMs > 0) {
    query.lastSyncedAt = { $gte: new Date(Date.now() - staleMs) };
  }

  const total = await ServerLeaderboardSnapshot.countDocuments(query);

  let builder = ServerLeaderboardSnapshot.find(query)
    .sort({
      totalMoney: -1,
      registeredCount: -1,
      memberCount: -1,
      guildName: 1,
    })
    .select(
      "guildId guildName shardId totalMoney memberCount registeredCount lastSyncedAt",
    );

  if (Number.isFinite(limit) && limit > 0) {
    builder = builder.limit(Math.floor(limit));
  }

  const rows = await builder.lean();

  return {
    rows: rows.map((row) => ({
      guildId: row.guildId,
      guildName: row.guildName || "Unknown Server",
      shardId: toSafeNumber(row.shardId, 0),
      totalMoney: toSafeNumber(row.totalMoney, 0),
      memberCount: toSafeNumber(row.memberCount, 0),
      registeredCount: toSafeNumber(row.registeredCount, 0),
      lastSyncedAt: row.lastSyncedAt || null,
    })),
    total,
    onlineShardIds,
    usedOnlineShardFilter,
  };
}

export async function getGlobalGuildCountFromRuntime(
  botId,
  staleMs = SHARD_HEARTBEAT_STALE_MS,
) {
  if (!botId) {
    return {
      totalGuilds: 0,
      onlineShardIds: [],
      totalKnownShards: 0,
    };
  }

  const docs = await ShardRuntime.find({ botId })
    .select("shardId guilds online lastHeartbeatAt generatedAt updatedAt")
    .lean();

  const onlineShardIds = [];
  let totalGuilds = 0;

  for (const doc of docs) {
    const heartbeatAt =
      doc?.lastHeartbeatAt || doc?.generatedAt || doc?.updatedAt || null;
    if (!doc?.online || !isRecent(heartbeatAt, staleMs)) continue;
    onlineShardIds.push(toSafeNumber(doc.shardId, 0));
    totalGuilds += toSafeNumber(doc.guilds, 0);
  }

  return {
    totalGuilds,
    onlineShardIds: onlineShardIds.sort((a, b) => a - b),
    totalKnownShards: docs.length,
  };
}

export async function getGlobalGuildCountFromSnapshots(
  botId,
  staleMs = SERVER_LEADERBOARD_STALE_MS,
) {
  if (!botId) {
    return {
      totalGuilds: 0,
      staleMs,
    };
  }

  const query = { botId };
  if (Number(staleMs) > 0) {
    query.lastSyncedAt = { $gte: new Date(Date.now() - Number(staleMs)) };
  }

  const totalGuilds = await ServerLeaderboardSnapshot.countDocuments(query);
  return {
    totalGuilds,
    staleMs,
  };
}
