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

// Helper for async delays (replaces nested setTimeout)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const AI_DIFFICULTY = {
  1: {
    name: "🟢 Dễ",
    memoryChance: 0.3,
    perfectMemory: false,
    label: "Hay quên",
  },
  2: {
    name: "🟡 Trung Bình",
    memoryChance: 0.6,
    perfectMemory: false,
    label: "Nhớ được",
  },
  3: {
    name: "🟠 Khó",
    memoryChance: 0.85,
    perfectMemory: false,
    label: "Nhớ tốt",
  },
  4: {
    name: "🔴 Rất Khó",
    memoryChance: 0.95,
    perfectMemory: true,
    label: "Siêu nhớ",
  },
  5: {
    name: "🟣 Bất Bại",
    memoryChance: 1.0,
    perfectMemory: true,
    label: "Trí nhớ vô hạn",
  },
};

const BOARD_SIZES = {
  "4x4": { rows: 4, cols: 4, pairs: 8, label: "4×4 (8 cặp) - Nhanh" },
  "4x5": { rows: 4, cols: 5, pairs: 10, label: "4×5 (10 cặp) - Chuẩn" },
  "6x6": { rows: 6, cols: 6, pairs: 18, label: "6×6 (18 cặp) - Thử thách" },
};

const CARD_EMOJIS = [
  "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒",
  "🍑", "🥝", "🥑", "🍍", "🥭", "🍈", "🫐", "🍏",
  "🌟", "💎", "🎨", "🎭", "🎪", "🎸", "🎹", "🎺",
  "⚽", "🏀", "🎾", "⚾", "🏐", "🏈", "🎱", "🎳",
  "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑",
];

export default {
  name: "memorycard",
  aliases: ["memory", "flipcard", "latthe", "nhothe", "mc"],

  async execute(message, args) {
    try {
      const player = getUser(message);

      if (activeGames.has(player.id)) {
        return reply(
          message,
          "> <:warning:1455096625373380691> **Bạn đang có một game đang chơi!**\n> Hoàn thành game hiện tại trước khi bắt đầu game mới.",
        );
      }

      // Check for PvP: Xmemory @user
      const mentionedUser = message.mentions?.users?.first();
      if (mentionedUser) {
        if (mentionedUser.id === player.id) {
          return reply(
            message,
            "> <a:no:1455096623804715080> Không thể tự chơi với chính mình!",
          );
        }
        if (mentionedUser.bot) {
          return reply(
            message,
            "> <a:no:1455096623804715080> Không thể chơi với bot!",
          );
        }
        if (activeGames.has(mentionedUser.id)) {
          return reply(
            message,
            "> <:warning:1455096625373380691> Người chơi đó đang trong game khác!",
          );
        }
        await showPvPInvite(message, player, mentionedUser);
      } else {
        await showDifficultySelection(message, player);
      }
    } catch (error) {
      console.error("Error in memory command:", error);
      reply(
        message,
        "> <a:no:1455096623804715080> Có lỗi xảy ra khi tạo game!",
      );
    }
  },
};

// ==========================================
// PvP INVITE
// ==========================================
async function showPvPInvite(message, player1, player2User) {
  const inviteContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 🎴 THÁCH ĐẤU MEMORY CARD"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **${player1.username}** muốn thách đấu **${player2User.username}**!\n` +
        `> Thể thức: **Memory Card PvP**\n\n` +
        `**${player2User.username}**, bạn có chấp nhận không?`,
      ),
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pvp_accept")
      .setLabel("✅ Chấp Nhận")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("pvp_decline")
      .setLabel("❌ Từ Chối")
      .setStyle(ButtonStyle.Danger),
  );
  inviteContainer.addActionRowComponents(row);

  const inviteMsg = await reply(message, {
    content: `<@${player2User.id}>`,
    components: [inviteContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  const collector = inviteMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === player2User.id,
    time: 60000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "pvp_accept") {
      collector.stop("accepted");
      await showBoardSizeSelection(message, player1, null, interaction, {
        id: player2User.id,
        username: player2User.username,
      });
    } else {
      const declineContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> ❌ **Lời thách đấu đã bị từ chối.**",
        ),
      );
      await interaction.update({
        content: "",
        components: [declineContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason !== "accepted" && collected.size === 0) {
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:clock:1446769163669602335> **Hết thời gian chờ phản hồi.**",
        ),
      );
      inviteMsg
        .edit({
          content: "",
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => { });
    }
  });
}

