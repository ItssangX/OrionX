import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";
import { createCanvas, hasCanvas } from "../../utils/canvasHelper.js";
import { reply, getUser } from "../../utils/commandHelper.js";

const activeGames = new Map();

const DIFFICULTY_LEVELS = {
  1: { name: "🟢 Dễ", rows: 5, cols: 5, mines: 3, label: "Người mới" },
  2: { name: "🟡 Trung Bình", rows: 7, cols: 7, mines: 10, label: "Thử thách" },
  3: { name: "🟠 Khó", rows: 9, cols: 9, mines: 20, label: "Chuyên nghiệp" },
  4: { name: "🔴 Cực Khó", rows: 10, cols: 10, mines: 30, label: "Điên rồ" },
};

const EMOJI_NUMBERS = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];

export default {
  name: "minesweeper",
  aliases: ["mines", "domin", "timmin", "boom", "ms"],

  async execute(message, args) {
    try {
      const player = getUser(message);

      if (activeGames.has(player.id)) {
        return reply(
          message,
          "> <:warning:1455096625373380691> **Bạn đang có một game đang chơi!**\n> Hoàn thành game hiện tại trước khi bắt đầu game mới.",
        );
      }

      await showDifficultySelection(message, player);
    } catch (error) {
      console.error("Error in minesweeper command:", error);
      reply(
        message,
        "> <a:no:1455096623804715080> Có lỗi xảy ra khi tạo game!",
      );
    }
  },
};

