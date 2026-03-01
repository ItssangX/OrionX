
import { getPetSkill, SPECIAL_SKILL_COOLDOWN } from './battleGifs.js';

export class BattleManager {
  constructor(player1, player2, team1, team2) {
    this.player1 = player1;
    this.player2 = player2;
    this.team1 = team1; // Array of pets
    this.team2 = team2; // Array of pets

    this.activePetIndex1 = 0;
    this.activePetIndex2 = 0;

    this.turn = 1; // 1 = player1, 2 = player2
    this.turnCount = 1;

    // Cooldowns now need to track per pet or just active slot?
    // Simplest: Track cooldowns for the *current* active pet interaction
    this.pet1SkillCooldown = 0;
    this.pet2SkillCooldown = 0;
    this.pet1DefendCooldown = 0;
    this.pet2DefendCooldown = 0;

    this.battleLog = [];
    this.winner = null;
    this.isActive = true;
    this.lastAction = null; // Stored for GIF display { type: 'attack', petKey: '...' }
  }

  get pet1() {
    return this.team1[this.activePetIndex1];
  }

  get pet2() {
    return this.team2[this.activePetIndex2];
  }

  getState() {
    return {
      pet1: this.pet1,
      pet2: this.pet2,
      team1Remaining: this.team1.length - this.activePetIndex1,
      team2Remaining: this.team2.length - this.activePetIndex2,
      activePetIndex1: this.activePetIndex1,
      activePetIndex2: this.activePetIndex2,
      turn: this.turn,
      turnCount: this.turnCount,
      battleLog: this.battleLog,
      pet1SkillCooldown: this.pet1SkillCooldown,
      pet2SkillCooldown: this.pet2SkillCooldown,
      pet1DefendCooldown: this.pet1DefendCooldown,
      pet2DefendCooldown: this.pet2DefendCooldown,
      winner: this.winner,
      lastAction: this.lastAction
    };
  }

