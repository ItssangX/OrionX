import { AdminLog } from "../database/models.js";
import logger from "./logger.js";

/**
 * Log admin action vào database
 * @param {string} adminId - ID của admin
 * @param {string} adminUsername - Username của admin
 * @param {string} action - 'add' | 'kick' | 'give' | 'set'
 * @param {string} targetId - ID của target user
 * @param {string} targetUsername - Username của target user
 * @param {number} amount - Số tiền (nếu có)
 * @param {string} amountSign - '+' hoặc '-' (nếu là set)
 * @param {boolean} success - Thành công hay thất bại
 * @param {string} error - Thông báo lỗi (nếu có)
 * @param {string} details - Chi tiết thêm
 */
export async function logAdminAction(
  adminId,
  adminUsername,
  action,
  targetId,
  targetUsername,
  amount = null,
  amountSign = null,
  success = true,
  error = null,
  details = null,
) {
  try {
    const log = new AdminLog({
      adminId,
      adminUsername,
      action,
      targetId,
      targetUsername,
      amount,
      amountSign,
      success,
      error,
      details,
    });

    await log.save();
    logger.info(
      `📋 [ADMIN LOG] ${adminUsername} (${action}) -> ${targetUsername} ${amount ? `(${amountSign}${amount})` : ""}`,
    );

    return log;
  } catch (err) {
    logger.error("Lỗi khi log admin action:", err);
  }
}

/**
 * Lấy lịch sử admin actions
 * @param {string} adminId - Lọc theo admin ID (optional)
 * @param {number} limit - Số kết quả (default 20)
 * @returns {Array} Danh sách admin actions
 */
export async function getAdminLogs(adminId = null, limit = 20) {
  try {
    const query = adminId ? { adminId } : {};
    const logs = await AdminLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);

    return logs;
  } catch (err) {
    logger.error("Lỗi khi lấy admin logs:", err);
    return [];
  }
}

/**
 * Lấy lịch sử admin actions của một user bị tác động
 * @param {string} targetId - ID của user bị tác động
 * @param {number} limit - Số kết quả
 * @returns {Array} Danh sách actions
 */
export async function getAdminLogsForTarget(targetId, limit = 20) {
  try {
    const logs = await AdminLog.find({ targetId })
      .sort({ timestamp: -1 })
      .limit(limit);

    return logs;
  } catch (err) {
    logger.error("Lỗi khi lấy admin logs cho target:", err);
    return [];
  }
}

/**
 * Đếm số lần admin thực hiện action
 * @param {string} adminId - ID admin
 * @param {string} action - Action type (optional)
 */
export async function countAdminActions(adminId, action = null) {
  try {
    const query = { adminId };
    if (action) query.action = action;

    const count = await AdminLog.countDocuments(query);
    return count;
  } catch (err) {
    logger.error("Lỗi khi đếm admin actions:", err);
    return 0;
  }
}

/**
 * Lấy lịch sử admin actions với pagination
 * @param {string} adminId - Lọc theo admin ID (optional)
 * @param {number} page - Số trang (bắt đầu từ 0)
 * @param {number} limit - Số kết quả mỗi trang (default 10)
 * @returns {Object} { logs: Array, total: number, page: number, pages: number }
 */
export async function getAdminLogsPaginated(
  adminId = null,
  page = 0,
  limit = 10,
) {
  try {
    const query = adminId ? { adminId } : {};
    const skip = page * limit;

    const logs = await AdminLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AdminLog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      pages: totalPages,
    };
  } catch (err) {
    logger.error("Lỗi khi lấy admin logs pagination:", err);
    return { logs: [], total: 0, page: 0, pages: 0 };
  }
}

/**
 * Lấy lịch sử admin actions của một user bị tác động với pagination
 * @param {string} targetId - ID của user bị tác động
 * @param {number} page - Số trang (bắt đầu từ 0)
 * @param {number} limit - Số kết quả mỗi trang (default 10)
 * @returns {Object} { logs: Array, total: number, page: number, pages: number }
 */
export async function getAdminLogsForTargetPaginated(
  targetId,
  page = 0,
  limit = 10,
) {
  try {
    const skip = page * limit;

    const logs = await AdminLog.find({ targetId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AdminLog.countDocuments({ targetId });
    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      pages: totalPages,
    };
  } catch (err) {
    logger.error("Lỗi khi lấy admin logs cho target pagination:", err);
    return { logs: [], total: 0, page: 0, pages: 0 };
  }
}
