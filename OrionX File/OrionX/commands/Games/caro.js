import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} from 'discord.js';
import { createCanvas, hasCanvas } from '../../utils/canvasHelper.js';
import { reply, getUser } from '../../utils/commandHelper.js';

const activeGames = new Map();

const AI_DIFFICULTY = {
    1: { name: '⭐ Dễ', chance: 0.2, depth: 1, strategic: false },
    2: { name: '⭐⭐ Trung Bình', chance: 0.5, depth: 2, strategic: true },
    3: { name: '⭐⭐⭐ Khó', chance: 0.8, depth: 3, strategic: true },
    4: { name: '⭐⭐⭐⭐ Rất Khó', chance: 0.95, depth: 4, strategic: true },
    5: { name: '⭐⭐⭐⭐⭐ Bất Bại', chance: 1.0, depth: 5, strategic: true }
};

const BOARD_SIZES = {
    '3x3': { size: 3, winLength: 3, label: '3×3 (Cổ điển)' },
    '4x4': { size: 4, winLength: 3, label: '4×4 (Nhanh)' },
    '5x5': { size: 5, winLength: 4, label: '5×5 (Cân bằng)' },
};

export default {
    name: 'caro',
    aliases: ['xo', 'tictactoe', 'playxo', 'playcaro'],

    async execute(message, args) {
        try {
            const player1 = getUser(message);
            const player2 = message.mentions?.users.first();
            const isAI = !player2;

            if (activeGames.has(player1.id)) {
                return reply(message, '> <:warning:1455096625373380691> **Bạn đang có một game đang chơi!**\n> Hoàn thành game hiện tại trước khi bắt đầu game mới.');
            }

            if (isAI) {
                await showDifficultySelection(message, player1);
            } else {
                await showBoardSizeSelection(message, player1, player2, null);
            }

        } catch (error) {
            console.error('Error in xo command:', error);
            reply(message, '> <a:no:1455096623804715080> Có lỗi xảy ra khi tạo game!');
        }
    }
};

async function showDifficultySelection(message, player1) {
    const menuContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🎮 Level 🎮'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `⭐ **Dễ:** AI chơi ngẫu nhiên\n` +
            `⭐⭐ **Trung Bình:** AI có chiến thuật cơ bản\n` +
            `⭐⭐⭐ **Khó:** AI chơi thông minh\n` +
            `⭐⭐⭐⭐ **Rất Khó:** AI phân tích sâu\n` +
            `⭐⭐⭐⭐⭐ **Bất Bại:** AI sử dụng Minimax`
        ));

    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('difficulty_1').setLabel('⭐').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('difficulty_2').setLabel('⭐⭐').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('difficulty_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('difficulty_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Danger)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('difficulty_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Danger)
        )
    ];

    rows.forEach(row => menuContainer.addActionRowComponents(row));
    const difficultyMessage = await reply(message, { components: [menuContainer], flags: MessageFlags.IsComponentsV2 });
    const collector = difficultyMessage.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== player1.id) return interaction.reply({ content: '> <:warning:1455096625373380691> Chỉ người tạo game mới có thể chọn!', ephemeral: true });
        const difficulty = parseInt(interaction.customId.split('_')[1]);
        collector.stop('selected');
        await showBoardSizeSelection(message, player1, null, difficulty, interaction);
    });

    collector.on('end', (collected, reason) => {
        if (reason !== 'selected') {
            const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:clock:1446769163669602335> **Hết thời gian chọn!**'));
            difficultyMessage.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 });
        }
    });
}

