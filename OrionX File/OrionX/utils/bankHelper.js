import { User } from '../database/models.js';

// ==================== BANK CONFIGURATION ====================
export const BANK_CONFIG = {
    TRANSACTION_FEE: 0.02, // 2% fee
    INTEREST_CYCLE: 24 * 60 * 60 * 1000, // 24 hours
};

// ==================== TIER SYSTEM ====================
export const BANK_TIERS = {
    1: { capacity: 1000000, cost: 0, interest: 0.010 },      // 1M, 1.0%
    2: { capacity: 2500000, cost: 500000, interest: 0.011 }, // 2.5M, 1.1%
    3: { capacity: 5000000, cost: 1500000, interest: 0.012 }, // 5M, 1.2%
    4: { capacity: 10000000, cost: 3000000, interest: 0.013 }, // 10M, 1.3%
    5: { capacity: 25000000, cost: 5000000, interest: 0.014 }, // 25M, 1.4%
    6: { capacity: 50000000, cost: 15000000, interest: 0.015 }, // 50M, 1.5%
    7: { capacity: 100000000, cost: 30000000, interest: 0.016 }, // 100M, 1.6%
    8: { capacity: 250000000, cost: 60000000, interest: 0.017 }, // 250M, 1.7%
    9: { capacity: 500000000, cost: 150000000, interest: 0.018 }, // 500M, 1.8%
    10: { capacity: 1000000000, cost: 300000000, interest: 0.020 } // 1B, 2.0%
};

// ==================== HELPER FUNCTIONS ====================

export function getBankTierInfo(tier) {
    return BANK_TIERS[tier] || BANK_TIERS[1];
}

export function getNextTier(currentTier) {
    const nextTier = currentTier + 1;
    return BANK_TIERS[nextTier] ? { level: nextTier, ...BANK_TIERS[nextTier] } : null;
}

export function calculateTransactionFee(amount) {
    return Math.floor(amount * BANK_CONFIG.TRANSACTION_FEE);
}

/**
 * Check interest status without applying it
 */
export async function getInterestStatus(userId) {
    const user = await User.findOne({ userId });
    if (!user) return { canClaim: false, message: 'User not found' };

    if (!user.bank) {
        user.bank = { balance: 0, capacity: BANK_TIERS[1].capacity, tier: 1, lastInterest: new Date() };
        await user.save();
        return { canClaim: false, message: 'Bank initialized' };
    }

    const lastInterest = user.bank.lastInterest ? new Date(user.bank.lastInterest) : new Date(0);
    const now = new Date();
    const timeDiff = now - lastInterest;

    if (timeDiff < BANK_CONFIG.INTEREST_CYCLE) {
        return {
            canClaim: false,
            timeLeft: BANK_CONFIG.INTEREST_CYCLE - timeDiff,
            message: 'Interest not ready yet'
        };
    }

    const currentTier = BANK_TIERS[user.bank.tier] || BANK_TIERS[1];
    const interestRate = currentTier.interest;
    const balance = user.bank.balance;

    if (balance <= 0) {
        return { canClaim: false, message: 'No balance' };
    }

    const interestEarned = Math.floor(balance * interestRate);

    return {
        canClaim: true,
        interestEarned: interestEarned,
        rate: interestRate
    };
}

/**
 * Claim interest manually
 */
export async function claimInterest(userId) {
    const status = await getInterestStatus(userId);
    if (!status.canClaim) return { success: false, ...status };

    const user = await User.findOne({ userId });

    // Add to CASH 
    user.money += status.interestEarned;
    user.bank.lastInterest = new Date();
    await user.save();

    return {
        success: true,
        interestEarned: status.interestEarned,
        newCash: user.money
    };
}
