import { User } from '../database/models.js';
import { getResetTimes } from './resetHelper.js';
import logger from './logger.js';

/**
 * Cập nhật tiến độ Checklist cho User
 * @param {String} userId Discord User ID
 * @param {String} taskType Loại task: 'daily' | 'quest' | 'hunt' | 'battle' | 'vote'
 */
export async function updateChecklist(userId, taskType) {
    try {
        const user = await User.findOne({ userId }).select('checklist');
        if (!user) return;

        const now = new Date();
        const { lastReset } = getResetTimes(now);
        const checklistReset = user.checklist?.lastReset ? new Date(user.checklist.lastReset) : null;

        if (!checklistReset || checklistReset < lastReset) {
            user.checklist = {
                lastReset: lastReset,
                isClaimed: false,
                tasks: {
                    daily: false,
                    quest: false,
                    hunt: false,
                    battle: false,
                    vote: false
                }
            };
        }

        // 2. Mark Task as Completed
        if (user.checklist && user.checklist.tasks && user.checklist.tasks[taskType] !== undefined) {
            // Logic riêng cho vote: Vote luôn tính là done kể cả chưa reset (vì vote theo site)
            // Nhưng ở đây ta cứ mark true. Logic check vote real-time có thể làm ở lệnh checklist
            if (!user.checklist.tasks[taskType]) {
                user.checklist.tasks[taskType] = true;
                user.markModified('checklist');
                await user.save();
                // Optional: Notify user? (Có thể spam nên thôi)
            }
        } else {
            // Init checklist if missing
            user.checklist = {
                lastReset: lastReset,
                isClaimed: false,
                tasks: {
                    daily: false,
                    quest: false,
                    hunt: false,
                    battle: false,
                    vote: false
                }
            };
            user.checklist.tasks[taskType] = true;
            user.markModified('checklist');
            await user.save();
        }

    } catch (error) {
        logger.error(`[Checklist] Error updating ${taskType} for ${userId}:`, error);
    }
}

/**
 * Lấy trạng thái Checklist (và reset nếu cần)
 */
export async function getChecklistStatus(userId) {
    let user = await User.findOne({ userId }).select('checklist');
    if (!user) return null;

    const now = new Date();
    const { lastReset } = getResetTimes(now);
    const checklistReset = user.checklist?.lastReset ? new Date(user.checklist.lastReset) : null;

    if (!user.checklist || !user.checklist.lastReset || !checklistReset || checklistReset < lastReset) {
        user.checklist = {
            lastReset: lastReset,
            isClaimed: false,
            tasks: {
                daily: false,
                quest: false,
                hunt: false,
                battle: false,
                vote: false
            }
        };

        user.markModified('checklist');
        await user.save();
    }

    return user.checklist;
}
