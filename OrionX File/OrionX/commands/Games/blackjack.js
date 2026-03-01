import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { User } from '../../database/models.js';
import { calculateReward } from '../../utils/buffHelper.js';
import { reply, getUser, getUserId, getOption, createOwnerCollector } from '../../utils/commandHelper.js';

// Card values
const CARD_VALUES = {
    'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10
};

const CARD_EMOJIS = {
    'spades': '♠️', 'hearts': '♥️', 'diamonds': '♦️', 'clubs': '♣️'
};

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Active games
const activeGames = new Map();

export default {
    name: 'blackjack',
    aliases: ['bj', 'xidach', '21'],

    async execute(message, args) {
        try {
            const userId = getUserId(message);

            // Kiểm tra game đang chơi
            if (activeGames.has(userId)) {
                return reply(message, '> <a:no:1455096623804715080> Bạn đang có game **Blackjack** đang chơi!');
            }

            const betAmountInput = getOption(message, 'money', 'string') || args[0]?.toLowerCase();
            if (!betAmountInput) {
                const helpContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🃏 BLACKJACK'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**Cú pháp:** \`Xbj <tiền>\`\n` +
                        `**Ví dụ:** \`Xbj 1000\`, \`Xbj all\`, \`Xbj half\`\n` +
                        `**Giới hạn:** 100 - 250,000 <:Xcoin:1433810075927183441>\n` +
                        `**Blackjack trả:** 3:2 | **Double:** x2 cược`
                    ));
                return reply(message, { components: [helpContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Tìm user data
            let userData = await User.findOne({ userId });
            if (!userData) {
                const user = getUser(message);
                userData = await User.create({ userId, username: user.username, money: 0 });
            }

            // Parse số tiền
            let betAmount;
            const input = betAmountInput;

            if (input === 'all') {
                betAmount = Math.min(userData.money, 250000);
            } else if (input === 'half') {
                betAmount = Math.floor(userData.money / 2);
            } else {
                betAmount = parseInt(args[0]);
            }

            // Validate
            if (isNaN(betAmount) || betAmount <= 0) {
                return reply(message, '> <a:no:1455096623804715080> Số tiền phải là **số dương**!');
            }
            if (betAmount < 100) {
                return reply(message, '> <a:no:1455096623804715080> Cược tối thiểu: `100` <:Xcoin:1433810075927183441>');
            }
            if (betAmount > 250000) {
                return reply(message, '> <a:no:1455096623804715080> Cược tối đa: `250,000` <:Xcoin:1433810075927183441>');
            }
            if (userData.money < betAmount) {
                return reply(message, `> <a:no:1455096623804715080> Không đủ tiền! Số dư: \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>`);
            }

            // Tạo deck và bắt đầu game
            const deck = createDeck();
            const playerHand = [drawCard(deck), drawCard(deck)];
            const dealerHand = [drawCard(deck), drawCard(deck)];

            const gameState = {
                deck,
                playerHand,
                dealerHand,
                betAmount,
                doubled: false,
                userId
            };

            activeGames.set(userId, gameState);

            // Kiểm tra Blackjack tự nhiên
            const playerValue = calculateHand(playerHand);
            const dealerValue = calculateHand(dealerHand);

            if (playerValue === 21) {
                // Player Blackjack!
                activeGames.delete(userId);
                const baseWinAmount = Math.floor(betAmount * 1.5); // 3:2
                // Áp dụng buff nếu có
                const { total } = calculateReward(userData, baseWinAmount, 'gambling');
                userData.money += total;
                await userData.save();

                return reply(message, {
                    components: [createGameContainer(gameState, 'blackjack', total, userData.money)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Show game và buttons
            const container = createGameContainer(gameState, 'playing', 0, userData.money);
            const row = createButtons(gameState, userData.money);

            const gameMsg = await reply(message, { components: [container, row], flags: MessageFlags.IsComponentsV2 });

            // Collector
            const collector = createOwnerCollector(gameMsg, userId, {
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                const game = activeGames.get(userId);
                if (!game) {
                    await interaction.update({ components: [] });
                    return;
                }

                const action = interaction.customId;

                if (action === 'bj_hit') {
                    // Hit - rút thêm bài
                    game.playerHand.push(drawCard(game.deck));
                    const value = calculateHand(game.playerHand);

                    if (value > 21) {
                        // Bust!
                        activeGames.delete(userId);
                        userData.money -= game.betAmount;
                        await userData.save();

                        await interaction.update({
                            components: [createGameContainer(game, 'bust', -game.betAmount, userData.money)],
                            flags: MessageFlags.IsComponentsV2
                        });
                        collector.stop();
                    } else if (value === 21) {
                        // Auto stand at 21
                        await dealerPlay(interaction, game, userData, collector);
                    } else {
                        await interaction.update({
                            components: [createGameContainer(game, 'playing', 0, userData.money), createButtons(game, userData.money)],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }

                } else if (action === 'bj_stand') {
                    // Stand - dealer chơi
                    await dealerPlay(interaction, game, userData, collector);

                } else if (action === 'bj_double') {
                    // Double Down
                    if (userData.money < game.betAmount * 2) {
                        return interaction.reply({ content: '> <a:no:1455096623804715080> Không đủ tiền để Double!', flags: [MessageFlags.Ephemeral] });
                    }

                    game.betAmount *= 2;
                    game.doubled = true;
                    game.playerHand.push(drawCard(game.deck));

                    const value = calculateHand(game.playerHand);
                    if (value > 21) {
                        activeGames.delete(userId);
                        userData.money -= game.betAmount;
                        await userData.save();

                        await interaction.update({
                            components: [createGameContainer(game, 'bust', -game.betAmount, userData.money)],
                            flags: MessageFlags.IsComponentsV2
                        });
                        collector.stop();
                    } else {
                        await dealerPlay(interaction, game, userData, collector);
                    }
                }
            });

            collector.on('end', () => {
                activeGames.delete(userId);
            });

        } catch (error) {
            console.error('<a:no:1455096623804715080> Lỗi blackjack:', error);
            activeGames.delete(getUserId(message));
            reply(message, '> <a:no:1455096623804715080> **Lỗi!** Không thể chơi Blackjack.');
        }
    }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, value: CARD_VALUES[rank] });
        }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function drawCard(deck) {
    return deck.pop();
}

function calculateHand(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.rank === 'A') {
            aces++;
            value += 11;
        } else {
            value += card.value;
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

function formatHand(hand, hideSecond = false) {
    return hand.map((card, i) => {
        if (hideSecond && i === 1) return '🂠';
        const suitEmoji = CARD_EMOJIS[card.suit];
        return `\`${card.rank}${suitEmoji}\``;
    }).join(' ');
}

function createGameContainer(game, status, amount, balance) {
    const playerValue = calculateHand(game.playerHand);
    const dealerValue = calculateHand(game.dealerHand);
    const showDealer = status !== 'playing';

    let title, description;

    switch (status) {
        case 'playing':
            title = '## 🃏 BLACKJACK';
            description = `**Cược:** \`${game.betAmount.toLocaleString()}\` <:Xcoin:1433810075927183441>`;
            break;
        case 'blackjack':
            title = '## 🃏 BLACKJACK! 🎉';
            description = `> **Thắng:** +\`${amount.toLocaleString()}\` <:Xcoin:1433810075927183441> (3:2)`;
            break;
        case 'win':
            title = '## 🃏 BẠN THẮNG! 🎉';
            description = `> **Thắng:** +\`${amount.toLocaleString()}\` <:Xcoin:1433810075927183441>`;
            break;
        case 'lose':
        case 'bust':
            title = status === 'bust' ? '## 🃏 BUST! 💥' : '## 🃏 BẠN THUA! 😢';
            description = `> **Thua:** -\`${Math.abs(amount).toLocaleString()}\` <:Xcoin:1433810075927183441>`;
            break;
        case 'push':
            title = '## 🃏 HÒA! 🤝';
            description = '> Tiền cược được hoàn lại';
            break;
        default:
            title = '## 🃏 BLACKJACK';
            description = '';
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 👤 Bạn (${playerValue})\n${formatHand(game.playerHand)}\n\n` +
            `### 🎰 Dealer (${showDealer ? dealerValue : '?'})\n${formatHand(game.dealerHand, !showDealer)}`
        ));

    if (status !== 'playing') {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `💰 **Số dư:** \`${balance.toLocaleString()}\` <:Xcoin:1433810075927183441>`
        ));
    }

    return container;
}

function createButtons(game, userMoney) {
    const canDouble = game.playerHand.length === 2 && userMoney >= game.betAmount * 2 && !game.doubled;

    const hitBtn = new ButtonBuilder()
        .setCustomId('bj_hit')
        .setLabel('🎴 Hit')
        .setStyle(ButtonStyle.Primary);

    const standBtn = new ButtonBuilder()
        .setCustomId('bj_stand')
        .setLabel('✋ Stand')
        .setStyle(ButtonStyle.Success);

    const doubleBtn = new ButtonBuilder()
        .setCustomId('bj_double')
        .setLabel('💎 Double')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!canDouble);

    return new ActionRowBuilder().addComponents(hitBtn, standBtn, doubleBtn);
}

async function dealerPlay(interaction, game, userData, collector) {
    activeGames.delete(game.userId);

    // Dealer rút bài đến khi >= 17
    while (calculateHand(game.dealerHand) < 17) {
        game.dealerHand.push(drawCard(game.deck));
    }

    const playerValue = calculateHand(game.playerHand);
    const dealerValue = calculateHand(game.dealerHand);

    let status, amount;

    if (dealerValue > 21) {
        // Dealer bust
        status = 'win';
        const baseAmount = game.betAmount;
        const { total } = calculateReward(userData, baseAmount, 'gambling');
        amount = total;
        userData.money += amount;
    } else if (playerValue > dealerValue) {
        // Player wins
        status = 'win';
        const baseAmount = game.betAmount;
        const { total } = calculateReward(userData, baseAmount, 'gambling');
        amount = total;
        userData.money += amount;
    } else if (playerValue < dealerValue) {
        // Dealer wins
        status = 'lose';
        amount = -game.betAmount;
        userData.money -= game.betAmount;
    } else {
        // Push
        status = 'push';
        amount = 0;
    }

    await userData.save();

    await interaction.update({
        components: [createGameContainer(game, status, amount, userData.money)],
        flags: MessageFlags.IsComponentsV2
    });

    collector.stop();

    // Update quest
    const { updateQuestProgress } = await import('../../utils/questHelper.js');
    await updateQuestProgress(game.userId, 'use_commands', 1);
}