// ==========================================
// DIFFICULTY SELECTION (AI only)
// ==========================================
async function showDifficultySelection(message, player) {
  const menuContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 🎴 CHỌN ĐỘ KHÓ AI"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🟢 **Dễ:** AI hay quên (30% nhớ)\n` +
        `🟡 **Trung Bình:** AI nhớ được (60% nhớ)\n` +
        `🟠 **Khó:** AI nhớ tốt (85% nhớ)\n` +
        `🔴 **Rất Khó:** AI siêu nhớ (95% nhớ)\n` +
        `🟣 **Bất Bại:** AI trí nhớ vô hạn (100% nhớ)`,
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
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("difficulty_4")
        .setLabel("🔴 Rất Khó")
        .setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("difficulty_5")
        .setLabel("🟣 Bất Bại")
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
    await showBoardSizeSelection(message, player, difficulty, interaction);
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

// ==========================================
// BOARD SIZE SELECTION
// ==========================================
async function showBoardSizeSelection(
  message,
  player,
  difficulty,
  prevInteraction,
  player2 = null,
) {
  const sizeContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## 📐 KÍCH THƯỚC BÀN CHƠI"),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `- **4×4:** 8 cặp thẻ - Nhanh gọn\n` +
        `- **4×5:** 10 cặp thẻ - Chuẩn mực\n` +
        `- **6×6:** 18 cặp thẻ - Thử thách trí nhớ`,
      ),
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("size_4x4")
        .setLabel("4×4 Nhanh")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("size_4x5")
        .setLabel("4×5 Chuẩn")
        .setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("size_6x6")
        .setLabel("6×6 Thử thách")
        .setStyle(ButtonStyle.Danger),
    ),
  ];

  rows.forEach((row) => sizeContainer.addActionRowComponents(row));
  const options = {
    components: [sizeContainer],
    flags: MessageFlags.IsComponentsV2,
  };
  await prevInteraction.update(options);
  const sizeMessage = prevInteraction.message;
  const collector = sizeMessage.createMessageComponentCollector({
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
    const boardSize = interaction.customId.split("_")[1];
    collector.stop("selected");
    await startGame(message, player, difficulty, boardSize, interaction, player2);
  });

  collector.on("end", (collected, reason) => {
    if (reason !== "selected") {
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:clock:1446769163669602335> **Hết thời gian chọn!**",
        ),
      );
      sizeMessage.edit({
        components: [timeoutContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  });
}

// ==========================================
// START GAME
// ==========================================
async function startGame(message, player, difficulty, boardSize, interaction, player2 = null) {
  const config = BOARD_SIZES[boardSize];
  const totalCards = config.rows * config.cols;
  const isPvP = !!player2;

  // Tạo các cặp thẻ
  const selectedEmojis = CARD_EMOJIS.slice(0, config.pairs);
  const cards = [...selectedEmojis, ...selectedEmojis];

  // Xáo trộn thẻ
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Khởi tạo bàn chơi
  const board = [];
  let index = 0;
  for (let i = 0; i < config.rows; i++) {
    const row = [];
    for (let j = 0; j < config.cols; j++) {
      row.push({
        emoji: cards[index],
        isFlipped: false,
        isMatched: false,
        position: index,
      });
      index++;
    }
    board.push(row);
  }

  const gameState = {
    board: board,
    player: player,
    player2: player2, // null = vs AI, object = PvP
    isPvP: isPvP,
    difficulty: difficulty,
    boardSize: boardSize,
    rows: config.rows,
    cols: config.cols,
    totalPairs: config.pairs,
    playerScore: 0,
    player2Score: 0, // Used for both AI and player2
    currentTurn: "player1", // "player1", "player2" (or "ai")
    firstFlip: null,
    secondFlip: null,
    isProcessing: false, // LOCK: prevents clicking during flip animation
    gameOver: false,
    moveCount: 0,
    aiMemory: new Map(),
    revealedCards: [],
    startTime: Date.now(),
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

  await interaction.update(options);
  // interaction.update() returns InteractionResponse, NOT Message
  // Use interaction.message to get the actual Message reference for .edit()
  const gameMessage = interaction.message;

  // Store game for both players in PvP
  const gameData = {
    ...gameState,
    messageId: gameMessage.id,
    channelId: message.channel.id,
  };
  activeGames.set(player.id, gameData);
  if (isPvP) {
    activeGames.set(player2.id, gameData);
  }

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

      // LOCK CHECK: Prevent clicking during processing
      if (game.isProcessing) {
        return buttonInteraction.reply({
          content: "> <:warning:1455096625373380691> Đang xử lý, vui lòng đợi!",
          ephemeral: true,
        });
      }

      // Check turn ownership
      if (game.isPvP) {
        // PvP mode
        const isP1Turn = game.currentTurn === "player1" && buttonInteraction.user.id === player.id;
        const isP2Turn = game.currentTurn === "player2" && buttonInteraction.user.id === player2.id;
        if (!isP1Turn && !isP2Turn) {
          if (buttonInteraction.user.id !== player.id && buttonInteraction.user.id !== player2.id) {
            return buttonInteraction.reply({
              content: "> <:warning:1455096625373380691> Đây không phải game của bạn!",
              ephemeral: true,
            });
          }
          return buttonInteraction.reply({
            content: "> <:warning:1455096625373380691> Chưa đến lượt của bạn!",
            ephemeral: true,
          });
        }
      } else {
        // AI mode
        if (buttonInteraction.user.id !== player.id) {
          return buttonInteraction.reply({
            content: "> <:warning:1455096625373380691> Đây không phải game của bạn!",
            ephemeral: true,
          });
        }
        if (game.currentTurn !== "player1") {
          return buttonInteraction.reply({
            content: "> <:warning:1455096625373380691> Đang là lượt của AI!",
            ephemeral: true,
          });
        }
      }

      const position = parseInt(buttonInteraction.customId.split("_")[1]);
      const row = Math.floor(position / game.cols);
      const col = position % game.cols;
      const card = game.board[row][col];

      if (card.isMatched || card.isFlipped) {
        return buttonInteraction.reply({
          content: "> <:warning:1455096625373380691> Thẻ này đã được lật!",
          ephemeral: true,
        });
      }

      // Lật thẻ
      card.isFlipped = true;
      game.moveCount++;

      if (!game.firstFlip) {
        // Lật thẻ đầu tiên
        game.firstFlip = { row, col, emoji: card.emoji };
        game.revealedCards.push(position);

        const { attachment, container: flipContainer } =
          await createGameBoard(game);
        const buttons = createButtons(game);
        buttons.forEach((row) => flipContainer.addActionRowComponents(row));

        const options = {
          components: [flipContainer],
          flags: MessageFlags.IsComponentsV2,
        };
        if (attachment) options.files = [attachment];
        await buttonInteraction.update(options);
      } else if (!game.secondFlip) {
        // Kiểm tra không được chọn cùng 1 thẻ
        if (game.firstFlip.row === row && game.firstFlip.col === col) {
          card.isFlipped = false;
          return buttonInteraction.reply({
            content:
              "> <:warning:1455096625373380691> Phải chọn 2 thẻ khác nhau!",
            ephemeral: true,
          });
        }

        // Lật thẻ thứ hai — LOCK GAME
        game.secondFlip = { row, col, emoji: card.emoji };
        game.revealedCards.push(position);
        game.isProcessing = true; // LOCK

        const { attachment, container: flip2Container } =
          await createGameBoard(game);
        // Show cards but disable ALL buttons during processing
        const buttons = createButtons(game);
        buttons.forEach((row) => flip2Container.addActionRowComponents(row));

        const options = {
          components: [flip2Container],
          flags: MessageFlags.IsComponentsV2,
        };
        if (attachment) options.files = [attachment];
        await buttonInteraction.update(options);

        // Process match after delay — use async IIFE with try-catch
        (async () => {
          try {
            await sleep(2000);
            await processFlipResult(game, gameMessage, collector, player.id, player2?.id);
          } catch (error) {
            console.error("Error in processFlipResult:", error);
            // Recovery: reset state
            game.firstFlip = null;
            game.secondFlip = null;
            game.revealedCards = [];
            game.isProcessing = false;
            game.currentTurn = "player1";
            for (let r = 0; r < game.rows; r++) {
              for (let c = 0; c < game.cols; c++) {
                if (game.board[r][c].isFlipped && !game.board[r][c].isMatched) {
                  game.board[r][c].isFlipped = false;
                }
              }
            }
            try {
              const { attachment: a, container: ct } = await createGameBoard(game);
              const btns = createButtons(game);
              btns.forEach((row) => ct.addActionRowComponents(row));
              const opts = { components: [ct], flags: MessageFlags.IsComponentsV2 };
              if (a) opts.files = [a];
              await gameMessage.edit(opts);
            } catch (e) { console.error("Recovery edit failed:", e); }
          }
        })();
      }
    } catch (error) {
      console.error("Error handling button:", error);
    }
  });

  collector.on("end", () => {
    const game = activeGames.get(player.id);
    if (game && !game.gameOver) {
      activeGames.delete(player.id);
      if (isPvP && player2) activeGames.delete(player2.id);
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

// ==========================================
// PROCESS FLIP RESULT (shared by player & AI)
// ==========================================
async function processFlipResult(game, gameMessage, collector, player1Id, player2Id) {
  if (!game || !game.firstFlip || !game.secondFlip) {
    // Invalid state — reset and give turn to player
    if (game) {
      game.firstFlip = null;
      game.secondFlip = null;
      game.revealedCards = [];
      game.isProcessing = false;
      if (!game.isPvP) game.currentTurn = "player1";
      try {
        const { attachment, container } = await createGameBoard(game);
        const buttons = createButtons(game);
        buttons.forEach((row) => container.addActionRowComponents(row));
        const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
        if (attachment) options.files = [attachment];
        await gameMessage.edit(options);
      } catch (e) { console.error("Error recovering game state:", e); }
    }
    return;
  }

  const first = game.board[game.firstFlip.row][game.firstFlip.col];
  const second = game.board[game.secondFlip.row][game.secondFlip.col];
  const isMatch = game.firstFlip.emoji === game.secondFlip.emoji;

  if (isMatch) {
    // Found a match!
    first.isMatched = true;
    second.isMatched = true;

    if (game.currentTurn === "player1") {
      game.playerScore++;
    } else {
      game.player2Score++;
    }

    // Remove from AI memory
    if (!game.isPvP) {
      game.aiMemory.delete(game.firstFlip.emoji);
    }

    game.firstFlip = null;
    game.secondFlip = null;
    game.revealedCards = [];
    game.isProcessing = false; // UNLOCK

    // Check game end
    if (game.playerScore + game.player2Score === game.totalPairs) {
      game.gameOver = true;
      const { attachment, container: endContainer } =
        await createGameBoard(game);
      await gameMessage.edit({
        components: [endContainer],
        files: attachment ? [attachment] : [],
        flags: MessageFlags.IsComponentsV2,
      });
      activeGames.delete(player1Id);
      if (player2Id) activeGames.delete(player2Id);
      collector.stop();
      return;
    }

    // Same player continues! Update board
    const { attachment, container: continueContainer } =
      await createGameBoard(game);
    const buttons = createButtons(game);
    buttons.forEach((row) => continueContainer.addActionRowComponents(row));

    const options = {
      components: [continueContainer],
      flags: MessageFlags.IsComponentsV2,
    };
    if (attachment) options.files = [attachment];
    await gameMessage.edit(options);

    // If AI found match, AI continues
    if (!game.isPvP && game.currentTurn !== "player1") {
      await sleep(1500);
      await playAITurn(game, gameMessage, collector, player1Id);
    }
  } else {
    // No match — flip cards back
    // AI memorizes before flipping back
    if (!game.isPvP) {
      const aiConfig = AI_DIFFICULTY[game.difficulty];
      if (Math.random() < aiConfig.memoryChance) {
        rememberCard(game, game.firstFlip);
        rememberCard(game, game.secondFlip);
      }
    }

    first.isFlipped = false;
    second.isFlipped = false;

    // Switch turn
    if (game.isPvP) {
      game.currentTurn = game.currentTurn === "player1" ? "player2" : "player1";
    } else {
      game.currentTurn = game.currentTurn === "player1" ? "ai" : "player1";
    }

    game.firstFlip = null;
    game.secondFlip = null;
    game.revealedCards = [];
    game.isProcessing = false; // UNLOCK

    const { attachment, container: missContainer } =
      await createGameBoard(game);
    const buttons = createButtons(game);
    buttons.forEach((row) => missContainer.addActionRowComponents(row));

    const options = {
      components: [missContainer],
      flags: MessageFlags.IsComponentsV2,
    };
    if (attachment) options.files = [attachment];
    await gameMessage.edit(options);

    // AI plays
    if (!game.isPvP && game.currentTurn === "ai") {
      await sleep(1500);
      await playAITurn(game, gameMessage, collector, player1Id);
    }
  }
}

// ==========================================
// AI MEMORY HELPER
// ==========================================
function rememberCard(game, flip) {
  if (!game.aiMemory.has(flip.emoji)) {
    game.aiMemory.set(flip.emoji, []);
  }
  const positions = game.aiMemory.get(flip.emoji);
  // Avoid duplicates
  const exists = positions.some((p) => p.row === flip.row && p.col === flip.col);
  if (!exists) {
    positions.push({ row: flip.row, col: flip.col, emoji: flip.emoji });
  }
}

// ==========================================
// AI TURN
// ==========================================
async function playAITurn(game, gameMessage, collector, playerId) {
  if (game.gameOver || game.currentTurn !== "ai") return;

  const aiConfig = AI_DIFFICULTY[game.difficulty];
  let firstCard = null;
  let secondCard = null;

  // Get available cards
  const availableCards = [];
  for (let i = 0; i < game.rows; i++) {
    for (let j = 0; j < game.cols; j++) {
      const card = game.board[i][j];
      if (!card.isMatched && !card.isFlipped) {
        availableCards.push({ row: i, col: j, emoji: card.emoji });
      }
    }
  }

  if (availableCards.length < 2) {
    if (game.playerScore + game.player2Score === game.totalPairs) {
      game.gameOver = true;
      const { attachment, container: endContainer } =
        await createGameBoard(game);
      await gameMessage.edit({
        components: [endContainer],
        files: attachment ? [attachment] : [],
        flags: MessageFlags.IsComponentsV2,
      });
      activeGames.delete(playerId);
      collector.stop();
    } else {
      game.currentTurn = "player1";
      game.isProcessing = false;
      const { attachment, container } = await createGameBoard(game);
      const buttons = createButtons(game);
      buttons.forEach((row) => container.addActionRowComponents(row));
      const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
      if (attachment) options.files = [attachment];
      await gameMessage.edit(options);
    }
    return;
  }

  // Try to find a known pair from memory
  if (aiConfig.perfectMemory || Math.random() < aiConfig.memoryChance) {
    for (const [emoji, positions] of game.aiMemory.entries()) {
      const validPositions = positions.filter((pos) => {
        const card = game.board[pos.row][pos.col];
        return !card.isMatched && !card.isFlipped;
      });

      if (validPositions.length >= 2) {
        firstCard = validPositions[0];
        secondCard = validPositions[1];
        break;
      }
    }
  }

  // Random pick if no pair found
  if (!firstCard || !secondCard) {
    const firstIndex = Math.floor(Math.random() * availableCards.length);
    firstCard = availableCards[firstIndex];

    // Check if AI remembers a match for the first card's emoji
    const knownPositions = game.aiMemory.get(firstCard.emoji);
    if (knownPositions && (aiConfig.perfectMemory || Math.random() < aiConfig.memoryChance)) {
      const match = knownPositions.find(
        (p) =>
          (p.row !== firstCard.row || p.col !== firstCard.col) &&
          !game.board[p.row][p.col].isMatched,
      );
      if (match) {
        secondCard = match;
      }
    }

    if (!secondCard) {
      const remaining = availableCards.filter(
        (c) => c.row !== firstCard.row || c.col !== firstCard.col,
      );
      if (remaining.length > 0) {
        secondCard = remaining[Math.floor(Math.random() * remaining.length)];
      }
    }
  }

  if (!firstCard || !secondCard) {
    game.currentTurn = "player1";
    game.isProcessing = false;
    const { attachment, container } = await createGameBoard(game);
    const buttons = createButtons(game);
    buttons.forEach((row) => container.addActionRowComponents(row));
    const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
    if (attachment) options.files = [attachment];
    await gameMessage.edit(options);
    return;
  }

  // Lock during AI turn
  game.isProcessing = true;

  try {
    // AI flips first card
    const firstCardObj = game.board[firstCard.row][firstCard.col];
    firstCardObj.isFlipped = true;
    game.firstFlip = firstCard;
    game.revealedCards.push(firstCard.row * game.cols + firstCard.col);

    // AI memorize what it sees
    rememberCard(game, { row: firstCard.row, col: firstCard.col, emoji: firstCardObj.emoji });

    let attachment, container;
    ({ attachment, container } = await createGameBoard(game));
    let buttons = createButtons(game);
    buttons.forEach((row) => container.addActionRowComponents(row));

    let options = { components: [container], flags: MessageFlags.IsComponentsV2 };
    if (attachment) options.files = [attachment];
    await gameMessage.edit(options);

    // Wait 1s before flipping second card
    await sleep(1000);

    // Verify game still valid
    if (game.gameOver) return;

    // AI flips second card
    const secondCardObj = game.board[secondCard.row][secondCard.col];
    secondCardObj.isFlipped = true;
    game.secondFlip = secondCard;
    game.revealedCards.push(secondCard.row * game.cols + secondCard.col);

    // AI memorize what it sees
    rememberCard(game, { row: secondCard.row, col: secondCard.col, emoji: secondCardObj.emoji });

    ({ attachment, container } = await createGameBoard(game));
    buttons = createButtons(game);
    buttons.forEach((row) => container.addActionRowComponents(row));

    options = { components: [container], flags: MessageFlags.IsComponentsV2 };
    if (attachment) options.files = [attachment];
    await gameMessage.edit(options);

    // Wait 2s to show both cards
    await sleep(2000);

    // Process result
    await processFlipResult(game, gameMessage, collector, playerId, null);
  } catch (error) {
    console.error("Error in AI turn:", error);
    // Recover: reset state and give turn to player
    game.firstFlip = null;
    game.secondFlip = null;
    game.revealedCards = [];
    game.isProcessing = false;
    game.currentTurn = "player1";
    // Reset any flipped cards that aren't matched
    for (let i = 0; i < game.rows; i++) {
      for (let j = 0; j < game.cols; j++) {
        if (game.board[i][j].isFlipped && !game.board[i][j].isMatched) {
          game.board[i][j].isFlipped = false;
        }
      }
    }
    try {
      const { attachment, container } = await createGameBoard(game);
      const buttons = createButtons(game);
      buttons.forEach((row) => container.addActionRowComponents(row));
      const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
      if (attachment) options.files = [attachment];
      await gameMessage.edit(options);
    } catch (e) { console.error("Error recovering from AI error:", e); }
  }
}

// ==========================================
// CREATE BUTTONS
// ==========================================
function createButtons(gameState) {
  const rows = [];
  const maxCardsPerRow = 5;

  for (let i = 0; i < gameState.rows; i++) {
    let row = new ActionRowBuilder();
    for (let j = 0; j < gameState.cols; j++) {
      const position = i * gameState.cols + j;
      const card = gameState.board[i][j];

      let label = "🎴";
      let style = ButtonStyle.Secondary;
      // Disable ALL buttons when: game over, processing, or not current player's turn
      let disabled = gameState.gameOver || gameState.isProcessing;

      // Disable during AI turn (non-PvP)
      if (!gameState.isPvP && gameState.currentTurn === "ai") {
        disabled = true;
      }

      if (card.isMatched) {
        label = "✅";
        style = ButtonStyle.Success;
        disabled = true;
      } else if (card.isFlipped) {
        label = card.emoji;
        style = ButtonStyle.Primary;
        disabled = true;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`card_${position}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled),
      );

      if (row.components.length === maxCardsPerRow) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
    }
    if (row.components.length > 0) {
      rows.push(row);
    }
  }

  return rows.slice(0, 5); // Discord giới hạn 5 rows
}

// ==========================================
// CREATE GAME BOARD (Canvas + Container)
// ==========================================
async function createGameBoard(gameState) {
  let attachment = null;
  const config = BOARD_SIZES[gameState.boardSize];
  const aiConfig = gameState.isPvP ? null : AI_DIFFICULTY[gameState.difficulty];

  if (hasCanvas()) {
    const cardWidth = 80;
    const cardHeight = 100;
    const padding = 60;
    const spacing = 10;

    const canvasWidth = gameState.cols * (cardWidth + spacing) + padding * 2;
    const canvasHeight =
      gameState.rows * (cardHeight + spacing) + padding * 2 + 150;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, "#1e1b4b");
    gradient.addColorStop(0.5, "#4c1d95");
    gradient.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Header
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🎴 MEMORY CARD", canvasWidth / 2, 50);

    // Score
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#3b82f6";
    ctx.textAlign = "left";
    const p1Name = gameState.player?.username || "Player 1";
    ctx.fillText(`👤 ${p1Name}: ${gameState.playerScore}`, padding, 90);

    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "right";
    if (gameState.isPvP) {
      const p2Name = gameState.player2?.username || "Player 2";
      ctx.fillText(`👤 ${p2Name}: ${gameState.player2Score}`, canvasWidth - padding, 90);
    } else {
      ctx.fillText(`🤖 AI: ${gameState.player2Score}`, canvasWidth - padding, 90);
    }

    // Turn indicator
    ctx.font = "20px Arial";
    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "center";
    let turnText;
    if (gameState.gameOver) {
      turnText = "🏁 KẾT THÚC";
    } else if (gameState.isProcessing) {
      turnText = "⏳ Đang xử lý...";
    } else if (gameState.isPvP) {
      turnText = gameState.currentTurn === "player1"
        ? `🎯 Lượt: ${p1Name}`
        : `🎯 Lượt: ${gameState.player2?.username || "Player 2"}`;
    } else {
      turnText = gameState.currentTurn === "player1"
        ? "🎯 Lượt của bạn"
        : "🤖 Lượt AI";
    }
    ctx.fillText(turnText, canvasWidth / 2, 120);

    // Draw cards
    const boardY = padding + 100;
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < gameState.rows; i++) {
      for (let j = 0; j < gameState.cols; j++) {
        const card = gameState.board[i][j];
        const x = padding + j * (cardWidth + spacing);
        const y = boardY + i * (cardHeight + spacing);

        // Card shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(x + 4, y + 4, cardWidth, cardHeight);

        // Card background
        if (card.isMatched) {
          ctx.fillStyle = "#22c55e";
        } else if (card.isFlipped) {
          ctx.fillStyle = "#3b82f6";
        } else {
          const cardGradient = ctx.createLinearGradient(
            x, y, x + cardWidth, y + cardHeight,
          );
          cardGradient.addColorStop(0, "#6366f1");
          cardGradient.addColorStop(1, "#8b5cf6");
          ctx.fillStyle = cardGradient;
        }
        ctx.fillRect(x, y, cardWidth, cardHeight);

        // Card border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, cardWidth, cardHeight);

        // Card content
        if (card.isMatched) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText("✅", x + cardWidth / 2, y + cardHeight / 2);
        } else if (card.isFlipped) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(card.emoji, x + cardWidth / 2, y + cardHeight / 2);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 36px Arial";
          ctx.fillText("🎴", x + cardWidth / 2, y + cardHeight / 2);
          ctx.font = "bold 40px Arial";
        }
      }
    }

    attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "memory-board.png",
    });
  }

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 🎴 MEMORY CARD - ${config.label}`),
  );

  if (gameState.gameOver) {
    const p1Name = gameState.player?.username || "Bạn";
    let p2Label, p2Name;
    if (gameState.isPvP) {
      p2Name = gameState.player2?.username || "Player 2";
      p2Label = `👤 ${p2Name}`;
    } else {
      p2Name = "AI";
      p2Label = `🤖 AI`;
    }

    let winner;
    if (gameState.playerScore > gameState.player2Score) {
      winner = p1Name;
    } else if (gameState.playerScore < gameState.player2Score) {
      winner = p2Name;
    } else {
      winner = "HÒA";
    }

    const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        winner === "HÒA"
          ? `### 🤝 TRẬN HÒA!\n> 👤 ${p1Name}: **${gameState.playerScore}** cặp\n> ${p2Label}: **${gameState.player2Score}** cặp\n> ⏱️ Thời gian: **${timeElapsed}s**`
          : `### 🏆 ${winner} THẮNG!\n> 👤 ${p1Name}: **${gameState.playerScore}** cặp\n> ${p2Label}: **${gameState.player2Score}** cặp\n> ⏱️ Thời gian: **${timeElapsed}s**`,
      ),
    );
  } else {
    const p1Name = gameState.player?.username || "Bạn";
    let turnLabel, p2Label;

    if (gameState.isPvP) {
      const p2Name = gameState.player2?.username || "Player 2";
      p2Label = `👤 ${p2Name}: **${gameState.player2Score}/${gameState.totalPairs}**`;
      if (gameState.isProcessing) {
        turnLabel = "⏳ Đang xử lý...";
      } else {
        turnLabel = gameState.currentTurn === "player1" ? p1Name : p2Name;
      }
    } else {
      p2Label = `🤖 AI: **${gameState.player2Score}/${gameState.totalPairs}**`;
      if (gameState.isProcessing) {
        turnLabel = "⏳ Đang xử lý...";
      } else {
        turnLabel = gameState.currentTurn === "player1" ? p1Name : "AI";
      }
    }

    let statusText =
      `> 🎯 Lượt: **${turnLabel}**\n` +
      `> 👤 ${p1Name}: **${gameState.playerScore}/${gameState.totalPairs}**\n` +
      `> ${p2Label}`;

    if (!gameState.isPvP && aiConfig) {
      statusText += `\n> 📊 Độ khó: **${aiConfig.name}** (${aiConfig.label})`;
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(statusText),
    );
  }

  return { attachment, container };
}
