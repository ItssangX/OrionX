import mongoose from 'mongoose';

// ==========================================
// 1. PET SCHEMA (Sub-schema cho User)
// ==========================================
const petSchema = new mongoose.Schema({
  petId: {
    type: String,
    required: false // Bỏ required để tương thích với dữ liệu cũ không có petId
  },
  name: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    default: null
  },
  type: {
    type: String,
    default: "normal"
  }, // common | uncommon | rare | epic | mythic | legendary | event | special | normal

  // Stats cơ bản (Current)
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  hp: { type: Number, default: 50 },
  atk: { type: Number, default: 5 },
  def: { type: Number, default: 2 },

  // Base Stats (At LV 0/initial) - Used for scaling
  baseHp: { type: Number, default: 50 },
  baseAtk: { type: Number, default: 5 },
  baseDef: { type: Number, default: 2 },

  // Skill của pet
  skill: {
    name: { type: String, default: null },
    description: { type: String, default: null },
    damage: { type: Number, default: 0 },
    cooldown: { type: Number, default: 0 }
  },

  // Bonus khi hoạt động
  bonus: {
    hunt: { type: Number, default: 0 },   // % bonus khi hunt
    battle: { type: Number, default: 0 }  // % bonus khi battle
  },

  equipped: { type: Boolean, default: false }, // Đang sử dụng
  favorite: { type: Boolean, default: false }, // Pet yêu thích - không thể bán
  isEvent: { type: Boolean, default: false }, // Đánh dấu pet event

  // Weapon trang bị
  weapon: {
    id: String,
    name: String,
    emoji: String,
    rarity: String,
    atk: { type: Number, default: 0 },
    def: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    stats: { type: mongoose.Schema.Types.Mixed }
  },

  createdAt: { type: Date, default: Date.now }
});

// ==========================================
// 2. BANK SCHEMA (Sub-schema cho User)
// ==========================================
const bankSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0
  },
  capacity: {
    type: Number,
    default: 50000
  },
  lastInterest: Date,
  tier: {
    type: Number,
    default: 1
  }
}, { _id: false });

