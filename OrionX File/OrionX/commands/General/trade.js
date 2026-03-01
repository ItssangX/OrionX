import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} from "discord.js";
import { findOrCreateUser } from "../../utils/userHelper.js";
import { User } from "../../database/models.js";
import { petPool } from "../../database/petPool.js";
import { getOrderedPetGroups } from "../../utils/petHelper.js";
import { reply, getUser, getOption } from "../../utils/commandHelper.js";

// Active Trade Sessions: Map<channelId, TradeSession>
const activeTrades = new Map();

export default {
  name: "trade",
  aliases: ["gd", "giao-dich"],

  async execute(source, args) {
    const user = getUser(source);
    const target =
      getOption(source, "user", "user") || source.mentions?.users.first();

    // 1. Validation
    if (!target) {
      return await reply(source, {
        content:
          "> <a:no:1455096623804715080> Vui lòng tag người muốn giao dịch! Ví dụ: `Xtrade @user`",
      });
    }
    if (target.id === user.id) {
      return await reply(source, {
        content: "> <a:no:1455096623804715080> Không thể trade với bản thân!",
      });
    }
    if (target.bot) {
      return await reply(source, {
        content: "> <a:no:1455096623804715080> Không thể giao dịch với Bot!",
      });
    }
    if (activeTrades.has(user.id) || activeTrades.has(target.id)) {
      return await reply(source, {
        content:
          "> <a:no:1455096623804715080> Bạn hoặc người kia đang trong một giao dịch khác!",
      });
    }

    // 2. Fetch Initial Data
    const p1Data = await findOrCreateUser(user.id, user.username);
    const p2Data = await findOrCreateUser(target.id, target.username);

    if (!p1Data) {
      return await reply(source, {
        content: "> <a:no:1455096623804715080> Bạn chưa chấp nhận TOS!",
      });
    }
    if (!p2Data) {
      return await reply(source, {
        content: `> <a:no:1455096623804715080> **${target.username}** chưa đăng ký sử dụng bot (Chưa chấp nhận TOS)!`,
      });
    }

    const reqContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <:trade:1476448459748802601> Yêu Cầu Giao Dịch <:trade:1476448459748802601>",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `- ${target}, **${user.username}** muốn giao dịch với bạn!\nBạn có đồng ý không?`,
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("*Hết hạn sau 30 giây*"),
      );

    const reqRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("trade_accept")
        .setLabel("Đồng ý")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("trade_decline")
        .setLabel("Từ chối")
        .setStyle(ButtonStyle.Danger),
    );
    reqContainer.addActionRowComponents(reqRow);
    let reqMsg = await reply(source, {
      components: [reqContainer],
      flags: MessageFlags.IsComponentsV2,
    });
    if (!reqMsg && source?.fetchReply) {
      reqMsg = await source.fetchReply().catch(() => null);
    }
    if (!reqMsg) return;

    // 4. Wait for Accept
    try {
      const confirmation = await reqMsg.awaitMessageComponent({
        filter: (i) =>
          i.user.id === target.id &&
          (i.customId === "trade_accept" || i.customId === "trade_decline"),
        time: 30000,
      });

      if (confirmation.customId === "trade_decline") {
        const declineContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> <a:no:1455096623804715080> **${target.username}** đã từ chối giao dịch.`,
            ),
          );
        await confirmation.update({
          components: [declineContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // ACCEPTED -> START TRADE SESSION
      try {
        await confirmation.deferUpdate();
      } catch (e) {}
      startTradeSession(source, reqMsg, user, target, p1Data, p2Data);
    } catch (e) {
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:clock:1446769163669602335> Hết thời gian yêu cầu giao dịch.",
        ),
      );
      await reqMsg.edit({
        components: [timeoutContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};

/**
 * START TRADE SESSION
 */
async function startTradeSession(
  source,
  msgRef,
  user1,
  user2,
  dbUser1,
  dbUser2,
) {
  const tradeId = `${user1.id}-${user2.id}-${Date.now()}`;

  // Initial State
  const session = {
    id: tradeId,
    msgRef: msgRef,
    lastUpdate: Date.now(),
    p1: {
      user: user1,
      db: dbUser1,
      money: 0,
      pets: [], // Array of pet UNIQUE KEYS (petId_createdAt) or objects
      locked: false,
      confirmed: false,
    },
    p2: {
      user: user2,
      db: dbUser2,
      money: 0,
      pets: [],
      locked: false,
      confirmed: false,
    },
  };

  activeTrades.set(user1.id, session);
  activeTrades.set(user2.id, session);

  // Render Initial Interface
  await updateTradeInterface(session);

  // Interaction Collector
  const collector = msgRef.createMessageComponentCollector({
    time: 300000, // 5 minutes max trade time
  });

  collector.on("collect", async (i) => {
    try {
      // Determine who clicked
      const isP1 = i.user.id === user1.id;
      const isP2 = i.user.id === user2.id;

      if (!isP1 && !isP2) {
        return i
          .reply({
            content:
              "<a:no:1455096623804715080> Bạn không tham gia giao dịch này!",
            flags: [MessageFlags.Ephemeral],
          })
          .catch(() => {});
      }

      const actor = isP1 ? session.p1 : session.p2;
      const other = isP1 ? session.p2 : session.p1;

      // Handle Actions
      const action = i.customId;

      // --- CANCEL ---
      if (action === "trade_cancel") {
        const cancelContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> <a:no:1455096623804715080> **Giao dịch đã bị hủy bởi ${i.user.username}.**`,
          ),
        );
        await i
          .update({
            components: [cancelContainer],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => {});
        collector.stop("cancelled");
        cleanupTrade(session);
        return;
      }

      // --- ADD MONEY ---
      if (action === "trade_add_money") {
        if (actor.locked)
          return i
            .reply({
              content: "🔒 Bạn đã khóa, không thể sửa!",
              ephemeral: true,
            })
            .catch(() => {});

        const modal = new ModalBuilder()
          .setCustomId(`modal_money_${tradeId}`)
          .setTitle("Nhập số tiền muốn thêm");

        const input = new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Số tiền")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("VD: 10000")
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        await i.showModal(modal).catch(() => {});

        // Wait for modal submit
        try {
          const submit = await i.awaitModalSubmit({
            time: 30000,
            filter: (s) => s.user.id === i.user.id,
          });
          const amount = parseInt(submit.fields.getTextInputValue("amount"));
          if (isNaN(amount) || amount <= 0)
            return submit.reply({
              content: "<a:no:1455096623804715080> Số tiền không hợp lệ!",
              flags: [MessageFlags.Ephemeral],
            });
          if (actor.db.money < actor.money + amount)
            return submit.reply({
              content: `<a:no:1455096623804715080> Không đủ tiền!`,
              flags: [MessageFlags.Ephemeral],
            });

          actor.money += amount;
          actor.confirmed = false;
          other.confirmed = false; // Reset confirm
          actor.locked = false;
          other.locked = false;

          await submit.deferUpdate().catch(() => {});
          await updateTradeInterface(session);
        } catch (e) {}
        return;
      }

      // --- ADD PET ---
      if (action === "trade_add_pet") {
        if (actor.locked)
          return i
            .reply({
              content: "🔒 Bạn đã khóa, không thể sửa!",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => {});

        if (!actor.db.pets || actor.db.pets.length === 0) {
          return i
            .reply({
              content: "<a:no:1455096623804715080> Bạn không có pet nào!",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => {});
        }

        // Refresh actor data so favorite/equip changes during an active trade
        // are reflected immediately in the selection list.
        const freshActorDb = await User.findOne({ userId: actor.user.id });
        if (!freshActorDb) {
          return i
            .reply({
              content:
                "<a:no:1455096623804715080> Không thể tải dữ liệu pet mới nhất. Hãy thử lại.",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => {});
        }
        actor.db = freshActorDb;

        // Use getOrderedPetGroups to display pets consistently with zoo
        const orderedGroups = getOrderedPetGroups(actor.db.pets);

        const pTeam = actor.db.team || {};
        const teamKeys = new Set(
          [pTeam.slot1?.key, pTeam.slot2?.key, pTeam.slot3?.key].filter(
            Boolean,
          ),
        );

        // Keep menu aligned with zoo: show all groups, even if locked by fav/team.
        const menuGroups = orderedGroups
          .map((group, groupIndex) => {
            const isFavorited = group.pets.some((p) => p.favorite);
            const isInTeam = group.pets.some((p) => {
              const key = `${p.petId}_${new Date(p.createdAt).getTime()}`;
              return p.equipped || teamKeys.has(key);
            });

            const availablePets = group.pets.filter((p) => {
              if (p.equipped) return false;
              const key = `${p.petId}_${new Date(p.createdAt).getTime()}`;
              if (actor.pets.some((offered) => offered.key === key))
                return false;
              if (teamKeys.has(key)) return false;
              if (isFavorited || isInTeam) return false;
              return true;
            });

            return {
              ...group,
              groupIndex: groupIndex + 1,
              availablePets,
              isFavorited,
              isInTeam,
            };
          })
          .slice(0, 25);

        if (menuGroups.length === 0) {
          return i
            .reply({
              content:
                "<a:no:1455096623804715080> Không có pet khả dụng (hoặc đã thêm hết)!",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => {});
        }

        // Build options from ordered groups (same order as zoo)
        const options = menuGroups.map((g) => {
          const p = g.pets[0];
          const favTag = g.isFavorited ? " ⭐" : "";
          const homeTag = g.isInTeam ? " 👥" : "";

          let description = `⚔️ ATK: ${p.atk} | ❤️ HP: ${p.hp} | ${g.rarity.toUpperCase()}`;
          if (g.isFavorited && g.isInTeam) {
            description = "⭐ Favorite + 👥 Trong team: Không thể trade";
          } else if (g.isFavorited) {
            description = "⭐ Favorite: Bỏ favorite để trade";
          } else if (g.isInTeam) {
            description = "👥 Đang trong team: Gỡ khỏi team để trade";
          } else if (g.availablePets.length === 0) {
            description = "📌 Đã thêm hết pet loại này vào bàn trade";
          }
          return {
            label: `${g.groupIndex}. ${g.name}${favTag}${homeTag} (Lv.${p.level}) [x${g.count}]`,
            description,
            value: `${g.groupIndex}`, // This is groupIndex + 1
            emoji: g.emoji || "🐾",
          };
        });

        const selectRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`select_pet_${tradeId}`)
            .setPlaceholder("Chọn pet để thêm vào giao dịch")
            .addOptions(options),
        );

        let selectMsg;
        try {
          // Acknowledge the original button click with the menu
          await i.reply({
            components: [selectRow],
            flags: [MessageFlags.Ephemeral],
          });

          if (i.fetchReply) {
            selectMsg = await i.fetchReply().catch(() => null);
          }
          if (!selectMsg) return;

          const selection = await selectMsg
            .awaitMessageComponent({
              componentType: ComponentType.StringSelect,
              time: 30000,
            })
            .catch(async (e) => {
              // Handle timeout or other errors for the selection
              if (i.replied || i.deferred) {
                await i
                  .editReply({
                    content:
                      "> <a:clock:1446769163669602335> Hết thời gian chọn pet.",
                    components: [],
                  })
                  .catch(() => {});
              }
              return null;
            });

          if (!selection) return;

          // Acknowledge the selection promptly
          await selection.deferUpdate().catch(() => {});

          const selectedGroupIndex = parseInt(selection.values[0]) - 1;
          const selectedGroup = orderedGroups[selectedGroupIndex];

          if (!selectedGroup) {
            return await i
              .editReply({
                content:
                  "<a:no:1455096623804715080> Lỗi chọn pet! Pet không tồn tại.",
                components: [],
              })
              .catch(() => {});
          }

          const isGroupFavorited = selectedGroup.pets.some((p) => p.favorite);
          if (isGroupFavorited) {
            return await i
              .editReply({
                content:
                  "> <:purplestar:1455096634609500315> Loại pet **" +
                  selectedGroup.name +
                  "** đã được **Favorite**! Không thể trade. Hãy bỏ favorite trước.",
                components: [],
              })
              .catch(() => {});
          }

          const selectedTeam = actor.db.team || {};
          const selectedTeamKeys = new Set(
            [
              selectedTeam.slot1?.key,
              selectedTeam.slot2?.key,
              selectedTeam.slot3?.key,
            ].filter(Boolean),
          );
          const isGroupInTeam = selectedGroup.pets.some((p) => {
            const key = `${p.petId}_${new Date(p.createdAt).getTime()}`;
            return p.equipped || selectedTeamKeys.has(key);
          });
          if (isGroupInTeam) {
            return await i
              .editReply({
                content:
                  "> <:homeids:1474675481818300568> Loại pet **" +
                  selectedGroup.name +
                  "** đang trong **Team**! Không thể trade. Hãy gỡ khỏi team trước.",
                components: [],
              })
              .catch(() => {});
          }

          // Find first available pet in this group
          const selectedPet = selectedGroup.pets.find((p) => {
            if (p.equipped) return false;
            const key = `${p.petId}_${new Date(p.createdAt).getTime()}`;
            if (actor.pets.some((offered) => offered.key === key)) return false;
            if (selectedTeamKeys.has(key)) return false;
            return true;
          });

          if (!selectedPet) {
            return await i
              .editReply({
                content:
                  "<a:no:1455096623804715080> Không còn pet khả dụng trong nhóm này!",
                components: [],
              })
              .catch(() => {});
          }

          const createdTime = new Date(selectedPet.createdAt).getTime();
          const key = `${selectedPet.petId}_${createdTime}`;

          actor.pets.push({
            key: key,
            name: selectedPet.name,
            level: selectedPet.level,
            rarity: selectedPet.type,
            emoji: selectedGroup.emoji || "🐾",
            object: selectedPet,
          });

          actor.confirmed = false;
          other.confirmed = false;
          actor.locked = false;
          other.locked = false;

          await i
            .editReply({
              content: `<a:checkyes:1455096631555915897> Đã thêm **${selectedPet.name}**!`,
              components: [],
            })
            .catch(() => {});

          await updateTradeInterface(session);
        } catch (e) {
          logger.error("Error in trade pet selection flow:", e);
          try {
            if (i.replied || i.deferred) {
              await i
                .editReply({
                  content: `<a:no:1455096623804715080> Lỗi khi thêm pet: ${e.message}`,
                  components: [],
                })
                .catch(() => {});
            }
          } catch (err) {}
        }
        return;
      }

      // --- CLEAR OFFER ---
      if (action === "trade_clear") {
        if (actor.locked)
          return i
            .reply({
              content: "🔒 Bạn đã khóa, không thể sửa!",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => {});
        actor.money = 0;
        actor.pets = [];
        actor.confirmed = false;
        other.confirmed = false;
        await i.update({}).catch(() => {});
        await updateTradeInterface(session);
        return;
      }

      // --- LOCK ---
      if (action === "trade_lock") {
        actor.locked = !actor.locked;
        if (!actor.locked) {
          actor.confirmed = false;
          other.confirmed = false;
        }
        await i.deferUpdate().catch(() => {});
        await updateTradeInterface(session);
        return;
      }

      // --- CONFIRM ---
      if (action === "trade_confirm") {
        if (!actor.locked || !other.locked) {
          return i
            .reply({
              content:
                "<:warning:1455096625373380691> Cả hai bên phải **KHÓA (LOCK)** giao dịch trước khi xác nhận!",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => {});
        }

        actor.confirmed = true;
        await i.deferUpdate().catch(() => {});

        // Check process lock to prevent double execution (Race Condition)
        if (session.processing) return;

        if (session.p1.confirmed && session.p2.confirmed) {
          session.processing = true; // Lock
          collector.stop("completed");
          await executeTrade(session);
        } else {
          await updateTradeInterface(session);
        }
        return;
      }
    } catch (error) {
      console.error("Trade Interaction Error:", error);
    }
  });
}