async function showBoardSizeSelection(message, player1, player2, difficulty, prevInteraction) {
    const sizeContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 📏 KÍCH THƯỚC BÀN CỜ'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `- **3×3:** Cổ điển (3 ô liên tiếp để thắng)\n` +
            `- **4×4:** Nhanh gọn (3 ô liên tiếp)\n` +
            `- **5×5:** Cân bằng (4 ô liên tiếp)`
        ));

    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('size_3x3').setLabel('3×3 Cổ điển').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('size_4x4').setLabel('4×4 Nhanh').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('size_5x5').setLabel('5×5 Cân bằng').setStyle(ButtonStyle.Primary),
        ),
    ];

    rows.forEach(row => sizeContainer.addActionRowComponents(row));
    const options = { components: [sizeContainer], flags: MessageFlags.IsComponentsV2 };
    const sizeMessage = prevInteraction ? await prevInteraction.update(options) : await reply(message, options);
    const collector = sizeMessage.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== player1.id) return interaction.reply({ content: '> <:warning:1455096625373380691> Chỉ người tạo game mới có thể chọn!', ephemeral: true });
        const boardSize = interaction.customId.split('_')[1];
        collector.stop('selected');
        await startGame(message, player1, player2, difficulty, boardSize, interaction);
    });

    collector.on('end', (collected, reason) => {
        if (reason !== 'selected') {
            const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:clock:1446769163669602335> **Hết thời gian chọn!**'));
            sizeMessage.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 });
        }
    });
}

async function startGame(message, player1, player2, difficulty, boardSize, interaction) {
    const isAI = !player2;
    const config = BOARD_SIZES[boardSize];
    const size = config.size;

    const gameState = {
        board: Array(size).fill(null).map(() => Array(size).fill(null)),
        player1: player1,
        player2: player2,
        isAI: isAI,
        difficulty: difficulty,
        boardSize: boardSize,
        size: size,
        winLength: config.winLength,
        currentTurn: player1.id,
        gameOver: false,
        winner: null,
        moveCount: 0
    };

    const { attachment, container: gameContainer } = await createGameBoard(gameState);
    const components = createButtons(gameState);
    components.forEach(row => gameContainer.addActionRowComponents(row));

    const options = {
        components: [gameContainer],
        flags: MessageFlags.IsComponentsV2
    };
    if (attachment) options.files = [attachment];

    const gameMessage = await interaction.update(options);

    activeGames.set(player1.id, { ...gameState, messageId: gameMessage.id, channelId: message.channel.id });
    if (!isAI) activeGames.set(player2.id, { ...gameState, messageId: gameMessage.id, channelId: message.channel.id });

    const collector = gameMessage.createMessageComponentCollector({ time: 600000 });

    collector.on('collect', async (buttonInteraction) => {
        try {
            const game = activeGames.get(player1.id);
            if (!game || game.gameOver) return buttonInteraction.reply({ content: '> <:warning:1455096625373380691> Game đã kết thúc!', ephemeral: true });
            if (!isAI && buttonInteraction.user.id !== game.currentTurn) return buttonInteraction.reply({ content: '> <:warning:1455096625373380691> Chưa đến lượt của bạn!', ephemeral: true });
            if (isAI && buttonInteraction.user.id !== player1.id) return buttonInteraction.reply({ content: '> <:warning:1455096625373380691> Đây không phải game của bạn!', ephemeral: true });

            const position = parseInt(buttonInteraction.customId.split('_')[1]);
            const row = Math.floor(position / game.size);
            const col = position % game.size;

            if (game.board[row][col] !== null) return buttonInteraction.reply({ content: '> <:warning:1455096625373380691> Ô này đã được chọn!', ephemeral: true });

            game.board[row][col] = buttonInteraction.user.id === player1.id ? 'X' : 'O';
            game.moveCount++;

            const winner = checkWinner(game.board, game.winLength);
            if (winner) {
                game.gameOver = true;
                game.winner = winner;
                const { attachment, container: endContainer } = await createGameBoard(game);
                await buttonInteraction.update({ components: [endContainer], files: [attachment], flags: MessageFlags.IsComponentsV2 });
                activeGames.delete(player1.id);
                if (!isAI) activeGames.delete(player2.id);
                collector.stop();
                return;
            }

            if (isBoardFull(game.board)) {
                game.gameOver = true;
                const { attachment, container: drawContainer } = await createGameBoard(game);
                await buttonInteraction.update({ components: [drawContainer], files: [attachment], flags: MessageFlags.IsComponentsV2 });
                activeGames.delete(player1.id);
                if (!isAI) activeGames.delete(player2.id);
                collector.stop();
                return;
            }

            if (isAI) {
                const { attachment, container: nextContainer } = await createGameBoard(game);
                const buttons = createButtons(game);
                buttons.forEach(row => nextContainer.addActionRowComponents(row));
                await buttonInteraction.update({ components: [nextContainer], files: [attachment], flags: MessageFlags.IsComponentsV2 });

                setTimeout(async () => {
                    const aiMove = getAIMove(game.board, game.difficulty, game.winLength);
                    if (aiMove) {
                        game.board[aiMove.row][aiMove.col] = 'O';
                        game.moveCount++;
                        const aiWinner = checkWinner(game.board, game.winLength);
                        if (aiWinner) {
                            game.gameOver = true;
                            game.winner = aiWinner;
                            const { attachment, container: aiWinContainer } = await createGameBoard(game);
                            await gameMessage.edit({ components: [aiWinContainer], files: [attachment], flags: MessageFlags.IsComponentsV2 });
                            activeGames.delete(player1.id);
                            collector.stop();
                            return;
                        }
                        if (isBoardFull(game.board)) {
                            game.gameOver = true;
                            const { attachment, container: aiDrawContainer } = await createGameBoard(game);
                            await gameMessage.edit({ components: [aiDrawContainer], files: [attachment], flags: MessageFlags.IsComponentsV2 });
                            activeGames.delete(player1.id);
                            collector.stop();
                            return;
                        }
                        const { attachment, container: aiTurnContainer } = await createGameBoard(game);
                        const buttons = createButtons(game);
                        buttons.forEach(row => aiTurnContainer.addActionRowComponents(row));
                        await gameMessage.edit({ components: [aiTurnContainer], files: [attachment], flags: MessageFlags.IsComponentsV2 });
                    }
                }, 1000);
            } else {
                // PvP mode - Chuyển lượt cho người kia
                game.currentTurn = game.currentTurn === player1.id ? player2.id : player1.id;

                // Cập nhật game state cho cả 2 player
                activeGames.set(player1.id, game);
                activeGames.set(player2.id, game);

                const options = { components: [turnContainer], flags: MessageFlags.IsComponentsV2 };
                if (attachment) options.files = [attachment];
                await buttonInteraction.update(options);
            }

        } catch (error) {
            console.error('Error handling button:', error);
        }
    });

    collector.on('end', () => {
        const game = activeGames.get(player1.id);
        if (game && !game.gameOver) {
            activeGames.delete(player1.id);
            if (!isAI) activeGames.delete(player2.id);
            const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:clock:1446769163669602335> **Hết thời gian chờ nước đi!**'));
            gameMessage.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 });
        }
    });
}