async function showDifficultySelection(message, player) {
  const menuContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 💣 CHỌN CẤP ĐỘ"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🟢 **Dễ:** 5×5 - 3 quả mìn\n` +
        `🟡 **Trung Bình:** 7×7 - 10 quả mìn\n` +
        `🟠 **Khó:** 9×9 - 20 quả mìn\n` +
        `🔴 **Cực Khó:** 10×10 - 30 quả mìn`,
      ),
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("difficulty_1")
        .setLabel("🟢 Dễ")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("difficulty_2")
        .setLabel("🟡 Trung Bình")
        .setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("difficulty_3")
        .setLabel("🟠 Khó")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("difficulty_4")
        .setLabel("🔴 Cực Khó")
        .setStyle(ButtonStyle.Danger),
    ),
  ];

  rows.forEach((row) => menuContainer.addActionRowComponents(row));
  const difficultyMessage = await reply(message, {
    components: [menuContainer],
    flags: MessageFlags.IsComponentsV2,
  });
  const collector = difficultyMessage.createMessageComponentCollector({
    time: 30000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== player.id) {
      return interaction.reply({
        content:
          "> <:warning:1455096625373380691> Chỉ người tạo game mới có thể chọn!",
        ephemeral: true,
      });
    }
    const difficulty = parseInt(interaction.customId.split("_")[1]);
    collector.stop("selected");
    await startGame(message, player, difficulty, interaction);
  });

  collector.on("end", (collected, reason) => {
    if (reason !== "selected") {
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:clock:1446769163669602335> **Hết thời gian chọn!**",
        ),
      );
      difficultyMessage.edit({
        components: [timeoutContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  });
}

async function startGame(message, player, difficulty, interaction) {
  const config = DIFFICULTY_LEVELS[difficulty];

  // Khởi tạo bàn cờ
  const board = Array(config.rows)
    .fill(null)
    .map(() =>
      Array(config.cols)
        .fill(null)
        .map(() => ({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        })),
    );

  // Đặt mìn ngẫu nhiên
  let minesPlaced = 0;
  while (minesPlaced < config.mines) {
    const row = Math.floor(Math.random() * config.rows);
    const col = Math.floor(Math.random() * config.cols);
    if (!board[row][col].isMine) {
      board[row][col].isMine = true;
      minesPlaced++;
    }
  }

  // Tính số mìn xung quanh
  for (let i = 0; i < config.rows; i++) {
    for (let j = 0; j < config.cols; j++) {
      if (!board[i][j].isMine) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (
              ni >= 0 &&
              ni < config.rows &&
              nj >= 0 &&
              nj < config.cols &&
              board[ni][nj].isMine
            ) {
              count++;
            }
          }
        }
        board[i][j].adjacentMines = count;
      }
    }
  }

  const gameState = {
    board: board,
    player: player,
    difficulty: difficulty,
    rows: config.rows,
    cols: config.cols,
    totalMines: config.mines,
    flaggedCount: 0,
    revealedCount: 0,
    gameOver: false,
    won: false,
    startTime: Date.now(),
    moveCount: 0,
  };

  const { attachment, container: gameContainer } =
    await createGameBoard(gameState);
  const components = createButtons(gameState);
  components.forEach((row) => gameContainer.addActionRowComponents(row));

  const options = {
    components: [gameContainer],
    flags: MessageFlags.IsComponentsV2,
  };
  if (attachment) options.files = [attachment];

  const gameMessage = await interaction.update(options);

  activeGames.set(player.id, {
    ...gameState,
    messageId: gameMessage.id,
    channelId: message.channel.id,
  });

  const collector = gameMessage.createMessageComponentCollector({
    time: 600000,
  });

  collector.on("collect", async (buttonInteraction) => {
    try {
      const game = activeGames.get(player.id);
      if (!game || game.gameOver) {
        return buttonInteraction.reply({
          content: "> <:warning:1455096625373380691> Game đã kết thúc!",
          ephemeral: true,
        });
      }
      if (buttonInteraction.user.id !== player.id) {
        return buttonInteraction.reply({
          content:
            "> <:warning:1455096625373380691> Đây không phải game của bạn!",
          ephemeral: true,
        });
      }

      const [action, position] = buttonInteraction.customId.split("_");

      // Validate position
      if (!position || isNaN(parseInt(position))) {
        return buttonInteraction.reply({
          content:
            "> <:warning:1455096625373380691> Dữ liệu button không hợp lệ!",
          ephemeral: true,
        });
      }

      const pos = parseInt(position);
      const row = Math.floor(pos / game.cols);
      const col = pos % game.cols;

      if (action === "flag") {
        // Đặt/bỏ cờ
        if (game.board[row][col].isRevealed) {
          return buttonInteraction.reply({
            content:
              "> <:warning:1455096625373380691> Không thể cắm cờ ô đã mở!",
            ephemeral: true,
          });
        }

        game.board[row][col].isFlagged = !game.board[row][col].isFlagged;
        game.flaggedCount += game.board[row][col].isFlagged ? 1 : -1;
      } else if (action === "cell") {
        // Mở ô
        if (game.board[row][col].isFlagged) {
          return buttonInteraction.reply({
            content: "> <:warning:1455096625373380691> Bỏ cờ trước khi mở ô!",
            ephemeral: true,
          });
        }
        if (game.board[row][col].isRevealed) {
          return buttonInteraction.reply({
            content: "> <:warning:1455096625373380691> Ô này đã được mở!",
            ephemeral: true,
          });
        }

        game.moveCount++;

        // Nếu đạp mìn
        if (game.board[row][col].isMine) {
          game.gameOver = true;
          game.won = false;
          revealAllMines(game);

          const { attachment, container: loseContainer } =
            await createGameBoard(game);
          await buttonInteraction.update({
            components: [loseContainer],
            files: attachment ? [attachment] : [],
            flags: MessageFlags.IsComponentsV2,
          });
          activeGames.delete(player.id);
          collector.stop();
          return;
        }

        // Mở ô và các ô xung quanh nếu là ô trống
        revealCell(game, row, col);

        // Kiểm tra thắng
        const totalSafeCells = game.rows * game.cols - game.totalMines;
        if (game.revealedCount === totalSafeCells) {
          game.gameOver = true;
          game.won = true;
          revealAllMines(game);

          const { attachment, container: winContainer } =
            await createGameBoard(game);
          await buttonInteraction.update({
            components: [winContainer],
            files: attachment ? [attachment] : [],
            flags: MessageFlags.IsComponentsV2,
          });
          activeGames.delete(player.id);
          collector.stop();
          return;
        }
      }

      // Cập nhật bàn cờ
      const { attachment, container: updatedContainer } =
        await createGameBoard(game);
      const buttons = createButtons(game);
      buttons.forEach((row) => updatedContainer.addActionRowComponents(row));

      const options = {
        components: [updatedContainer],
        flags: MessageFlags.IsComponentsV2,
      };
      if (attachment) options.files = [attachment];

      await buttonInteraction.update(options);
    } catch (error) {
      console.error("Error handling button:", error);
    }
  });

  collector.on("end", () => {
    const game = activeGames.get(player.id);
    if (game && !game.gameOver) {
      activeGames.delete(player.id);
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:clock:1446769163669602335> **Hết thời gian chơi!**",
        ),
      );
      gameMessage.edit({
        components: [timeoutContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  });
}

function revealCell(game, row, col) {
  if (row < 0 || row >= game.rows || col < 0 || col >= game.cols) return;
  if (game.board[row][col].isRevealed || game.board[row][col].isFlagged) return;

  game.board[row][col].isRevealed = true;
  game.revealedCount++;

  // Nếu ô trống (0 mìn xung quanh), tự động mở các ô kế cận
  if (game.board[row][col].adjacentMines === 0) {
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (di !== 0 || dj !== 0) {
          revealCell(game, row + di, col + dj);
        }
      }
    }
  }
}

