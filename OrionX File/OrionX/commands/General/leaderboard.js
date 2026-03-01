import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { User } from "../../database/models.js";
import {
  reply,
  getUser,
  createOwnerCollector,
} from "../../utils/commandHelper.js";
import {
  loadGlobalServerLeaderboard,
  syncLocalServerLeaderboardSnapshot,
} from "../../utils/serverLeaderboardSnapshot.js";

export default {
  name: "leaderboard",
  aliases: ["top", "lb", "rank"],
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("Xem bảng xếp hạng OrionX"),

  async execute(source) {
    const user = getUser(source);

    try {
      const mainContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <:leaderboard:1463850215592165448> Bảng Xếp Hạng OrionX <:leaderboard:1463850215592165448>",
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "- Chọn loại bảng xếp hạng trong menu bên dưới.\n\n" +
              "> - Leaderboard Web: https://orxdocs.web.app/leaderboard",
          ),
        );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("leaderboard_select")
        .setPlaceholder("Chọn bảng xếp hạng...")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Top Xcoin")
            .setDescription("Xếp hạng theo tài sản")
            .setValue("coin")
            .setEmoji({ id: "1456194056798339104" }),
          new StringSelectMenuOptionBuilder()
            .setLabel("Top Chiến Thắng")
            .setDescription("Xếp hạng theo số trận thắng")
            .setValue("battle")
            .setEmoji({ name: "\u2694\uFE0F" }),
          new StringSelectMenuOptionBuilder()
            .setLabel("Top Cấp Độ")
            .setDescription("Xếp hạng theo cấp độ")
            .setValue("level")
            .setEmoji({ name: "\u{1F4CA}" }),
          new StringSelectMenuOptionBuilder()
            .setLabel("Top Chuỗi Ngày")
            .setDescription("Xếp hạng chuỗi điểm danh")
            .setValue("streak")
            .setEmoji({ name: "\u{1F525}" }),
          new StringSelectMenuOptionBuilder()
            .setLabel("Top Chuỗi Thắng")
            .setDescription("Xếp hạng chuỗi thắng battle")
            .setValue("streak_battle")
            .setEmoji({ name: "\u{1F94A}" }),
          new StringSelectMenuOptionBuilder()
            .setLabel("Top Máy Chủ")
            .setDescription("Xếp hạng máy chủ toàn bot")
            .setValue("server")
            .setEmoji({ name: "\u{1F3F0}" }),
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);
      mainContainer.addActionRowComponents(row);

      let topMsg = await reply(source, {
        components: [mainContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.IsPersistent,
      });

      if (!topMsg && source?.fetchReply) {
        topMsg = await source.fetchReply().catch(() => null);
      }
      if (!topMsg) return;

      const collector = createOwnerCollector(topMsg, user.id, { time: 120000 });

      collector.on("collect", async (interaction) => {
        try {
          try {
            await interaction.deferUpdate();
          } catch (err) {
            if (err.code !== 10062 && err.code !== 40060) throw err;
            console.warn(
              `[TOP WARNING] Interaction defer failed: ${err.message}`,
            );
          }

          const type = interaction.values[0];
          let container;

          switch (type) {
            case "coin":
              container = await generateCoinLeaderboard(source);
              break;
            case "battle":
              container = await generateBattleLeaderboard(source);
              break;
            case "level":
              container = await generateLevelLeaderboard(source);
              break;
            case "streak":
              container = await generateStreakLeaderboard(source);
              break;
            case "server":
              container = await generateServerLeaderboardGlobal(source);
              break;
            case "streak_battle":
              container = await generateBattleStreakLeaderboard(source);
              break;
            default:
              return;
          }

          container.addActionRowComponents(row);

          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
              components: [container],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.IsPersistent,
            });
          }
        } catch (error) {
          console.error("[TOP] Error handling selection:", error);
        }
      });

      collector.on("end", async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            selectMenu.setDisabled(true),
          );
          await topMsg.edit({
            components: [topMsg.components[0], disabledRow],
          });
        } catch {
          // noop
        }
      });
    } catch (error) {
      console.error("[TOP] Command error:", error);
      await reply(source, {
        content:
          "<a:no:1455096623804715080> Có lỗi khi hiển thị bảng xếp hạng!",
      });
    }
  },
};