function createButtons(gameState) {
    const size = gameState.size;
    const rows = [];
    const maxButtonsPerRow = 5;

    for (let i = 0; i < size; i++) {
        let row = new ActionRowBuilder();
        for (let j = 0; j < size; j++) {
            const position = i * size + j;
            const cell = gameState.board[i][j];
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`xo_${position}`)
                    .setLabel(cell || '·')
                    .setStyle(cell === 'X' ? ButtonStyle.Danger : (cell === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary))
                    .setDisabled(cell !== null || gameState.gameOver)
            );
            if (row.components.length === 5) {
                rows.push(row);
                row = new ActionRowBuilder();
            }
        }
        if (row.components.length > 0) rows.push(row);
    }
    return rows.slice(0, 5); // Discord 5 rows limit
}

async function createGameBoard(gameState) {
    const size = gameState.size;
    let attachment = null;

    if (hasCanvas()) {
        const cellSize = Math.min(100, Math.floor(600 / size));
        const canvasSize = cellSize * size + 100;
        const canvas = createCanvas(canvasSize, canvasSize);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
        gradient.addColorStop(0, '#1e1b4b'); gradient.addColorStop(0.5, '#312e81'); gradient.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvasSize, canvasSize);

        const offset = 50;
        ctx.fillStyle = 'rgba(30, 27, 75, 0.8)'; ctx.fillRect(offset, offset, cellSize * size, cellSize * size);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)'; ctx.lineWidth = 2;
        for (let i = 1; i < size; i++) {
            ctx.beginPath(); ctx.moveTo(offset + i * cellSize, offset); ctx.lineTo(offset + i * cellSize, offset + size * cellSize); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(offset, offset + i * cellSize); ctx.lineTo(offset + size * cellSize, offset + i * cellSize); ctx.stroke();
        }

        const markSize = cellSize * 0.3;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = offset + col * cellSize + cellSize / 2;
                const y = offset + row * cellSize + cellSize / 2;
                if (gameState.board[row][col] === 'X') {
                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.beginPath();
                    ctx.moveTo(x - markSize, y - markSize); ctx.lineTo(x + markSize, y + markSize); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x + markSize, y - markSize); ctx.lineTo(x - markSize, y + markSize); ctx.stroke();
                } else if (gameState.board[row][col] === 'O') {
                    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4; ctx.beginPath();
                    ctx.arc(x, y, markSize, 0, Math.PI * 2); ctx.stroke();
                }
            }
        }
        ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 4; ctx.strokeRect(offset, offset, cellSize * size, cellSize * size);

        attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'xo-board.png' });
    }
    const config = BOARD_SIZES[gameState.boardSize];

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ⭕ X-O GAME - ${config.label}`));

    if (gameState.gameOver) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            gameState.winner
                ? `### 🏆 ${gameState.winner === 'X' ? gameState.player1.username : (gameState.isAI ? 'AI' : gameState.player2.username)} THẮNG!`
                : `### 🤝 TRẬN HÒA!`
        ));
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `> 🎯 Lượt: **${gameState.currentTurn === gameState.player1.id ? gameState.player1.username : (gameState.isAI ? 'AI' : gameState.player2.username)}**\n` +
            `> 📊 Nước đi: **${gameState.moveCount}**`
        ));
    }

    return { attachment, container };
}