  executeAction(playerId, action) {
    if (!this.isActive) return { success: false, message: 'Battle ended' };

    const isPlayer1 = playerId === this.player1.id;
    if ((isPlayer1 && this.turn !== 1) || (!isPlayer1 && this.turn !== 2)) {
      return { success: false, message: 'Not your turn' };
    }

    const attacker = isPlayer1 ? this.pet1 : this.pet2;
    const defender = isPlayer1 ? this.pet2 : this.pet1;
    const prefix = isPlayer1 ? '🟦' : '🟥';

    // --- 0. CHECK STUN/FREEZE ---
    if (attacker.stunned) {
      attacker.stunned = false; // Reset stun
      this.battleLog.push(`${prefix} ❄️ **${attacker.name}** đã bị đóng băng và mất lượt!`);
      this.advanceTurn(isPlayer1);
      return { success: true, message: 'Stunned' };
    }

    let damage = 0;
    let logMsg = '';
    let actionType = 'attack';
    let isCrit = false;
    let isMiss = false;

    // Weapon Effects Data
    const atkWeapon = attacker.weapon || null;
    const defWeapon = defender.weapon || null;

    // --- ACTION LOGIC ---
    if (action === 'attack') {
      const hitChance = Math.random();
      // Miss chance logic (simplified)
      if (hitChance < 0.05) { // 5% miss base
        isMiss = true;
        logMsg = `${prefix} **${attacker.name}** đánh trượt!`;
        actionType = 'miss';
      } else {
        // 1. Base Calcs
        let critChance = (attacker.crit || 5) + (atkWeapon?.crit || 0);

        // Effect: Crit Boost
        if (atkWeapon?.effect?.type === 'crit_boost') critChance += atkWeapon.effect.value;

        isCrit = Math.random() * 100 < critChance;

        // Base Damage
        let rawDmg = attacker.atk;

        // 2. Weapon Multipliers
        // Weapon Boost (Base 20% boost just for having a weapon, rare+ gets more?) -> Old logic was x1.5. Let's keep x1.2 for balancing
        if (atkWeapon) rawDmg *= 1.2;

        // Effect: Execute (Low HP Boost)
        const targetHpPercent = (defender.currentHp / defender.maxHp) * 100;
        if (atkWeapon?.effect?.type === 'execute' && targetHpPercent < 30) {
          rawDmg *= atkWeapon.effect.value;
        }

        // 3. Crit Multiplier
        if (isCrit) {
          rawDmg *= 1.5;
        }

        // 4. Defense Reduction
        let defValue = defender.def;
        // Effect: Ignore Def / Magic Pierce
        if (atkWeapon?.effect?.type === 'ignore_def' || atkWeapon?.effect?.type === 'magic_pierce') {
          const pierceVal = atkWeapon.effect.value || 0;
          defValue = Math.max(0, defValue * (1 - pierceVal / 100));
        }

        damage = Math.max(1, rawDmg - (defValue * 0.4)); // Dmg Formula

        // 5. Defender Mitigation (Shields)
        if (defWeapon?.effect?.type === 'shield') {
          const reduction = defWeapon.effect.value || 0;
          damage *= (1 - reduction / 100);
          // Log shield block?
        }

        damage = Math.floor(damage);

        // --- LOG ASSIGNMENT ---
        const wEmoji = atkWeapon ? (atkWeapon.emoji || '🗡️') : '👊';
        if (isCrit) {
          const critMsg = atkWeapon?.effect?.type === 'execute' && targetHpPercent < 30 ? ' ☠️ **EXECUTE!**' : ' 🔥 **CRITICAL!**';
          logMsg = `${prefix}${critMsg} **${attacker.name}** dùng ${wEmoji} gây **${damage}** sát thương!`;
          actionType = 'crit';
        } else {
          logMsg = `${prefix} **${attacker.name}** dùng ${wEmoji} gây **${damage}** sát thương.`;
          actionType = 'attack';
        }

        // --- ATTACK EFFECTS ---
        // Lifesteal / Vampire
        if (atkWeapon?.effect?.type === 'lifesteal' || atkWeapon?.effect?.type === 'vampire') {
          const stealPct = atkWeapon.effect.value || 0;
          const healAmount = Math.floor(damage * (stealPct / 100));
          if (healAmount > 0) {
            attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
            logMsg += ` (🩸 +${healAmount} HP)`;
          }
        }

        // Stun / Freeze chance
        if (atkWeapon?.effect?.type === 'stun' || atkWeapon?.effect?.type === 'freeze') {
          const chance = atkWeapon.effect.chance || 0;
          if (Math.random() * 100 < chance) {
            defender.stunned = true;
            logMsg += `\n> ❄️ **${defender.name}** đã bị ĐÓNG BĂNG!`;
          }
        }

        // Burn / Poison / Elemental
        if (atkWeapon?.effect?.type === 'burn' || atkWeapon?.effect?.type === 'poison') {
          const bonusDmg = atkWeapon.effect.value || 0;
          damage += bonusDmg; // Instant elemental dmg for simplicity
          logMsg += ` ${atkWeapon.effect.type === 'burn' ? '🔥' : '🧪'} +${bonusDmg}`;
        }

        // Reflect (Defender Effect)
        if (defWeapon?.effect?.type === 'reflect') {
          const reflectPct = defWeapon.effect.value || 0;
          const reflectDmg = Math.floor(damage * (reflectPct / 100));
          if (reflectDmg > 0) {
            attacker.currentHp = Math.max(0, attacker.currentHp - reflectDmg);
            logMsg += `\n> ↩️ **${defender.name}** phản lại **${reflectDmg}** sát thương!`;
          }
        }
      }

    } else if (action === 'skill') {
      const cd = isPlayer1 ? this.pet1SkillCooldown : this.pet2SkillCooldown;
      if (cd > 0) return { success: false, message: 'Skill on cooldown' };

      const skill = getPetSkill(attacker.petId);
      let rawDmg = Math.max(1, attacker.atk * skill.damage - (defender.def * 0.3));

      // Weapon Boost for Skill (Less than normal atk)
      if (atkWeapon) rawDmg *= 1.1;

      // Effect: Magic Wand / Staff boost turn heal?
      if (atkWeapon?.effect?.type === 'heal_turn') {
        const healVal = atkWeapon.effect.value || 0;
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healVal);
        // Silent heal or add to log
      }

      damage = Math.floor(rawDmg);
      logMsg = `${prefix} ✨ **${attacker.name}** dùng **${skill.name}**! Gây **${damage}** sát thương!`;
      actionType = 'skill';

      if (isPlayer1) this.pet1SkillCooldown = SPECIAL_SKILL_COOLDOWN + 1;
      else this.pet2SkillCooldown = SPECIAL_SKILL_COOLDOWN + 1;

    } else if (action === 'defend') {
      const cd = isPlayer1 ? this.pet1DefendCooldown : this.pet2DefendCooldown;
      if (cd > 0) return { success: false, message: 'Defend on cooldown' };

      // Heal 15% HP
      const heal = Math.floor(attacker.maxHp * 0.15);
      attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + heal);

      logMsg = `${prefix} 🛡️ **${attacker.name}** phòng thủ và hồi **${heal}** HP!`;
      actionType = 'defend';