// ==========================================
// 3. USER MODEL - Quản lý người dùng
// ==========================================
const userSchema = new mongoose.Schema({
  // Thông tin cơ bản
  userId: {
    type: String,
    required: true,
    unique: true
  },
  guilds: {
    type: [String],
    index: true
  },
  username: String,

  // ====== ADMIN SYSTEM ======
  isAdmin: {
    type: Boolean,
    default: false
  },

  // Terms of Service
  tosAccepted: {
    type: Boolean,
    default: false
  },
  tosAcceptedAt: Date,

  // Kinh tế
  money: {
    type: Number,
    default: 0
  },
  bank: {
    type: bankSchema,
    default: () => ({})
  },

  // Level & EXP
  level: {
    type: Number,
    default: 1
  },
  exp: {
    type: Number,
    default: 0
  },

  // Stats chiến đấu
  hp: { type: Number, default: 100 },
  atk: { type: Number, default: 10 },
  def: { type: Number, default: 5 },

  // Cooldowns
  lastDaily: Date,
  lastWork: Date,
  lastVoteAt: Date,

  // ====== STREAK SYSTEM ======
  dailyStreak: { type: Number, default: 0 },
  maxDailyStreak: { type: Number, default: 0 }, // Added: Chuỗi daily cao nhất để phục hồi
  lastDailyStreak: Date, // Để kiểm tra streak có bị broken không

  battleWinStreak: { type: Number, default: 0 },
  maxBattleWinStreak: { type: Number, default: 0 },
  totalBattleWins: { type: Number, default: 0 }, // Tổng số battle thắng

  // ====== TEAM BATTLE SYSTEM (3 pets) ======
  team: {
    slot1: { type: mongoose.Schema.Types.Mixed, default: null },
    slot2: { type: mongoose.Schema.Types.Mixed, default: null },
    slot3: { type: mongoose.Schema.Types.Mixed, default: null }
  },

  // ====== AUTO HUNT SYSTEM ======
  autoHunt: {
    isActive: { type: Boolean, default: false },
    startTime: Date,
    endTime: Date,
    petCount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 }
  },

  // ====== QUEST SYSTEM ======
  quests: {
    lastReset: { type: Date, default: null },
    tasks: [{
      id: String,
      name: String,
      target: Number,
      progress: { type: Number, default: 0 },
      reward: Number,
      completed: { type: Boolean, default: false }
    }]
  },

  // ====== CHECKLIST SYSTEM (New) ======
  checklist: {
    lastReset: { type: Date, default: null },
    isClaimed: { type: Boolean, default: false },
    tasks: {
      daily: { type: Boolean, default: false },
      quest: { type: Boolean, default: false },
      hunt: { type: Boolean, default: false },
      battle: { type: Boolean, default: false },
      vote: { type: Boolean, default: false }
    }
  },

  // ====== PROFILE SETTINGS ======
  profileSettings: {
    color: { type: String, default: '#5865F2' },
    title: { type: String, default: null },
    image: { type: String, default: null },
    showStats: { type: Boolean, default: true },
    showPets: { type: Boolean, default: true },
    showBadges: { type: Boolean, default: true }
  },

  // ====== CAPTCHA SECURITY ======
  captcha: {
    commandCount: { type: Number, default: 0 },
    bannedTemporarily: { type: Boolean, default: false },
    muteUntil: { type: Date, default: null },
    isPermBanned: { type: Boolean, default: false },
    verificationPending: { type: Boolean, default: false },
    challengeAttempts: { type: Number, default: 0 },
    challengeExpiresAt: { type: Date, default: null },
    currentCaptchaAnswer: { type: String, default: null },
    currentCaptchaId: { type: String, default: null },
    bannedReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: String, default: null }
  },

  // ====== BUFF SYSTEM ======
  buffs: {
    globalMultiplier: {
      value: { type: Number, default: 1 },
      expireAt: { type: Date, default: null }
    },
    dailyMultiplier: {
      value: { type: Number, default: 1 },
      expireAt: { type: Date, default: null }
    },
    xpMultiplier: {
      value: { type: Number, default: 1 },
      expireAt: { type: Date, default: null }
    }
  },

  // ====== SHOP PURCHASE HISTORY ======
  shopPurchaseHistory: {
    lastShopUpdate: { type: Date, default: null },
    purchases: [{
      itemId: String,
      count: { type: Number, default: 0 }
    }]
  },

  // Inventory (túi đồ)
  inventory: [{
    itemId: String,
    itemName: String,
    quantity: Number
  }],

  // Pets
  pets: {
    type: [petSchema],
    default: []
  },

  // Weapons Inventory
  weapons: [{
    id: String,
    name: String,
    emoji: String,
    rarity: String,
    atk: { type: Number, default: 0 },
    def: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    favorite: { type: Boolean, default: false },
    equippedTo: { type: String, default: null }, // ID của pet đang trang bị

    obtainedAt: { type: Date, default: Date.now }
  }],

  // Huy hiệu & bio
  badges: [String],
  bio: {
    type: String,
    default: 'Chưa có bio'
  },
  lastVotedAt: Date,

  // Cooldowns across shards
  cooldowns: {
    type: Map,
    of: Date,
    default: {}
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ==========================================
// 4. GUILD MODEL - Quản lý server
// ==========================================
const guildSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  guildName: String,

  // Cấu hình
  prefix: {
    type: String,
    default: '!'
  },

  // Kênh hệ thống
  welcomeChannel: String,
  goodbyeChannel: String,
  modLogChannel: String,

  // Roles
  autoRole: String,
  muteRole: String,

  // Settings
  settings: {
    antiSpam: {
      type: Boolean,
      default: false
    },
    antiLink: {
      type: Boolean,
      default: false
    },
    welcomeMessage: {
      type: String,
      default: 'Chào mừng {user} đến với server!'
    }
  },

  // Quản lý lệnh bị tắt theo kênh
  disabledCommands: [{
    channelId: String,
    commands: [String], // ['all'] nếu tắt tất cả lệnh
    disabledBy: String,
    disabledAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// ==========================================
// 5. ECONOMY MODEL - Kinh tế theo server
// ==========================================
// Index để tìm kiếm nhanh
// economySchema.index({ userId: 1, guildId: 1 }, { unique: true });

// ==========================================
// 6. WARNING MODEL - Cảnh báo/Warn
// ==========================================
const warningSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },

  // Danh sách cảnh báo
  warnings: [{
    moderatorId: String,
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],

  totalWarnings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ==========================================
// 7. LEADERBOARD MODEL - Bảng xếp hạng
// ==========================================
const leaderboardSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  type: {
    type: String, // 'level', 'money', 'messages'
    required: true
  },

  // Danh sách xếp hạng
  users: [{
    userId: String,
    username: String,
    value: Number,
    rank: Number
  }],

  lastUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ==========================================
// 8. TICKET MODEL - Hệ thống ticket
// ==========================================
const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  guildId: String,
  channelId: String,

  // Người tạo ticket
  userId: String,
  username: String,

  category: String, // 'support', 'report', 'other'
  status: {
    type: String,
    default: 'open' // 'open', 'closed', 'resolved'
  },

  // Tin nhắn trong ticket
  messages: [{
    authorId: String,
    authorName: String,
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  closedBy: String,
  closedAt: Date
}, {
  timestamps: true
});

// ==========================================
// 9. GIVEAWAY MODEL - Hệ thống Giveaway
// ==========================================
const giveawaySchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  channelId: String,
  guildId: String,

  // Thông tin giveaway
  prize: String,
  winners: Number,
  endTime: Date,
  hostId: String,

  // Người tham gia
  participants: [String],

  // Trạng thái
  ended: {
    type: Boolean,
    default: false
  },
  winnerIds: [String]
}, {
  timestamps: true
});

// ==========================================
// 11. ADMIN LOG SCHEMA - Track lịch sử admin actions
// ==========================================
const adminLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  adminId: {
    type: String,
    required: true,
    index: true
  },
  adminUsername: String,
  action: {
    type: String,
    enum: ['add', 'kick', 'give', 'set'],
    required: true,
    index: true
  },
  targetId: {
    type: String,
    required: true,
    index: true
  },
  targetUsername: String,
  amount: Number, // Cho give/set
  amountSign: String, // '+' hoặc '-' cho set
  success: {
    type: Boolean,
    default: true
  },
  error: String, // Lỗi nếu có
  details: String // Mô tả thêm
});

