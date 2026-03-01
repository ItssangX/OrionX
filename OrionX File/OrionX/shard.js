// ==================== FILE: shard.js ====================
// File này quản lý hệ thống Sharding cho bot Discord
// Sharding giúp bot có thể xử lý nhiều server (guilds) hơn bằng cách chia bot thành nhiều shard
// Mỗi shard chạy một instance riêng của bot để phân tải công việc

import 'dotenv/config';
import { ShardingManager } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './utils/logger.js';

// ==================== CẤU HÌNH ĐƯỜNG DẪN ====================
// Lấy đường dẫn tuyệt đối của file hiện tại để đảm bảo hoạt động đúng trên mọi hệ điều hành
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== CẤU HÌNH SHARDING ====================
// Số lượng shard sẽ được tính tự động dựa trên số lượng guilds
// Discord khuyến nghị: ~1000 guilds per shard
// Nếu không set TOTAL_SHARDS trong .env, sẽ dùng 'auto' để tự động tính toán
// SHARD_LIST có thể được set để chỉ chạy các shard cụ thể (ví dụ: "0" trên máy 1, "1,2,3" trên máy 2)
const RAW_TOTAL = process.env.TOTAL_SHARDS || 'auto';
const SHARD_LIST = process.env.SHARD_LIST ? process.env.SHARD_LIST.split(',').map(s => parseInt(s.trim(), 10)) : null;
const TOKEN = process.env.TOKEN;

// Khi chạy phân tán (nhiều máy): MỖI MÁY phải dùng cùng TOTAL_SHARDS (số cố định), không dùng 'auto'
if (SHARD_LIST && (RAW_TOTAL === 'auto' || RAW_TOTAL === '')) {
  logger.error('❌ Khi dùng SHARD_LIST (chạy một phần shard), bạn phải set TOTAL_SHARDS trong .env (số cố định, ví dụ: 4). Không dùng auto.');
  process.exit(1);
}
const TOTAL_SHARDS = RAW_TOTAL;

// Kiểm tra token trước khi khởi động
if (!TOKEN) {
  logger.error('❌ TOKEN không được tìm thấy trong .env!');
  process.exit(1);
}

// ==================== KHỞI TẠO SHARDING MANAGER ====================
// ShardingManager sẽ quản lý tất cả các shard
// File index.js sẽ được chạy cho mỗi shard
// totalShards: số lượng shard tổng cộng ('auto' = tự động tính toán)
// shardList: danh sách shard cụ thể cần chạy (null = chạy tất cả)
// mode: 'process' = mỗi shard chạy trong process riêng (khuyến nghị)

const manager = new ShardingManager(
  join(__dirname, 'index.js'), // File bot chính sẽ được chạy cho mỗi shard
  {
    token: TOKEN,
    totalShards: TOTAL_SHARDS === 'auto' ? 'auto' : parseInt(TOTAL_SHARDS),
    shardList: SHARD_LIST, // null = chạy tất cả shard, hoặc [0, 1] để chỉ chạy shard cụ thể
    mode: 'process', // 'process' = mỗi shard trong process riêng (ổn định hơn), 'worker' = trong worker thread
    respawn: true, // Tự động khởi động lại shard nếu bị crash
    execArgv: ['--enable-source-maps'], // Các tham số cho Node.js process
    spawnTimeout: 120000, // Tăng lên 120 giây cho thiết bị Android
  }
);

// ==================== XỬ LÝ SỰ KIỆN SHARD ====================

// Khi một shard được tạo (spawn)
manager.on('shardCreate', (shard) => {
  shard.on('ready', () => {
    logger.info(`✅ Shard ${shard.id} sẵn sàng`);
  });

  shard.on('disconnect', () => {
    logger.warn(`⚠️ Shard ${shard.id} đã ngắt kết nối`);
  });

  shard.on('reconnecting', () => {
    logger.info(`🔄 Shard ${shard.id} reconnecting`);
  });

  shard.on('death', () => {
    logger.error(`💀 Shard ${shard.id} đã chết và sẽ được khởi động lại`);
  });

  // Xử lý lỗi từ shard (Invalid shard khi disconnect/ reconnect — không crash manager)
  shard.on('error', (error) => {
    const msg = error?.message || String(error);
    if (msg === 'Invalid shard' || msg.includes('Invalid shard')) {
      logger.warn(`⚠️ Shard ${shard.id}: ${msg} (sẽ respawn nếu cần)`);
      return;
    }
    logger.error(`❌ Lỗi Shard ${shard.id}:`, error);
  });
});