function revealAllMines(game) {
  for (let i = 0; i < game.rows; i++) {
    for (let j = 0; j < game.cols; j++) {
      if (game.board[i][j].isMine) {
        game.board[i][j].isRevealed = true;
      }
    }
  }
}

function createButtons(gameState) {
  const rows = [];
  const maxCellsPerRow = 5;

  // Nút cắm cờ
  const flagRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("flag_mode")
      .setLabel(`🚩 Cờ: ${gameState.flaggedCount}/${gameState.totalMines}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(gameState.gameOver),
  );
  rows.push(flagRow);

  // Các ô trên bàn cờ (giới hạn hiển thị nếu quá lớn)
  const displayRows = Math.min(gameState.rows, 4);
  const displayCols = Math.min(gameState.cols, 5);

  for (let i = 0; i < displayRows; i++) {
    let row = new ActionRowBuilder();
    for (let j = 0; j < displayCols; j++) {
      const position = i * gameState.cols + j;
      const cell = gameState.board[i][j];

      let label = "⬜";
      let style = ButtonStyle.Secondary;
      let disabled = gameState.gameOver;

      if (cell.isFlagged) {
        label = "🚩";
        style = ButtonStyle.Primary;
      } else if (cell.isRevealed) {
        disabled = true;
        if (cell.isMine) {
          label = "💣";
          style = ButtonStyle.Danger;
        } else if (cell.adjacentMines === 0) {
          label = "⬛";
          style = ButtonStyle.Success;
        } else {
          label = cell.adjacentMines.toString();
          style = ButtonStyle.Success;
        }
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`cell_${position}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled),
      );
    }
    rows.push(row);
  }

  // Nút cắm cờ cho từng ô (riêng biệt)
  for (let i = 0; i < displayRows; i++) {
    let row = new ActionRowBuilder();
    for (let j = 0; j < displayCols; j++) {
      const position = i * gameState.cols + j;
      const cell = gameState.board[i][j];

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`flag_${position}`)
          .setLabel("🚩")
          .setStyle(
            cell.isFlagged ? ButtonStyle.Primary : ButtonStyle.Secondary,
          )
          .setDisabled(cell.isRevealed || gameState.gameOver),
      );
    }
    if (rows.length < 5) rows.push(row);
  }

  return rows.slice(0, 5); // Discord giới hạn 5 rows
}

