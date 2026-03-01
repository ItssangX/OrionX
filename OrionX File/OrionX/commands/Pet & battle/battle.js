import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { User } from "../../database/models.js";
import {
  createBattle,
  getBattleByPlayer,
  removeBattle,
} from "../../utils/battleManager.js";
import {
  getActionGif,
  getPetSkill,
  SPECIAL_SKILL_COOLDOWN,
} from "../../utils/battleGifs.js";
import { findOrCreateUser } from "../../utils/userHelper.js";
import { checkTOS } from "../../utils/tosHelper.js";
import { petPool } from "../../database/petPool.js";
import { EVENT_PET } from "../../scripts/petevent.js";
import { addXPToPet, XP_PER_BATTLE } from "../../utils/petLevelSystem.js";
import { updateChecklist } from "../../utils/checklistHelper.js";
import { updateQuestProgress } from "../../utils/questHelper.js";
import { calculateReward } from "../../utils/buffHelper.js";

export default {
  name: "battle",
  aliases: ["b", "pvp", "xb"],
  description: "Chiến đấu 3v3 Tag Team (GIF)!",
  usage: "Xbattle <@user>",
  cooldown: 5,

  async execute(message, args) {
    try {
      const existingBattle = getBattleByPlayer(message.author.id);
      if (existingBattle) {
        return message.reply(
          "> <a:no:1455096623804715080> **Cảnh Báo:** Bạn đang trong trận đấu! Hãy hoàn thành trận hiện tại trước.",
        );
      }

      if (!(await checkTOS(message.author))) {
        return message.reply(
          "> <a:no:1455096623804715080> **Lỗi:** Bạn chưa chấp nhận **Điều Khoản Sử Dụng (TOS)**. Hãy dùng lệnh `Xtos` để đọc và chấp nhận trước khi chơi!",
        );
      }

      const challenger = await findOrCreateUser(
        message.author.id,
        message.author.username,
      );
      const challengerTeam = getActiveTeam(challenger);

      if (challengerTeam.length === 0) {
        return message.reply(
          `> <a:no:1455096623804715080> **Chưa có Pet!** Bạn chưa trang bị pet nào cả. Dùng \`Xequip\` để lập team!`,
        );
      }

      const target = message.mentions.users.first();
      if (target) {
        await handlePvPBattle(message, target, challenger, challengerTeam);
      } else {
        await handleRandomBattle(message, challenger, challengerTeam);
      }
    } catch (error) {
      console.error("Lỗi battle:", error);
      const existingBattle = getBattleByPlayer(message.author.id);
      if (existingBattle) removeBattle(existingBattle.battleId);
      message.reply(
        "> <a:no:1455096623804715080> **Lỗi!** Không thể khởi tạo battle.",
      );
    }
  },
};

// Get active team (array of pets)
function getActiveTeam(user) {
  const team = [];
  if (!user.pets || user.pets.length === 0) return team;

  // Check team slots
  if (user.team) {
    const slots = ["slot1", "slot2", "slot3"];
    for (const slotName of slots) {
      const slot = user.team[slotName];
      if (slot && slot.key) {
        const petDoc = user.pets.find(
          (p) => `${p.petId}_${p.createdAt.getTime()}` === slot.key,
        );
        if (petDoc) {
          const pet =
            typeof petDoc.toObject === "function"
              ? petDoc.toObject()
              : { ...petDoc };
          team.push(enrichPetData(pet));
        }
      }
    }
  }

  // If no team set up, fallback to first pet (if available) to make a 1-pet team
  if (team.length === 0) {
    const first = user.pets[0];
    if (first) {
      const pet =
        typeof first.toObject === "function" ? first.toObject() : { ...first };
      team.push(enrichPetData(pet));
    }
  }

  // Set max HP for battle (reset currentHp)
  team.forEach((p) => {
    p.currentHp = p.hp;
    p.maxHp = p.hp;
  });

  return team;
}