// ==================== XỬ LÝ LỖI MANAGER ====================
manager.on('error', (error) => {
  logger.error('❌ Lỗi ShardingManager:', error);
});

// ==================== THỐNG KÊ SHARD ====================
// Hàm này sẽ log thông tin về tất cả các shard
function logShardStats() {
  const shards = manager.shards;
  logger.info(`\n📊 THỐNG KÊ SHARD:`);
  logger.info(`   Tổng số shard: ${shards.size}`);

  shards.forEach((shard) => {
    const status = shard.ready ? '✅ Online' : '⏳ Đang khởi động';
    logger.info(`   Shard ${shard.id}: ${status}`);
  });
  logger.info('');
}

// REMOVED: Shard stats interval logging để giảm RAM usage
// Nếu cần xem stats, có thể check qua API /api/bot/info

// ==================== XỬ LÝ TẮT CHƯƠNG TRÌNH ====================
// Đảm bảo tất cả shard được tắt đúng cách khi dừng manager

async function gracefulShutdown() {
  logger.warn('\n⏹️ Đang tắt ShardingManager...');

  try {
    // Dừng tất cả shard một cách an toàn
    await manager.destroy();
    logger.info('✅ Tất cả shard đã được tắt');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Lỗi khi tắt shard:', error);
    process.exit(1);
  }
}

// Lắng nghe tín hiệu dừng từ hệ điều hành
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Xử lý lỗi không bắt được
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception trong ShardingManager:', error);
  logger.warn('🛡️ Manager đã được bảo vệ: Tiếp tục chạy.');
});

process.on('unhandledRejection', (reason, promise) => {
  const msg = reason?.message ?? String(reason);
  if (msg === 'Invalid shard' || msg.includes('Invalid shard')) {
    logger.warn('⚠️ Unhandled Rejection (Invalid shard) — bỏ qua, shard sẽ được respawn.');
    return;
  }
  logger.error('❌ Unhandled Rejection trong ShardingManager:', reason);
});

// ==================== KHỞI ĐỘNG SHARDING MANAGER ====================
// Bắt đầu spawn tất cả các shard

logger.info('\n' + '='.repeat(60));
logger.info('🤖 ORIONX VIP - SHARDING MANAGER (DISTRIBUTED)');
logger.info('='.repeat(60));
logger.info(`📦 Tổng số shard: ${TOTAL_SHARDS === 'auto' ? 'Tự động tính toán' : TOTAL_SHARDS}`);
logger.info(`📋 Danh sách shard máy này chạy: ${SHARD_LIST ? SHARD_LIST.join(', ') : 'Tất cả'}`);
logger.info(`🔧 Mode: ${manager.mode}`);
logger.info(`🔄 Respawn: ${manager.respawn ? 'Bật' : 'Tắt'}`);
logger.info('='.repeat(60) + '\n');

// Spawn tất cả shard
manager.spawn()
  .then(() => {
    logger.info('✅ ShardingManager đã khởi động thành công!');
    logger.info('📝 Lưu ý: API Server chỉ chạy trên Shard 0');
    logger.info('📝 Lưu ý: Database được chia sẻ giữa tất cả shard\n');

    // Log thống kê ban đầu sau 5 giây
    setTimeout(() => {
      logShardStats();
    }, 5000);
  })
  .catch((error) => {
    logger.error('❌ Lỗi khi khởi động ShardingManager:', error);
    const msg = error?.message ?? String(error);
    // Khi một shard disconnect trước khi ready (mạng/rate limit): không thoát để shard khác vẫn chạy, respawn sẽ thử lại
    if (msg.includes("disconnected before becoming ready") || msg.includes("Invalid shard")) {
      logger.warn('⚠️ Một shard chưa kịp ready. Kiểm tra TOTAL_SHARDS giống nhau trên mọi máy và mạng/token.');
      logger.warn('   Manager vẫn chạy; nếu respawn bật, shard lỗi sẽ được thử lại.');
      return;
    }
    process.exit(1);
  });