async function createGameBoard(gameState) {
  let attachment = null;
  const config = DIFFICULTY_LEVELS[gameState.difficulty];

  if (hasCanvas()) {
    const cellSize = 60;
    const padding = 80;
    const canvasWidth = gameState.cols * cellSize + padding * 2;
    const canvasHeight = gameState.rows * cellSize + padding * 2 + 100;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.5, "#1e293b");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Header
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💣 MINESWEEPER", canvasWidth / 2, 50);

    // Stats
    ctx.font = "20px Arial";
    ctx.fillStyle = "#94a3b8";
    const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    ctx.fillText(
      `⏱️ ${timeElapsed}s | 🚩 ${gameState.flaggedCount}/${gameState.totalMines} | 📊 ${gameState.moveCount} nước`,
      canvasWidth / 2,
      80,
    );

    // Board background
    const boardX = padding;
    const boardY = padding + 60;
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fillRect(
      boardX,
      boardY,
      gameState.cols * cellSize,
      gameState.rows * cellSize,
    );

    // Grid lines
    ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gameState.rows; i++) {
      ctx.beginPath();
      ctx.moveTo(boardX, boardY + i * cellSize);
      ctx.lineTo(boardX + gameState.cols * cellSize, boardY + i * cellSize);
      ctx.stroke();
    }
    for (let i = 0; i <= gameState.cols; i++) {
      ctx.beginPath();
      ctx.moveTo(boardX + i * cellSize, boardY);
      ctx.lineTo(boardX + i * cellSize, boardY + gameState.rows * cellSize);
      ctx.stroke();
    }

    // Draw cells
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < gameState.rows; i++) {
      for (let j = 0; j < gameState.cols; j++) {
        const cell = gameState.board[i][j];
        const x = boardX + j * cellSize;
        const y = boardY + i * cellSize;
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;

        if (cell.isFlagged) {
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          ctx.fillStyle = "#ffffff";
          ctx.fillText("🚩", centerX, centerY);
        } else if (cell.isRevealed) {
          if (cell.isMine) {
            ctx.fillStyle = gameState.won ? "#22c55e" : "#ef4444";
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            ctx.fillStyle = "#ffffff";
            ctx.fillText("💣", centerX, centerY);
          } else {
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            if (cell.adjacentMines > 0) {
              const colors = [
                "",
                "#3b82f6",
                "#22c55e",
                "#ef4444",
                "#8b5cf6",
                "#f59e0b",
                "#ec4899",
                "#14b8a6",
                "#6366f1",
              ];
              ctx.fillStyle = colors[cell.adjacentMines] || "#ffffff";
              ctx.fillText(cell.adjacentMines.toString(), centerX, centerY);
            }
          }
        } else {
          ctx.fillStyle = "#475569";
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
      }
    }

    // Border
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      boardX,
      boardY,
      gameState.cols * cellSize,
      gameState.rows * cellSize,
    );

    attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "minesweeper-board.png",
    });
  }

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 💣 MINESWEEPER - ${config.label}`),
  );

  if (gameState.gameOver) {
    const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        gameState.won
          ? `### 🎉 CHIẾN THẮNG!\n> ⏱️ Thời gian: **${timeElapsed}s**\n> 📊 Số nước: **${gameState.moveCount}**`
          : `### 💥 ĐÃ ĐẠP MÌN!\n> 💀 Game Over!\n> 📊 Số nước: **${gameState.moveCount}**`,
      ),
    );
  } else {
    const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const remaining =
      gameState.rows * gameState.cols -
      gameState.totalMines -
      gameState.revealedCount;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> ⏱️ Thời gian: **${timeElapsed}s**\n` +
        `> 🚩 Cờ: **${gameState.flaggedCount}/${gameState.totalMines}**\n` +
        `> 📊 Nước đi: **${gameState.moveCount}**\n` +
        `> ⬜ Còn lại: **${remaining} ô**`,
      ),
    );
  }

  return { attachment, container };
}