// ==========================================
// 12. GLOBAL DATA SCHEMA - Quản lý trạng thái bot toàn cục
// ==========================================
const globalDataSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  data: mongoose.Schema.Types.Mixed,
  lastUpdate: {
    type: Date,
    default: Date.now
  }
});

// ==========================================
// 13. SERVER LEADERBOARD SNAPSHOT MODEL - Snapshot top server theo shard
// ==========================================
const serverLeaderboardSnapshotSchema = new mongoose.Schema({
  botId: {
    type: String,
    required: true,
    index: true
  },
  shardId: {
    type: Number,
    required: true,
    index: true
  },
  guildId: {
    type: String,
    required: true,
    index: true
  },
  guildName: {
    type: String,
    default: "Unknown Server"
  },
  memberCount: {
    type: Number,
    default: 0
  },
  registeredCount: {
    type: Number,
    default: 0
  },
  totalMoney: {
    type: Number,
    default: 0
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

serverLeaderboardSnapshotSchema.index({ botId: 1, guildId: 1 }, { unique: true });
serverLeaderboardSnapshotSchema.index({ botId: 1, shardId: 1, totalMoney: -1 });

// ==========================================
// 13. SHARD RUNTIME MODEL - Telemetry theo shard (cross-machine)
// ==========================================
const shardRuntimeSchema = new mongoose.Schema({
  botId: {
    type: String,
    required: true,
    index: true
  },
  shardId: {
    type: Number,
    required: true,
    index: true
  },
  totalShards: {
    type: Number,
    default: 1
  },
  online: {
    type: Boolean,
    default: true
  },
  guilds: {
    type: Number,
    default: 0
  },
  members: {
    type: Number,
    default: 0
  },
  wsPing: {
    type: Number,
    default: 0
  },
  uptimeMs: {
    type: Number,
    default: 0
  },
  processRamMb: {
    type: Number,
    default: 0
  },
  processHeapUsedMb: {
    type: Number,
    default: 0
  },
  processHeapTotalMb: {
    type: Number,
    default: 0
  },
  hostRamUsedMb: {
    type: Number,
    default: 0
  },
  hostRamTotalMb: {
    type: Number,
    default: 0
  },
  hostRamPercent: {
    type: Number,
    default: 0
  },
  cpuPercent: {
    type: Number,
    default: 0
  },
  processCpuPercent: {
    type: Number,
    default: 0
  },
  gpuPercent: {
    type: Number,
    default: null
  },
  gpuText: {
    type: String,
    default: "N/A"
  },
  cpuModel: {
    type: String,
    default: "Unknown CPU"
  },
  cpuCores: {
    type: Number,
    default: 0
  },
  hostname: {
    type: String,
    default: null
  },
  os: {
    type: String,
    default: null
  },
  nodeVersion: {
    type: String,
    default: null
  },
  pid: {
    type: Number,
    default: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  lastHeartbeatAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

shardRuntimeSchema.index({ botId: 1, shardId: 1 }, { unique: true });

// ==========================================
// 13. GAME 2D MODEL - Quản lý tiến trình mini-game
// ==========================================
// ==========================================
// 14. SURVIVAL CHUNK MODEL - Lưu trữ Map thế giới mở
// ==========================================
const survivalChunkSchema = new mongoose.Schema({
  chunkId: { type: String, required: true, unique: true }, // Format "X_Y"
  // Stores ONLY player modifications to save space. Key: "x,y" (0-15), Value: block type
  modifications: {
    type: Map,
    of: String,
    default: {}
  },
  lastUpdated: { type: Date, default: Date.now }
});

// ==========================================
// 13. GAME 2D MODEL - Quản lý tiến trình mini-game
// ==========================================
const game2DSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // Progress
  currentLevel: { type: Number, default: null },
  currentStage: { type: Number, default: null },
  completedStages: {
    type: Map,
    of: Number,
    default: { "1": 0, "2": 0, "3": 0, "4": 0 }
  },

  // Location & Global State
  username: { type: String, default: null },
  location: { type: String, default: 'lobby' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  chatMessage: { type: String, default: null },

  // Stats
  hp: { type: Number, default: 100 },
  maxHp: { type: Number, default: 100 },
  coins: { type: Number, default: 100 },

  // Inventory & Skills
  inventory: {
    swords: {
      type: Map,
      of: Number,
      default: { "sword_0": 1 } // Default sword
    },
    skills: {
      type: Map,
      of: Number,
      default: {}
    },
    items: {
      type: Map,
      of: Number,
      default: {}
    }
  },

  // Equipped Gear
  equipped: {
    sword: { type: String, default: 'sword_0' },
    skill: { type: String, default: null }
  },

  // SURVIVAL MODE DATA
  survival: {
    x: { type: Number, default: 0 }, // Global X
    y: { type: Number, default: 0 }, // Global Y
    inventory: {
      type: Map,
      of: Number,
      default: { wood: 0, stone: 0 }
    },
    lastPvpTime: { type: Date, default: null },
    isDead: { type: Boolean, default: false }
  },
  isSurvival: { type: Boolean, default: false }

}, { timestamps: true });

// ==========================================
// 15. SURVIVAL WORLD MODEL - Quản lý trạng thái chung của thế giới
// ==========================================
const survivalWorldSchema = new mongoose.Schema({
  worldId: { type: String, default: 'main', unique: true },
  worldTime: { type: Number, default: 0 },
  weather: { type: String, default: 'clear' },
  enemies: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  purgePhase: { type: String, default: 'spawn' }, // 'spawn' or 'clean'
  purgeTimer: { type: Number, default: 600 },    // Seconds remaining in phase
  lastUpdate: { type: Date, default: Date.now }
});

// ==========================================
// EXPORT TẤT CẢ MODELS
// ==========================================
export const User = mongoose.model('User', userSchema);
export const Guild = mongoose.model('Guild', guildSchema);
// export const Economy = mongoose.model('Economy', economySchema);
export const Warning = mongoose.model('Warning', warningSchema);
export const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
export const Ticket = mongoose.model('Ticket', ticketSchema);
export const Giveaway = mongoose.model('Giveaway', giveawaySchema);
export const AdminLog = mongoose.model('AdminLog', adminLogSchema);
export const GlobalData = mongoose.model('GlobalData', globalDataSchema);
export const ServerLeaderboardSnapshot = mongoose.model('ServerLeaderboardSnapshot', serverLeaderboardSnapshotSchema);
export const ShardRuntime = mongoose.model('ShardRuntime', shardRuntimeSchema);
export const Game2D = mongoose.model('Game2D', game2DSchema);
export const SurvivalChunk = mongoose.model('SurvivalChunk', survivalChunkSchema);
export const SurvivalWorld = mongoose.model('SurvivalWorld', survivalWorldSchema);

// Export default object chứa tất cả
export default {
  User,
  Guild,
  // Economy,
  Warning,
  Leaderboard,
  Ticket,
  Giveaway,
  GlobalData,
  ServerLeaderboardSnapshot,
  ShardRuntime,
  Game2D,
  SurvivalWorld
};