// Enrich pet with emoji from petPool
function enrichPetData(pet) {
  if (!pet) return null;

  const normalizeRarity = (r) => {
    if (!r) return "common";
    const low = r.toLowerCase();
    if (low === "normal") return "common";
    if (low === "legend") return "legendary";
    return low;
  };

  const rarity = normalizeRarity(pet.type);

  // Nếu là event pet, lấy emoji từ pet.emoji hoặc EVENT_PET.emoji
  if (rarity === "event") {
    pet.emoji = pet.emoji || EVENT_PET.emoji || "🐾";
  } else {
    // Find config in petPool
    let config = (petPool[rarity] || []).find((p) => p.petId === pet.petId);
    if (!config) {
      for (const r in petPool) {
        config = petPool[r].find((p) => p.petId === pet.petId);
        if (config) break;
      }
    }

    if (config) {
      pet.emoji = pet.emoji || config.emoji || "🐾";
      if (!pet.name && config.name) pet.name = config.name;
    }

    pet.emoji = pet.emoji || "🐾";
  }

  pet.name = pet.name || "Unknown Pet";
  pet.hp = pet.hp || 100;
  pet.maxHp = pet.maxHp || pet.hp;
  pet.atk = pet.atk || 10;
  pet.def = pet.def || 5;
  pet.level = pet.level || 1;
  pet.crit = pet.crit || 5;
  pet.petId = pet.petId || "unknown";

  // ENRICH WEAPON DATA (Sync with latest pool)
  if (pet.weapon && pet.weapon.id) {
    let weaponData = null;
    for (const r in petPool) {
      // Check pet pool? No, weaponPool
      // This loop was checking petPool, we need weaponPool
    }
    // Find weapon in pool
    for (const r in weaponPool) {
      const found = weaponPool[r].find((w) => w.id === pet.weapon.id);
      if (found) {
        weaponData = found;
        break;
      }
    }

    if (weaponData) {
      // Merge stats if needed, or just add effect
      pet.weapon.effect = weaponData.effect;
      pet.weapon.crit = weaponData.crit || 0;
      // Optional: User current stats or pool stats?
      // Typically equipped weapon stats are saved. Let's keep saved stats but add new properties.
      pet.weapon.emoji = weaponData.emoji; // Sync emoji
    }
  }

  return pet;
}

import { weaponPool } from "../../database/weaponPool.js";

async function handlePvPBattle(message, target, challenger, challengerTeam) {
  if (target.id === message.author.id) {
    return message.reply(
      "> <a:no:1455096623804715080> Không thể tự thách đấu chính mình!",
    );
  }
  if (target.bot) {
    return message.reply(
      "> <a:no:1455096623804715080> Không thể thách đấu **bot**!",
    );
  }

  const defender = await findOrCreateUser(target.id, target.username);
  const defenderTeam = getActiveTeam(defender);

  if (defenderTeam.length === 0) {
    return message.reply(
      `> <a:no:1455096623804715080> **${target.username}** chưa có pet nào hoặc chưa trang bị team!`,
    );
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor("#F1C40F")
    .setTitle("⚔️ Battle ⚔️ ")
    .setDescription(
      `> - **${challenger.username}** muốn thách đấu **${target.username}**!\n` +
      `> - 👥 Thể thức: **3v3 Tag Team**\n\n` +
      `**${target.username}**, bạn có chấp nhận trận đấu không?`,
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pvp_accept")
      .setLabel("Chấp Nhận")
      .setStyle(ButtonStyle.Success)
      .setEmoji("⚔️"),
    new ButtonBuilder()
      .setCustomId("pvp_decline")
      .setLabel("Từ chối ")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌"),
  );

  const reply = await message.reply({
    content: `<@${target.id}>`,
    embeds: [confirmEmbed],
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.user.id === target.id,
    time: 60000,
    max: 1,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "pvp_accept") {
      const player1 = {
        id: message.author.id,
        username:
          message.author.username ||
          message.author.displayName ||
          challenger.username ||
          "Player 1",
      };
      const player2 = {
        id: target.id,
        username:
          target.username ||
          target.displayName ||
          defender.username ||
          "Player 2",
      };

      const battle = createBattle(
        player1,
        player2,
        challengerTeam,
        defenderTeam,
      );

      const acceptedEmbed = new EmbedBuilder()
        .setColor("#2ECC71")
        .setTitle("✅ THÁCH ĐẤU ĐƯỢC CHẤP NHẬN")
        .setDescription(
          `> Trận đấu giữa **${challenger.username}** và **${target.username}** đang bắt đầu!`,
        );

      await i.update({ embeds: [acceptedEmbed], components: [] });

      await startBattleInterface(message, battle, false);
    } else {
      await i.update({
        content: "❌ **Lời thách đấu đã bị từ chối.**",
        components: [],
        embeds: [],
      });
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      reply
        .edit({
          content:
            "<a:clock:1446769163669602335> **Hết thời gian chờ phản hồi.**",
          components: [],
          embeds: [],
        })
        .catch(() => { });
    }
  });
}