async function generateCoinLeaderboard(source) {
  const user = getUser(source);
  const users = await User.find({}).sort({ money: -1 }).limit(10).lean();

  const listContent = buildUserTopList(users, user.id, (u) => {
    const money = (u.money || 0).toLocaleString();
    return `> Tài sản: \`${money}\` <:Xcoin:1433810075927183441>`;
  });

  const userRank = await getUserRank(user.id, "money");
  const totalUsers = await User.countDocuments();
  const userData = await User.findOne({ userId: user.id }).lean();
  const userMoney = (userData?.money || 0).toLocaleString();

  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:leaderboard:1463850215592165448> <a:pixelcoin:1456194056798339104> Top Xcoin <a:pixelcoin:1456194056798339104> <:leaderboard:1463850215592165448>",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listContent))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <:member:1446769169738502165> Vị Trí Của Bạn\n` +
          `- **Hạng:** \`#${userRank.toLocaleString()}\` / \`${totalUsers.toLocaleString()}\`\n` +
          `- **Tài sản:** \`${userMoney}\` <:Xcoin:1433810075927183441>`,
      ),
    );
}

async function generateBattleLeaderboard(source) {
  const user = getUser(source);
  const users = await User.aggregate([
    { $sort: { totalBattleWins: -1 } },
    { $limit: 10 },
  ]);

  const listContent = buildUserTopList(users, user.id, (u) => {
    const wins = (u.totalBattleWins || 0).toLocaleString();
    const streak = u.battleWinStreak || 0;
    return `> Trận thắng: \`${wins}\` | Chuỗi thắng: \`${streak}\``;
  });

  const userRank = await getUserRank(user.id, "totalBattleWins");
  const totalUsers = await User.countDocuments();
  const userData = await User.findOne({ userId: user.id }).lean();
  const userWins = (userData?.totalBattleWins || 0).toLocaleString();

  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:leaderboard:1463850215592165448> <:Battle:1470101035392565299> Top Chiến Thắng <:Battle:1470101035392565299> <:leaderboard:1463850215592165448>",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listContent))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <:member:1446769169738502165> Vị Trí Của Bạn\n` +
          `- **Hạng:** \`#${userRank.toLocaleString()}\` / \`${totalUsers.toLocaleString()}\`\n` +
          `- **Số trận thắng:** \`${userWins}\``,
      ),
    );
}

async function generateLevelLeaderboard(source) {
  const user = getUser(source);
  const users = await User.find({})
    .sort({ level: -1, exp: -1 })
    .limit(10)
    .lean();

  const listContent = buildUserTopList(users, user.id, (u) => {
    const level = u.level || 1;
    const exp = (u.exp || 0).toLocaleString();
    return `> Cấp độ: \`${level}\` | EXP: \`${exp}\``;
  });

  const userRank = await getUserRank(user.id, "level");
  const userData = await User.findOne({ userId: user.id }).lean();
  const userLevel = userData?.level || 1;
  const userExp = (userData?.exp || 0).toLocaleString();

  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:leaderboard:1463850215592165448> <:star:1476463431044431905> Top Cấp Độ <:star:1476463431044431905> <:leaderboard:1463850215592165448>",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listContent))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <:member:1446769169738502165> Vị Trí Của Bạn\n` +
          `- **Hạng:** \`#${userRank.toLocaleString()}\`\n` +
          `- **Cấp độ:** \`${userLevel}\` | **EXP:** \`${userExp}\``,
      ),
    );
}

async function generateStreakLeaderboard(source) {
  const user = getUser(source);
  const users = await User.find({ dailyStreak: { $gt: 0 } })
    .sort({ dailyStreak: -1 })
    .limit(10)
    .lean();

  const listContent = buildUserTopList(users, user.id, (u) => {
    const streakDays = u.dailyStreak || 0;
    return `> Chuỗi ngày: \`${streakDays}\` ngày`;
  });

  const userRank = await getUserRank(user.id, "dailyStreak");
  const userData = await User.findOne({ userId: user.id }).lean();
  const userStreak = userData?.dailyStreak || 0;

  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:leaderboard:1463850215592165448> Top Chuỗi Ngày <:leaderboard:1463850215592165448>",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listContent))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <:member:1446769169738502165> Vị Trí Của Bạn\n` +
          `- **Hạng:** \`#${userRank.toLocaleString()}\`\n` +
          `- **Chuỗi hiện tại:** \`${userStreak}\` ngày\n\n` +
          `### <:warning:1455096625373380691> Lưu Ý\n` +
          `> Chuỗi sẽ bị reset nếu bạn không làm daily trong ngày.\n` +
          `> Dùng \`Xdaily\` mỗi ngày để duy trì chuỗi.`,
      ),
    );
}