      if (isPlayer1) this.pet1DefendCooldown = 4;
      else this.pet2DefendCooldown = 4;
    }

    // Apply main damage
    if (damage > 0) {
      defender.currentHp -= damage;
    }

    this.battleLog.push(logMsg);

    // Save info for GIF
    this.lastAction = {
      type: actionType,
      petId: attacker.petId,
      attackerName: attacker.name
    };

    // --- CHECK DEATH & SWITCH LOGIC ---
    if (defender.currentHp <= 0) {
      defender.currentHp = 0;
      this.battleLog.push(`💀 **${defender.name} đã gục ngã!**`);

      // Effect: Revive (Phoenix Bow)
      if (defWeapon?.effect?.type === 'revive' && Math.random() * 100 < (defWeapon.effect.chance || 0)) {
        const reviveHp = Math.floor(defender.maxHp * 0.3);
        defender.currentHp = reviveHp;
        this.battleLog.push(`🐦 🔥 **${defender.name}** đã TÁI SINH từ tro tàn với ${reviveHp} HP!`);
        // Continue battle
      } else {
        // Handle Death
        this.handlePetDeath(isPlayer1);
        // If battle ended in handlePetDeath, return result
        if (!this.isActive) {
          return { success: true, winner: this.winner, battleEnded: true };
        }
        // If switched, turn continues? No, let's end turn to be fair.
      }
    }

    // Check Attacker Death (Reflection)
    if (attacker.currentHp <= 0) {
      this.battleLog.push(`💀 **${attacker.name} đã gục ngã do phản đòn!**`);
      this.handlePetDeath(!isPlayer1); // Opponent of isPlayer1 is defender, so !isPlayer1 is attacker? No.
      // handlePetDeath arg is "who died". 
      // My helper handlePetDeath(isPlayer1) means "Player 1's opponent died"? No wait used above logic.
      // Let's refine helper or inline.
    }

    if (!this.isActive) return { success: true, winner: this.winner, battleEnded: true };

    this.advanceTurn(isPlayer1);
    return { success: true };
  }

  // Helper to switch pets on death
  handlePetDeath(isAttackerPlayer1) {
    // If isAttackerPlayer1 is TRUE, then DEFENDER died.
    // Defender is Player 2.
    const deadPlayerIsPlayer1 = !isAttackerPlayer1;

    const defenderTeam = deadPlayerIsPlayer1 ? this.team1 : this.team2;
    let defenderIndex = deadPlayerIsPlayer1 ? this.activePetIndex1 : this.activePetIndex2;

    const nextIndex = defenderIndex + 1;
    if (nextIndex < defenderTeam.length) {
      if (deadPlayerIsPlayer1) {
        this.activePetIndex1 = nextIndex;
        this.pet1SkillCooldown = 0;
        this.pet1DefendCooldown = 0;
      } else {
        this.activePetIndex2 = nextIndex;
        this.pet2SkillCooldown = 0;
        this.pet2DefendCooldown = 0;
      }
      const newPet = defenderTeam[nextIndex];
      this.battleLog.push(`🔄 **${newPet.name}** (Lv.${newPet.level}) ra trận!`);
    } else {
      // WINNER logic
      this.winner = isAttackerPlayer1 ? this.player1 : this.player2;
      this.isActive = false;
      this.battleLog.push(`🏆 **${this.winner.username} chiến thắng!**`);
    }
  }

  advanceTurn(isPlayer1CurrentTurn) {
    if (isPlayer1CurrentTurn) { // P1 finish
      if (this.pet1SkillCooldown > 0) this.pet1SkillCooldown--;
      if (this.pet1DefendCooldown > 0) this.pet1DefendCooldown--;
    } else { // P2 finish
      if (this.pet2SkillCooldown > 0) this.pet2SkillCooldown--;
      if (this.pet2DefendCooldown > 0) this.pet2DefendCooldown--;
    }

    this.turn = this.turn === 1 ? 2 : 1;
    this.turnCount++;
  }
}

// Global battle storage active battles
const battles = new Map();

export function createBattle(player1, player2, team1, team2) {
  const battleId = `${player1.id}-${Date.now()}`;
  const battle = new BattleManager(player1, player2, team1, team2);
  battle.battleId = battleId;
  battles.set(battleId, battle);
  return battle;
}

export function getBattleByPlayer(playerId) {
  for (const battle of battles.values()) {
    if (battle.player1.id === playerId || battle.player2.id === playerId) {
      return battle;
    }
  }
  return null;
}

export function removeBattle(battleId) {
  battles.delete(battleId);
}