async function handleRandomBattle(message, challenger, challengerTeam) {
  try {
    const randomUsers = await User.aggregate([
      {
        $match: {
          userId: { $ne: message.author.id },
          pets: { $exists: true, $not: { $size: 0 } },
        },
      },
      { $sample: { size: 1 } },
    ]);

    if (randomUsers.length > 0) {
      const randomUser = randomUsers[0];
      const team = getActiveTeam(randomUser);

      if (team.length > 0) {
        let opponentName = randomUser.username || "Unknown Opponent";

        if (opponentName.startsWith("User_") && message.client) {
          try {
            const freshUser = await message.client.users.fetch(
              randomUser.userId,
            );
            if (freshUser) {
              opponentName = freshUser.username;
              await User.updateOne(
                { userId: randomUser.userId },
                { $set: { username: opponentName } },
              );
            }
          } catch (e) { }
        }

        const botUser = {
          id: "bot_ai",
          username: opponentName,
          bot: true,
          originalId: randomUser.userId,
        };

        const player1 = {
          id: message.author.id,
          username:
            message.author.username ||
            message.author.displayName ||
            challenger.username ||
            "Player 1",
        };

        const battle = createBattle(player1, botUser, challengerTeam, team);
        return await startBattleInterface(message, battle, true);
      }
    }
  } catch (err) {
    console.error("Error getting random user match:", err);
  }

  const botName = `Bot_${Math.floor(Math.random() * 1000)}`;
  const botUser = { id: "bot_ai", username: botName, bot: true };
  const opponentTeam = generateRandomTeam(challengerTeam);

  const player1 = {
    id: message.author.id,
    username:
      message.author.username || message.author.displayName || "Player 1",
  };

  const battle = createBattle(player1, botUser, challengerTeam, opponentTeam);
  await startBattleInterface(message, battle, true);
}

function generateRandomTeam(playerTeam) {
  const teamSize = playerTeam.length;
  const team = [];
  const avgLevel = Math.floor(
    playerTeam.reduce((sum, p) => sum + p.level, 0) / teamSize,
  );

  for (let i = 0; i < teamSize; i++) {
    team.push(generateRandomPet(avgLevel));
  }
  return team;
}

function generateRandomPet(levelBase) {
  const rarities = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "mythic",
    "legendary",
  ];

  const rand = Math.random() * 100;
  let rarity = "common";
  if (rand > 99) rarity = "legendary";
  else if (rand > 95) rarity = "mythic";
  else if (rand > 85) rarity = "epic";
  else if (rand > 70) rarity = "rare";
  else if (rand > 40) rarity = "uncommon";

  const pool = petPool[rarity] || petPool["common"];
  const base = pool[Math.floor(Math.random() * pool.length)] || pool[0];
  const varM = 0.8 + Math.random() * 0.4;

  const level = Math.max(1, levelBase + Math.floor(Math.random() * 3) - 1);
  const hpBase = (base.hp || 100) + level * 20;
  const atkBase = (base.atk || 10) + level * 5;

  const hp = Math.floor(hpBase * varM);
  const atk = Math.floor(atkBase * varM);
  const def = Math.floor((base.def || 10) * varM + level * 2);

  return {
    petId: base.petId || "wild",
    name: base.name || "Wild Pet",
    emoji: base.emoji || "🐾",
    type: rarity,
    level: level,
    hp: hp,
    atk: atk,
    def: def,
    crit: 5 + Math.floor(Math.random() * 10),
    currentHp: hp,
    maxHp: hp,
    weapon: null,
  };
}