function checkWinner(board, winLength) {
    const size = board.length;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - winLength; j++) {
            const horizontal = board[i].slice(j, j + winLength);
            if (horizontal[0] && horizontal.every(cell => cell === horizontal[0])) return horizontal[0];
            const vertical = [];
            for (let k = 0; k < winLength; k++) vertical.push(board[j + k][i]);
            if (vertical[0] && vertical.every(cell => cell === vertical[0])) return vertical[0];
        }
    }
    for (let i = 0; i <= size - winLength; i++) {
        for (let j = 0; j <= size - winLength; j++) {
            const diag1 = [], diag2 = [];
            for (let k = 0; k < winLength; k++) {
                diag1.push(board[i + k][j + k]);
                diag2.push(board[i + k][j + winLength - 1 - k]);
            }
            if (diag1[0] && diag1.every(cell => cell === diag1[0])) return diag1[0];
            if (diag2[0] && diag2.every(cell => cell === diag2[0])) return diag2[0];
        }
    }
    return null;
}

function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== null));
}

function getAIMove(board, difficulty, winLength) {
    const emptyCells = [];
    const size = board.length;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) if (board[i][j] === null) emptyCells.push({ row: i, col: j });
    }
    if (emptyCells.length === 0) return null;
    const config = AI_DIFFICULTY[difficulty];
    if (Math.random() > config.chance) return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    for (const cell of emptyCells) {
        board[cell.row][cell.col] = 'O';
        if (checkWinner(board, winLength) === 'O') { board[cell.row][cell.col] = null; return cell; }
        board[cell.row][cell.col] = null;
    }
    for (const cell of emptyCells) {
        board[cell.row][cell.col] = 'X';
        if (checkWinner(board, winLength) === 'X') { board[cell.row][cell.col] = null; return cell; }
        board[cell.row][cell.col] = null;
    }
    const center = Math.floor(size / 2);
    if (board[center][center] === null) return { row: center, col: center };
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}