/**
 * UPDATE UI
 */
async function updateTradeInterface(session) {
  const { p1, p2, msgRef } = session;

  const getStatus = (player) => {
    if (player.confirmed)
      return "> <a:checkyes:1455096631555915897> **Trạng Thái: Đã Xác Nhận**";
    if (player.locked) return "> 🔒 **Trạng Thái: Đã Khóa**";
    return "> <a:loading:1455882249374273536> *Trạng thái: Đang chọn đồ...*";
  };

  const formatOffer = (player) => {
    const moneyStr =
      player.money > 0
        ? `+ \`${player.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n`
        : "";
    const petsStr =
      player.pets.length > 0
        ? player.pets
            .map((p) => `+ ${p.emoji} **${p.name}** \`Lv.${p.level}\``)
            .join("\n")
        : "";

    if (!moneyStr && !petsStr) return "```\nTrống\n```";
    return moneyStr + petsStr;
  };

  const tradeContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# <:trade:1476448459748802601> Trading System ",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )

    // P1 Section
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <:member:1446769169738502165> **${p1.user.username.toUpperCase()}**\n${getStatus(p1)}\n${formatOffer(p1)}`,
      ),
    )

    // P2 Section
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### <:member:1446769169738502165> **${p2.user.username.toUpperCase()}**\n${getStatus(p2)}\n${formatOffer(p2)}`,
      ),
    )

    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("trade_add_money")
      .setEmoji("1456194056798339104")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("trade_add_pet")
      .setEmoji("🐾")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("trade_clear")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("trade_lock")
      .setEmoji(p1.locked ? "🔒" : "🔓")
      .setStyle(p1.locked ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("trade_confirm")
      .setEmoji("<a:checkyes:1455096631555915897>")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!p1.locked || !p2.locked),
    new ButtonBuilder()
      .setCustomId("trade_cancel")
      .setEmoji("<a:no:1455096623804715080>")
      .setStyle(ButtonStyle.Danger),
  );

  tradeContainer.addActionRowComponents(row1, row2);
  await msgRef.edit({
    components: [tradeContainer],
    flags: MessageFlags.IsComponentsV2,
  });
}

