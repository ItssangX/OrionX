import { User } from '../database/models.js';
import { getResetTimes } from './resetHelper.js';
import logger from './logger.js';

// ==========================================
// QUEST DEFINITIONS
// ==========================================
const DAILY_QUESTS = [
    { id: 'send_messages', name: '💬 Nhắn tin', target: 10, reward: 1500, description: 'Gửi 10 tin nhắn' },
    { id: 'use_commands', name: '⌨️ Dùng lệnh', target: 10, reward: 1500, description: 'Sử dụng 10 lệnh' },
    { id: 'work_times', name: '💼 Làm việc', target: 5, reward: 3000, description: 'Làm work 5 lần' },
    { id: 'battle_wins', name: '⚔️ Thắng battle', target: 3, reward: 5000, description: 'Thắng 3 trận battle' },
    { id: 'hunt_pets', name: '🎯 Săn pet', target: 3, reward: 2000, description: 'Hunt 3 lần' },
    { id: 'daily_claim', name: '🎁 Nhận daily', target: 1, reward: 1000, description: 'Nhận daily reward' },
    { id: 'coinflip_play', name: '<a:coinflip:1456570452519686272> Chơi coinflip', target: 3, reward: 1500, description: 'Chơi coinflip 3 lần' },
    { id: 'give_money', name: '💸 Tặng tiền', target: 1, reward: 1000, description: 'Tặng tiền cho người khác' }
];

// ==========================================
// KIỂM TRA VÀ RESET QUESTS
// ==========================================
export function shouldResetQuests(user, now = new Date()) {
    if (!user.quests?.lastReset) return true;
    const { lastReset } = getResetTimes(now);
    return new Date(user.quests.lastReset) < lastReset;
}

// ==========================================
// KHỞI TẠO DAILY QUESTS
// ==========================================
export async function initDailyQuests(userId) {
    // Atomic check and reset
    const { lastReset } = getResetTimes(new Date());

    // Create new tasks array
    const newTasks = DAILY_QUESTS.map(quest => ({
        id: quest.id,
        name: quest.name,
        target: quest.target,
        progress: 0,
        reward: quest.reward,
        completed: false
    }));

    // Use updateOne to avoid parallel save issues
    await User.updateOne(
        { userId },
        {
            $set: {
                quests: {
                    lastReset: lastReset,
                    tasks: newTasks
                }
            }
        }
    );

    return newTasks;
}

// ==========================================
// CẬP NHẬT TIẾN ĐỘ QUEST
// ==========================================
export async function updateQuestProgress(userId, questId, amount = 1) {
    try {
        // 1. Check if reset needed
        let user = await User.findOne({ userId }).select('quests').lean();
        if (!user) return null;

        if (shouldResetQuests(user)) {
            await initDailyQuests(userId);
            user = await User.findOne({ userId }).select('quests').lean();
            if (!user) return null;
        }

        // 2. Finding task index
        const questIndex = user.quests?.tasks?.findIndex(t => t.id === questId);
        if (questIndex === -1) return null;

        const task = user.quests.tasks[questIndex];
        if (task.completed) return null;

        // 3. Atomic update (inc progress)
        const updatedUser = await User.findOneAndUpdate(
            {
                userId,
                [`quests.tasks.${questIndex}.id`]: questId,
                [`quests.tasks.${questIndex}.completed`]: false
            },
            {
                $inc: { [`quests.tasks.${questIndex}.progress`]: amount }
            },
            { returnDocument: 'after', select: 'quests' }
        );

        if (!updatedUser) return null;

        const updatedTask = updatedUser.quests.tasks[questIndex];

        // 4. Mark completed if target reached
        if (updatedTask.progress >= updatedTask.target && !updatedTask.completed) {
            await User.updateOne(
                { userId, [`quests.tasks.${questIndex}.id`]: questId },
                { $set: { [`quests.tasks.${questIndex}.completed`]: true } }
            );
            updatedTask.completed = true;
        }

        return updatedTask;

    } catch (error) {
        // Reduced retry logic for simplicity and reliability
        logger.error(`[QUEST] Error updating progress:`, error);
        return null;
    }
}

// ==========================================
// NHẬN THƯỞNG QUEST
// ==========================================
export async function claimQuestRewards(userId) {
    try {
        const user = await User.findOne({ userId }).select('quests money').lean();
        if (!user) return { success: false, message: 'Không tìm thấy user' };

        // Check reset
        if (shouldResetQuests(user)) {
            await initDailyQuests(userId);
            return { success: false, message: 'Quest đã được reset. Hãy hoàn thành nhiệm vụ mới!' };
        }

        // Find tasks ready to claim (completed and progress != -1)
        const claimableTasks = user.quests?.tasks?.filter(t => t.completed && t.progress !== -1) || [];

        if (claimableTasks.length === 0) {
            return { success: false, message: 'Không có nhiệm vụ nào để nhận thưởng!' };
        }

        let totalReward = 0;
        const claimedTaskNames = [];
        const updateTasks = {};

        // Prepare the update object and calculate reward
        user.quests.tasks.forEach((task, index) => {
            if (task.completed && task.progress !== -1) {
                totalReward += task.reward;
                claimedTaskNames.push(task.name);
                updateTasks[`quests.tasks.${index}.progress`] = -1;
            }
        });

        // Use findOneAndUpdate to apply rewards atomically and avoid parallel save errors
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            {
                $inc: { money: totalReward },
                $set: updateTasks
            },
            { returnDocument: 'after', select: 'money' }
        );

        if (!updatedUser) return { success: false, message: 'Có lỗi xảy ra khi nhận thưởng!' };

        return {
            success: true,
            totalReward,
            claimedTasks: claimedTaskNames,
            newBalance: updatedUser.money
        };

    } catch (error) {
        logger.error(`[QUEST] Error claiming rewards:`, error);
        return { success: false, message: 'Có lỗi xảy ra!' };
    }
}

// ==========================================
// LẤY THÔNG TIN QUESTS
// ==========================================
export async function getQuestStatus(userId) {
    try {
        const user = await User.findOne({ userId }).select('quests').lean();
        if (!user) return null;

        if (shouldResetQuests(user)) {
            await initDailyQuests(userId);
            const updatedUser = await User.findOne({ userId }).select('quests').lean();
            return updatedUser.quests;
        }

        return user.quests;

    } catch (error) {
        logger.error(`[QUEST] Error getting status:`, error);
        return null;
    }
}

export { DAILY_QUESTS };