async function startBattleInterface(message, battle, isAI = false) {
  let battleMsg = null;
  const isUnknownMessageReference = (err) => {
    if (!err) return false;
    const msg = err?.message || "";
    if (msg.includes("MESSAGE_REFERENCE_UNKNOWN_MESSAGE")) return true;
    const refErrors = err?.rawError?.errors?.message_reference;
    if (
      refErrors &&
      JSON.stringify(refErrors).includes("MESSAGE_REFERENCE_UNKNOWN_MESSAGE")
    ) {
      return true;
    }
    return false;
  };

  const sendBattleMessage = async (options) => {
    try {
      return await message.reply(options);
    } catch (err) {
      if (isUnknownMessageReference(err) && message.channel) {
        return await message.channel.send(options);
      }
      throw err;
    }
  };

  const createEmbed = (state, gif = null) => {
    const activeP1 = state.turn === 1;
    const logs = state.battleLog.slice(-3).join("\n") || "Trận đấu bắt đầu!";

    const hpBar = (current, max) => {
      const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
      const filled = Math.round(pct / 10);
      const empty = 10 - filled;
      const bar = "▰".repeat(filled) + "▱".repeat(empty);
      return `${bar} ${pct}%`;
    };

    const p1 = state.pet1;
    const p2 = state.pet2;
    const skill1 = getPetSkill(p1.petId);
    const skill2 = getPetSkill(p2.petId);

    let description = "";
    description += `### 📜 Battle Log\n`;
    description +=
      logs
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n") + "\n\n";

    const getBench = (team, activeIndex) => {
      const nextPets = team
        .slice(activeIndex + 1)
        .map((p) => `${p.emoji} ${p.name}`);
      return nextPets.length > 0 ? nextPets.join(" | ") : "🚫 *Hết pet*";
    };

    const p1Name = p1.name || "Unknown Pet";
    const p1Emoji = p1.emoji || "🐾";
    const p1Level = p1.level || 1;
    const p1Atk = p1.atk || 10;
    const p1Def = p1.def || 5;
    const p1Crit = p1.crit || 5;
    const p1CurrentHp = p1.currentHp ?? p1.hp ?? 100;
    const p1MaxHp = p1.maxHp ?? p1.hp ?? 100;

    const p2Name = p2.name || "Unknown Pet";
    const p2Emoji = p2.emoji || "🐾";
    const p2Level = p2.level || 1;
    const p2Atk = p2.atk || 10;
    const p2Def = p2.def || 5;
    const p2Crit = p2.crit || 5;
    const p2CurrentHp = p2.currentHp ?? p2.hp ?? 100;
    const p2MaxHp = p2.maxHp ?? p2.hp ?? 100;

    description += `### 🟦 ${p1Emoji} ${p1Name} (Lv.${p1Level})\n`;
    if (p1.weapon && p1.weapon.id) {
      const wEmoji = p1.weapon.emoji || "🗡️";
      const wName = p1.weapon.name || "Unknown Weapon";
      description += `> 🗡️ **Wp:** ${wEmoji} ${wName}\n`;
    }
    const bar1 = hpBar(p1CurrentHp, p1MaxHp);
    const [barOnly1, percent1] = bar1.split(" ");

    description += `> ❤️ **HP**: \`${barOnly1} ${percent1}\`\n`;

    description += `> ⚔️ **ATK:** \`${p1Atk}\` ┃ 🛡️ **DEF:** \`${p1Def}\` ┃ 💥 **CRIT:** \`${p1Crit}%\`\n`;
    description += `> ✨ **Skill:** \`${skill1?.name || "Power Strike"}\` ┃ 👥 **Pets:** \`${state.team1Remaining || 0}\` remain\n`;
    description += `> 🎒 **Dự bị:** ${getBench(battle.team1, state.activePetIndex1)}\n\n`;

    description += `### 🟥 ${p2Emoji} ${p2Name} (Lv.${p2Level})\n`;
    if (p2.weapon && p2.weapon.id) {
      const wEmoji = p2.weapon.emoji || "🗡️";
      const wName = p2.weapon.name || "Unknown Weapon";
      description += `> 🗡️ **Wp:** ${wEmoji} ${wName}\n`;
    }
    const bar2 = hpBar(p2CurrentHp, p2MaxHp);
    const [barOnly2, percent2] = bar2.split(" ");

    description += `> ❤️ **HP**: \`${barOnly2} ${percent2}\`\n`;

    description += `> ⚔️ **ATK:** \`${p2Atk}\` ┃ 🛡️ **DEF:** \`${p2Def}\` ┃ 💥 **CRIT:** \`${p2Crit}%\`\n`;
    description += `> ✨ **Skill:** \`${skill2?.name || "Power Strike"}\` ┃ 👥 **Pets:** \`${state.team2Remaining || 0}\` remain\n`;
    description += `> 🎒 **Dự bị:** ${getBench(battle.team2, state.activePetIndex2)}\n`;

    const player1Name = battle.player1?.username || "Player 1";
    const player2Name = battle.player2?.username || "Player 2";
    const turnCount = state.turnCount || 1;

    const embed = new EmbedBuilder()
      .setColor(activeP1 ? "#3498DB" : "#E74C3C")
      .setTitle(
        `<:Battle:1470101035392565299> **${player1Name}** <:VS:1470101037082738792> **${player2Name}** <:Battle:1470101035392565299>`,
      )
      .setDescription(description)
      .setFooter({
        text: `Turn ${turnCount} - ${activeP1 ? player1Name : player2Name}'s turn`,
      })
      .setTimestamp()
      .setThumbnail(
        "https://media.discordapp.net/attachments/1429068134668832848/1470118779194310779/ChatGPT_Image_02_54_04_9_thg_2_2026.png?ex=698a224e&is=6988d0ce&hm=9d1772dcdccb1b1d73642b043588b4c2f4585e1eed18b2f1befc14b2dbbdc55c&=&format=webp&quality=lossless&width=799&height=799",
      );

    if (gif) {
      embed.setImage(gif);
    }

    return embed;
  };

  const createButtons = (state, isAuto = false) => {
    const cd =
      state.turn === 1 ? state.pet1SkillCooldown : state.pet2SkillCooldown;
    const defCD =
      state.turn === 1 ? state.pet1DefendCooldown : state.pet2DefendCooldown;
    const currentPet = state.turn === 1 ? state.pet1 : state.pet2;
    const skill = getPetSkill(currentPet.petId);

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("battle_attack")
        .setLabel("⚔️ Attack")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isAuto),
      new ButtonBuilder()
        .setCustomId("battle_skill")
        .setLabel(`✨ ${skill.name}${cd > 0 ? ` (${cd})` : ""}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(cd > 0 || isAuto),
      new ButtonBuilder()
        .setCustomId("battle_defend")
        .setLabel(`🛡️ Defend${defCD > 0 ? ` (${defCD})` : ""}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(defCD > 0 || isAuto),
      new ButtonBuilder()
        .setCustomId("battle_skip")
        .setLabel(isAuto ? "🛑 Stop Auto" : "⏭️ Auto")
        .setStyle(isAuto ? ButtonStyle.Danger : ButtonStyle.Primary),
    );
  };

  const state = battle.getState();
  const startGif = getActionGif("start");
  const initialEmbed = createEmbed(state, startGif);
  const buttons = createButtons(state);

  battleMsg = await sendBattleMessage({
    embeds: [initialEmbed],
    components: [buttons],
  });
  battle.message = battleMsg;

  const collector = battleMsg.createMessageComponentCollector({
    filter: (i) =>
      i.user.id === battle.player1.id ||
      (battle.player2.id !== "bot_ai" && i.user.id === battle.player2.id),
    time: 300000,
  });

  let autoMode = false;
  let autoInterval = null;

  const runAutoTurn = async () => {
    if (!battle.isActive) {
      if (autoInterval) clearInterval(autoInterval);
      return;
    }

    let batchSize = 1;
    if (battle.turnCount >= 100) batchSize = 50;
    else if (battle.turnCount >= 30) batchSize = 10;
    else if (battle.turnCount >= 20) batchSize = 5;
    else if (battle.turnCount >= 10) batchSize = 4;
    else if (battle.turnCount >= 5) batchSize = 2;

    let result = { success: true };

    for (let i = 0; i < batchSize; i++) {
      const currentPlayerId =
        battle.turn === 1 ? battle.player1.id : battle.player2.id;
      const action = getAutoAction(battle);
      result = battle.executeAction(currentPlayerId, action);

      if (!result.success || result.battleEnded) break;
    }

    const newState = battle.getState();
    const actionGif = getActionGif(
      newState.lastAction?.type || "attack",
      newState.lastAction?.petId,
    );
    const newEmbed = createEmbed(newState, actionGif);

    try {
      if (result.battleEnded) {
        if (autoInterval) clearInterval(autoInterval);
        collector.stop();
        await handleEnd(message, battle, result.winner);
      } else {
        await battleMsg
          .edit({
            embeds: [newEmbed],
            components: [createButtons(newState, true)],
          })
          .catch(() => { });
      }
    } catch (err) {
      console.error("Auto battle error:", err);
      if (autoInterval) clearInterval(autoInterval);
      removeBattle(battle.battleId);
    }
  };

  collector.on("collect", async (i) => {
    try {
      await i.deferUpdate().catch(() => { });

      const isPlayerTurn =
        (battle.turn === 1 && i.user.id === battle.player1.id) ||
        (battle.turn === 2 && i.user.id === battle.player2.id);

      if (i.customId === "battle_skip") {
        if (autoMode) {
          autoMode = false;
          if (autoInterval) clearInterval(autoInterval);
          await battleMsg
            .edit({
              components: [createButtons(battle.getState(), false)],
            })
            .catch(() => { });
          await i
            .followUp({
              content: "🛑 Đã dừng Auto Battle!",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => { });
        } else {
          autoMode = true;
          await battleMsg
            .edit({
              components: [createButtons(battle.getState(), true)],
            })
            .catch(() => { });
          await i
            .followUp({
              content: "<a:checkyes:1455096631555915897> Đã bật chế độ **Auto Battle** !",
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => { });

          autoInterval = setInterval(runAutoTurn, 4000);
          runAutoTurn();
        }
        return;
      }

      const isAIOpponent = battle.player2.id === "bot_ai";

      if (isPlayerTurn) {
        let action = "attack";
        if (i.customId === "battle_attack") action = "attack";
        else if (i.customId === "battle_skill") action = "skill";
        else if (i.customId === "battle_defend") action = "defend";

        const result = battle.executeAction(i.user.id, action);

        if (!result.success) {
          await i
            .followUp({
              content: `❌ ${result.message}`,
              flags: [MessageFlags.Ephemeral],
            })
            .catch(() => { });
          return;
        }

        const newState = battle.getState();
        const actionGif = getActionGif(
          newState.lastAction?.type || "attack",
          newState.lastAction?.petId,
        );
        const newEmbed = createEmbed(newState, actionGif);

        if (result.battleEnded) {
          collector.stop();
          await handleEnd(message, battle, result.winner);
          return;
        }

        await battleMsg
          .edit({
            embeds: [newEmbed],
            components: [createButtons(newState)],
          })
          .catch(() => { });

        if (isAIOpponent && battle.isActive) {
          setTimeout(async () => {
            if (!battle.isActive) return;

            const aiAction = getAutoAction(battle);
            const aiResult = battle.executeAction("bot_ai", aiAction);

            const aiState = battle.getState();
            const aiGif = getActionGif(
              aiState.lastAction?.type || "attack",
              aiState.lastAction?.petId,
            );
            const aiEmbed = createEmbed(aiState, aiGif);

            if (aiResult.battleEnded) {
              collector.stop();
              await handleEnd(message, battle, aiResult.winner);
            } else {
              await battleMsg
                .edit({
                  embeds: [aiEmbed],
                  components: [createButtons(aiState)],
                })
                .catch(() => { });
            }
          }, 3000);
        }
      } else {
        await i
          .followUp({
            content: "❌ Chưa đến lượt của bạn!",
            flags: [MessageFlags.Ephemeral],
          })
          .catch(() => { });
      }
    } catch (err) {
      console.error("Interaction error in battle.js:", err);
    }
  });

  collector.on("end", (collected, reason) => {
    if (autoInterval) clearInterval(autoInterval);

    if (reason === "time" && battle.isActive) {
      removeBattle(battle.battleId);
      const timeoutEmbed = new EmbedBuilder()
        .setColor("#808080")
        .setTitle("<a:clock:1446769163669602335> Hết Thời Gian")
        .setDescription("Trận đấu đã bị hủy do không có phản hồi.")
        .setTimestamp();
      battleMsg
        .edit({ embeds: [timeoutEmbed], components: [] })
        .catch(() => { });
    }
  });
}

function getAutoAction(battle) {
  const state = battle.getState();
  const pet = state.turn === 1 ? state.pet1 : state.pet2;
  const hpPct = pet.currentHp / pet.maxHp;
  const skillCD =
    state.turn === 1 ? state.pet1SkillCooldown : state.pet2SkillCooldown;
  const defCD =
    state.turn === 1 ? state.pet1DefendCooldown : state.pet2DefendCooldown;

  if (skillCD === 0 && Math.random() > 0.7) return "skill";
  if (hpPct < 0.3 && defCD === 0 && Math.random() > 0.6) return "defend";

  return "attack";
}

async function handleEnd(message, battle, winner) {
  const winnerId = winner ? winner.id : null;
  const isPvE = battle.player2.id === "bot_ai";

  const winnerName = winner?.username || "Winner";
  const player1Name = battle.player1?.username || "Player 1";
  const player2Name = battle.player2?.username || "Player 2";

  // Checklist update
  if (battle.player1.id !== "bot_ai")
    await updateChecklist(battle.player1.id, "battle");
  if (battle.player2.id !== "bot_ai")
    await updateChecklist(battle.player2.id, "battle");

  if (winnerId && winnerId !== "bot_ai") {
    await updateQuestProgress(winnerId, "battle_wins", 1);
  }

  const p1TeamResults = [];
  for (const pet of battle.team1) {
    const res = await awardXPToPet(battle.player1.id, pet);
    if (res) p1TeamResults.push(res);
  }

  const resultGif =
    winnerId === battle.player1.id
      ? getActionGif("victory")
      : winnerId
        ? getActionGif("defeat")
        : getActionGif("start");

  const embed = new EmbedBuilder().setImage(resultGif).setTimestamp();

  if (winnerId) {
    const loser =
      winnerId === battle.player1.id ? battle.player2 : battle.player1;
    const loserName = loser?.username || "Loser";
    const winUser = await findOrCreateUser(winnerId, winnerName);

    if (winUser && winnerId !== "bot_ai") {
      winUser.battleWinStreak = (winUser.battleWinStreak || 0) + 1;
      winUser.totalBattleWins = (winUser.totalBattleWins || 0) + 1;
      if (winUser.battleWinStreak > (winUser.maxBattleWinStreak || 0))
        winUser.maxBattleWinStreak = winUser.battleWinStreak;

      const baseReward = isPvE ? 25000 : 50000;
      const { total: reward, bonus: buffBonus } = calculateReward(winUser, baseReward, 'battle');
      winUser.money += reward;
      await winUser.save();

      let desc = `### <a:2giveaway:1446775157036417125> Chiến Thắng!\n`;
      desc += `> 🏆 **Winner:** ${winnerName}\n`;
      desc += `> 💀 **Loser:** ${loserName}\n\n`;
      desc += `### <a:gift:1446769608580399154> Phần Thưởng\n`;
      desc += `> <a:pixelcoin:1456194056798339104> **Tiền:** \`+${reward.toLocaleString()}\`${buffBonus > 0 ? ` (Buff: +\`${buffBonus.toLocaleString()}\`)` : ""}\n`;
      desc += `> <:fire_:1476463412723716257> **Chuỗi thắng:** \`${winUser.battleWinStreak}\` *(Cao nhất: ${winUser.maxBattleWinStreak || winUser.battleWinStreak})*\n`;

      if (p1TeamResults.length > 0) {
        desc += `\n### 📈 Kinh Nghiệm\n`;
        p1TeamResults.slice(0, 3).forEach((res) => {
          const petName = res.name || "Pet";
          const xpText = res.xpAwarded || XP_PER_BATTLE;
          desc += `> **${petName}:** +${xpText} XP ${res.xpBuffed ? `(Buff: x${res.xpMultValue})` : ""} ${res.leveledUp ? `✨ **Lv.${res.level}**` : ""}\n`;
        });
      }

      embed
        .setColor("#2ECC71")
        .setTitle("🏆 **Battle END** 🏆")
        .setDescription(desc)
        .setThumbnail(
          "https://media.discordapp.net/attachments/1429068134668832848/1470118779194310779/ChatGPT_Image_02_54_04_9_thg_2_2026.png?ex=698a224e&is=6988d0ce&hm=9d1772dcdccb1b1d73642b043588b4c2f4585e1eed18b2f1befc14b2dbbdc55c&=&format=webp&quality=lossless&width=799&height=799",
        );
    } else {
      let desc = `### 💀 Thua Cuộc\n`;
      desc += `> 🏆 **Winner:** ${winnerName}\n`;
      desc += `> <a:lightbulb:1455096627894423637> *Hãy cố gắng lần sau!*\n`;
      if (p1TeamResults.length > 0) {
        desc += `\n### 📈 Kinh Nghiệm\n`;
        p1TeamResults.slice(0, 3).forEach((res) => {
          const petName = res.name || "Pet";
          desc += `> **${petName}:** +${XP_PER_BATTLE / 2} XP\n`;
        });
      }
      embed
        .setColor("#E74C3C")
        .setTitle("💀 **Battle END** 💀 ")
        .setDescription(desc)
        .setThumbnail(
          "https://media.discordapp.net/attachments/1429068134668832848/1470118779194310779/ChatGPT_Image_02_54_04_9_thg_2_2026.png?ex=698a224e&is=6988d0ce&hm=9d1772dcdccb1b1d73642b043588b4c2f4585e1eed18b2f1befc14b2dbbdc55c&=&format=webp&quality=lossless&width=799&height=799",
        );
    }

    if (loser.id !== "bot_ai") {
      const loseUser = await findOrCreateUser(loser.id, loserName);
      if (loseUser) {
        loseUser.battleWinStreak = 0;
        await loseUser.save();
      }
    }
  } else {
    let desc = `### ⚔️ HÒA ⚔️\n`;
    desc += `> Cả hai bên đều không thể hạ gục đối phương!\n`;
    embed
      .setColor("#F1C40F")
      .setTitle("⚔️ **Battle END** ⚔️")
      .setDescription(desc)
      .setThumbnail(
        "https://media.discordapp.net/attachments/1429068134668832848/1470118779194310779/ChatGPT_Image_02_54_04_9_thg_2_2026.png?ex=698a224e&is=6988d0ce&hm=9d1772dcdccb1b1d73642b043588b4c2f4585e1eed18b2f1befc14b2dbbdc55c&=&format=webp&quality=lossless&width=799&height=799",
      );
  }

  try {
    if (battle.message)
      await battle.message.edit({ embeds: [embed], components: [] });
  } catch (e) {
    console.error("Error updating battle end message:", e);
  }

  removeBattle(battle.battleId);
}

async function awardXPToPet(userId, battlePet) {
  if (userId === "bot_ai") return null;

  const userData = await User.findOne({ userId });
  if (!userData || !userData.pets) return null;

  const petKey = `${battlePet.petId}_${new Date(battlePet.createdAt).getTime()}`;
  const realPet = userData.pets.find(
    (p) => `${p.petId}_${p.createdAt.getTime()}` === petKey,
  );

  if (realPet) {
    // Check for xpMultiplier buff
    let xpAmount = XP_PER_BATTLE;
    let xpBuffed = false;
    let xpMultValue = 1;
    if (
      userData.buffs?.xpMultiplier?.expireAt &&
      new Date() < new Date(userData.buffs.xpMultiplier.expireAt)
    ) {
      xpMultValue = userData.buffs.xpMultiplier.value || 1;
      xpAmount = Math.floor(XP_PER_BATTLE * xpMultValue);
      xpBuffed = xpMultValue > 1;
    }

    const result = addXPToPet(realPet, xpAmount);
    userData.markModified("pets");
    await userData.save();
    return {
      name: realPet.name,
      leveledUp: result.leveledUp,
      level: realPet.level,
      xpAwarded: xpAmount,
      xpBuffed,
      xpMultValue,
    };
  }

  return null;
}
