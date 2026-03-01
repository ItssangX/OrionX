import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export default async function connectDatabase() {
  try {
    const maskedUri = process.env.MONGODB_URI?.replace(/:([^:@]{1,})@/, ':****@');
    logger.info(`🔌 Đang kết nối tới MongoDB: ${maskedUri}`);

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      family: 4, // Bắt buộc dùng IPv4 (tránh lỗi treo trên một số hệ thống)
    });
    logger.info('✅ Đã kết nối MongoDB thành công!');
  } catch (error) {
    logger.error('❌ Lỗi kết nối MongoDB:', error);
    if (error.name === 'MongooseServerSelectionError') {
      logger.error('👉 LƯU Ý: Nếu dùng IP nội bộ (192.168.x.x), hãy đảm bảo:');
      logger.error('   1. Đã bật bindIp: 0.0.0.0 trong mongod.cfg');
      logger.error('   2. Đã mở port 27017 trong Windows Firewall');
      logger.error('   3. Hai thiết bị dùng chung một mạng Wi-Fi');
    }
    process.exit(1);
  }
}