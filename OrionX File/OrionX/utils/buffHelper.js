/**
 * Get active multiplier for a specific buff type
 * @param {Object} user User document
 * @param {string} type 'globalMultiplier' or 'dailyMultiplier'
 * @returns {number} The multiplier value (default 1)
 */
export function getActiveMultiplier(user, type) {
    if (!user.buffs || !user.buffs[type]) return 1;

    const buff = user.buffs[type];
    if (buff.expireAt && new Date() < new Date(buff.expireAt)) {
        return buff.value || 1;
    }

    return 1;
}

/**
 * Calculate final reward amount based on active buffs
 * @param {Object} user User document
 * @param {number} baseAmount The original reward amount
 * @param {string} category 'work', 'daily', 'game'
 * @returns {Object} { total: number, multipliers: Array }
 */
export function calculateReward(user, baseAmount, category) {
    let totalMultiplier = 1;
    const activeMultipliers = [];

    // Global multiplier applies to non-gambling activities
    const globalMult = getActiveMultiplier(user, 'globalMultiplier');
    if (globalMult > 1 && category !== 'gambling') {
        totalMultiplier *= globalMult;
        activeMultipliers.push({ name: 'Global Multiplier', value: globalMult });
    }

    // Category specific multipliers
    if (category === 'daily') {
        const dailyMult = getActiveMultiplier(user, 'dailyMultiplier');
        if (dailyMult > 1) {
            totalMultiplier *= dailyMult;
            activeMultipliers.push({ name: 'Daily X2', value: dailyMult });
        }
    }

    return {
        total: Math.floor(baseAmount * totalMultiplier),
        multipliers: activeMultipliers,
        bonus: Math.floor(baseAmount * totalMultiplier) - baseAmount
    };
}