/**
 * EXECUTE & SAVE
 */
async function executeTrade(session) {
  const { p1, p2, msgRef } = session;

  try {
    // 1. REFRESH DATA (CRITICAL FIX)
    // Fetch fresh user data to ensure we are modifying the latest state.
    // This prevents VersionErrors and ensures user still has the items.
    const p1Fresh = await User.findOne({ userId: p1.user.id });
    const p2Fresh = await User.findOne({ userId: p2.user.id });

    if (!p1Fresh || !p2Fresh) {
      throw new Error("Dữ liệu người dùng không tồn tại (lỗi DB).");
    }

    // 2. RE-VALIDATE MONEY
    if (p1Fresh.money < p1.money)
      throw new Error(`${p1.user.username} không còn đủ tiền!`);
    if (p2Fresh.money < p2.money)
      throw new Error(`${p2.user.username} không còn đủ tiền!`);

    // 3. TRANSFER MONEY
    p1Fresh.money -= p1.money;
    p2Fresh.money += p1.money;

    p2Fresh.money -= p2.money;
    p1Fresh.money += p2.money;

    // 4. TRANSFER PETS FUNCTION
    const transferPetsFresh = (senderSession, senderDb, receiverDb) => {
      for (const tradePet of senderSession.pets) {
        // Find pet in FRESH DB using the unique key (constructed from properties)
        // Note: saved DB dates might differ slightly in precision, so we use string comparison or ID if available.
        // Best to rely on _id if it persists, but our 'key' was constructed from PetId + CreatedAt.

        const index = senderDb.pets.findIndex(
          (p) =>
            `${p.petId}_${new Date(p.createdAt).getTime()}` === tradePet.key,
        );

        if (index === -1) {
          throw new Error(
            `${senderSession.user.username} không còn sở hữu pet ${tradePet.name}!`,
          );
        }

        const actualPet = senderDb.pets[index];
        const isGroupFavorited = senderDb.pets.some(
          (p) =>
            (p.petId || p.name) === (actualPet.petId || actualPet.name) &&
            p.favorite,
        );
        if (isGroupFavorited) {
          throw new Error(
            `Pet **${actualPet.name}** đang Favorite, không thể trade. Hãy bỏ favorite trước.`,
          );
        }

        // Remove from Sender
        const [removedPet] = senderDb.pets.splice(index, 1);

        // Prepare for Receiver (Clone to avoid Mongoose ID collisions if sticking to same doc structure)
        // Using toObject() effectively clones it.
        // We must be careful if actualPet is a Mongoose Subdocument.
        let petToGive = removedPet;
        if (removedPet.toObject) petToGive = removedPet.toObject();

        // Reset fresh state
        petToGive.equipped = false;
        delete petToGive._id; // Ensure new ID is generated for the new owner

        receiverDb.pets.push(petToGive);
      }
    };

    // 5. EXECUTE TRANSFERS
    transferPetsFresh(p1, p1Fresh, p2Fresh);
    transferPetsFresh(p2, p2Fresh, p1Fresh);

    // 6. SAVE (Try to save both generally safely)
    // Note: There is still a tiny window where one saves and other fails,
    // but checking fresh data first minimizes this to almost zero.
    await p1Fresh.save();
    await p2Fresh.save();

    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## <a:checkyes:1455096631555915897> Thành Công <a:2giveaway:1446775157036417125> !",
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "- Tài sản đã được chuyển giao an toàn.",
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`
### - User \`${p1.user.username}\` Nhận:
> + \`${p2.money.toLocaleString()}\` coins
> + \`${p2.pets.length}\` pets

### - User \`${p2.user.username}\` Nhận:
> + \`${p1.money.toLocaleString()}\` coins
> + \`${p1.pets.length}\` pets
`),
      );

    await msgRef.edit({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error("Trade Error", error);
    const errContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## <a:no:1455096623804715080> GIAO DỊCH THẤT BẠI\n> ${error.message}`,
      ),
    );
    await msgRef.edit({
      components: [errContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } finally {
    cleanupTrade(session);
  }
}

function cleanupTrade(session) {
  activeTrades.delete(session.p1.user.id);
  activeTrades.delete(session.p2.user.id);
}