async function generateServerLeaderboardGlobal(source) {
  try {
    const start = Date.now();
    const botId = source?.client?.user?.id || null;

    if (!botId) {
      return new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> Bot chưa sẵn sàng để tải Top Server.",
        ),
      );
    }

    await syncLocalServerLeaderboardSnapshot(source.client).catch(() => null);

    const registeredUsersCount = await User.countDocuments({
      tosAccepted: true,
      money: { $gt: 0 },
    });

    const { rows: serverData } = await loadGlobalServerLeaderboard(botId, {
      limit: 0,
    });

    if (!serverData || serverData.length === 0) {
      return new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> Chưa có dữ liệu Top Server toàn bot. Vui lòng thử lại sau ít phút.",
        ),
      );
    }

    const top10 = serverData.slice(0, 10);
    const listContent =
      top10.length === 0
        ? "> Chưa có dữ liệu."
        : top10
            .map((server, index) => {
              const medal = getMedal(index);
              const isTop3 = index < 3;
              const highlight = server.guildId === source.guild?.id;

              let line = "";
              if (index === 0) line = `## ${medal} ${server.guildName}`;
              else if (isTop3) line = `### ${medal} ${server.guildName}`;
              else line = `${medal} **${server.guildName}**`;

              line += `\n> Tổng Coin: \`${server.totalMoney.toLocaleString()}\` <:Xcoin:1433810075927183441> | User : **\`${server.registeredCount}\`**${highlight ? " \`You Server\`" : ""}`;
              return line;
            })
            .join("\n\n");

    const currentServerIndex = serverData.findIndex(
      (server) => server.guildId === source.guild?.id,
    );
    const currentServer = serverData[currentServerIndex] || {
      totalMoney: 0,
      registeredCount: 0,
    };
    const currentServerRankText =
      currentServerIndex >= 0 ? `#${currentServerIndex + 1}` : "N/A";

    return new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:leaderboard:1463850215592165448> <:homeids:1474675481818300568> Top Máy Chủ <:homeids:1474675481818300568> <:leaderboard:1463850215592165448>",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `*Ping: \`${Date.now() - start}ms\` | User: \`${registeredUsersCount}\` | Server theo dõi: \`${serverData.length}\`*\n\n` +
            listContent,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### <:member:1446769169738502165> Server của bạn\n` +
            `> **Hạng:** \`${currentServerRankText}\`\n` +
            `> **Tổng Coin:** \`${currentServer.totalMoney.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
        ),
      );
  } catch (error) {
    console.error("[TOP SERVER][GLOBAL] CRITICAL ERROR:", error);
    return new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:no:1455096623804715080> Lỗi hệ thống khi tải Top Server!",
      ),
    );
  }
}

function getMedal(index) {
  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  return medals[index] || `**#${index + 1}**`;
}

async function getUserRank(userId, field) {
  try {
    const user = await User.findOne({ userId }).select(field).lean();
    if (!user) return 0;

    const value = user[field] || 0;
    const rank = await User.countDocuments({ [field]: { $gt: value } });

    return rank + 1;
  } catch (error) {
    console.error("[TOP] Error in getUserRank:", error);
    return 0;
  }
}

async function generateBattleStreakLeaderboard(source) {
  const user = getUser(source);
  const users = await User.find({ battleWinStreak: { $gt: 0 } })
    .sort({ battleWinStreak: -1 })
    .limit(10)
    .lean();

  const listContent = buildUserTopList(users, user.id, (u) => {
    const streak = u.battleWinStreak || 0;
    const maxStreak = u.maxBattleWinStreak || streak;
    return `> Chuỗi thắng: \`${streak}\` | Chuỗi cao nhất: \`${maxStreak}\``;
  });

  const userRank = await getUserRank(user.id, "battleWinStreak");
  const userData = await User.findOne({ userId: user.id }).lean();
  const userStreak = userData?.battleWinStreak || 0;
  const userMax = userData?.maxBattleWinStreak || 0;

  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:leaderboard:1463850215592165448> <a:king:1446770366382084267> Top Battle Streak <a:king:1446770366382084267> <:leaderboard:1463850215592165448>",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listContent))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <:member:1446769169738502165> Vị Trí Của Bạn\n` +
          `- **Hạng:** \`#${userRank.toLocaleString()}\`\n` +
          `- **Chuỗi hiện tại:** \`${userStreak}\` | **Chuỗi cao nhất:** \`${userMax}\``,
      ),
    );
}

function buildUserTopList(users, currentUserId, detailBuilder) {
  if (!users || users.length === 0) {
    return "> <a:no:1455096623804715080> Không có dữ liệu leaderboard.";
  }

  return users
    .map((u, index) => {
      const medal = getMedal(index);
      const isTop3 = index < 3;
      const highlight = u.userId === currentUserId;
      const userName = `<@${u.userId}>`;
      const nameText = highlight ? `**${userName}**` : userName;

      let line = "";
      if (index === 0) line = `## ${medal} ${nameText}`;
      else if (isTop3) line = `### ${medal} ${nameText}`;
      else line = `${medal} ${nameText}`;

      line += `\n${detailBuilder(u)}${highlight ? " \`BẠN\`" : ""}`;
      return line;
    })
    .join("\n\n");
}
