import { createCanvas, loadImage, hasCanvas } from './canvasHelper.js';
import { AttachmentBuilder } from 'discord.js';

export async function createBattleImage(battleState) {
  if (!hasCanvas()) return null;

  const width = 1400;
  const height = 900;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background với gradient đẹp
  drawEnhancedBackground(ctx, width, height);

  // Header với turn count
  drawHeader(ctx, width, battleState.turnCount || 1);

  // Draw Teams với layout mới
  const cardWidth = 580;
  const cardHeight = 240;
  const gap = 20;
  const yStart = 120;

  // Team 1 (Left) - Blue
  if (battleState.team1) {
    for (let i = 0; i < battleState.team1.length; i++) {
      await drawEnhancedPetCard(
        ctx,
        battleState.team1[i],
        40,
        yStart + (i * (cardHeight + gap)),
        cardWidth,
        cardHeight,
        'left',
        i === battleState.activePetIndex1
      );
    }
  }

  // Team 2 (Right) - Red
  if (battleState.team2) {
    for (let i = 0; i < battleState.team2.length; i++) {
      await drawEnhancedPetCard(
        ctx,
        battleState.team2[i],
        width - cardWidth - 40,
        yStart + (i * (cardHeight + gap)),
        cardWidth,
        cardHeight,
        'right',
        i === battleState.activePetIndex2
      );
    }
  }

  // Battle indicator ở giữa
  if (battleState.activePetIndex1 !== undefined && battleState.activePetIndex2 !== undefined) {
    drawBattleIndicator(ctx, width / 2, height / 2 + 40);

  }

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'battle.png' });
}

function drawEnhancedBackground(ctx, w, h) {
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#0f0f23');
  gradient.addColorStop(0.5, '#1a1a3e');
  gradient.addColorStop(1, '#0f0f23');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Hexagon pattern
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.03)';
  ctx.lineWidth = 1;
  const hexSize = 40;
  for (let y = -hexSize; y < h + hexSize; y += hexSize * 1.5) {
    for (let x = -hexSize; x < w + hexSize; x += hexSize * Math.sqrt(3)) {
      const offsetX = (Math.floor(y / (hexSize * 1.5)) % 2) * (hexSize * Math.sqrt(3) / 2);
      drawHexagon(ctx, x + offsetX, y, hexSize);
    }
  }

  // Glow effects
  const glowGradient1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 300);
  glowGradient1.addColorStop(0, 'rgba(0, 150, 255, 0.1)');
  glowGradient1.addColorStop(1, 'rgba(0, 150, 255, 0)');
  ctx.fillStyle = glowGradient1;
  ctx.fillRect(0, 0, w, h);

  const glowGradient2 = ctx.createRadialGradient(w - 200, 200, 0, w - 200, 200, 300);
  glowGradient2.addColorStop(0, 'rgba(255, 50, 50, 0.1)');
  glowGradient2.addColorStop(1, 'rgba(255, 50, 50, 0)');
  ctx.fillStyle = glowGradient2;
  ctx.fillRect(0, 0, w, h);
}

function drawHexagon(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawHeader(ctx, width, turnCount) {
  // Background bar
  const barHeight = 80;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(0, 150, 255, 0.2)');
  gradient.addColorStop(0.5, 'rgba(100, 50, 200, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 50, 50, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, barHeight);

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, barHeight);

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow effect
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 20;
  ctx.fillText('BATTLE ARENA', width / 2, 30);
  ctx.shadowBlur = 0;

  // Draw decorative swords on both sides
  const swordOffset = 250;
  drawDecorativeSword(ctx, width / 2 - swordOffset, 30, 'left');
  drawDecorativeSword(ctx, width / 2 + swordOffset, 30, 'right');

  // Turn counter
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#ffdd00';
  ctx.fillText(`TURN ${turnCount}`, width / 2, 120);
}

function drawDecorativeSword(ctx, x, y, direction) {
  ctx.save();
  ctx.translate(x, y);
  const scale = 1.8;
  // Kiếm hướng lên trên (vertical) - thay đổi góc xoay
  if (direction === 'left') {
    // Kiếm trái
    ctx.rotate(-Math.PI / 6); // -30°
    ctx.scale(scale, scale);
  } else {
    // Kiếm phải (LẬT GƯƠNG)
    ctx.rotate(Math.PI / 6);  // +30°
    ctx.scale(-scale, scale); // 👈 FLIP NGANG
  }


  ctx.scale(scale, scale);

  // Blade - metallic gradient (horizontal)
  const bladeGradient = ctx.createLinearGradient(-20, 0, 0, 0);
  bladeGradient.addColorStop(0, '#a0a0a0');
  bladeGradient.addColorStop(0.3, '#ffffff');
  bladeGradient.addColorStop(0.6, '#e8e8e8');
  bladeGradient.addColorStop(1, '#c0c0c0');
  ctx.fillStyle = bladeGradient;

  // Main blade (pointing right/left)
  ctx.beginPath();
  ctx.moveTo(-20, 0); // tip
  ctx.lineTo(-2, -2.5);
  ctx.lineTo(-2, 2.5);
  ctx.closePath();
  ctx.fill();

  // Blade edge highlight (top edge)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-2, -2.5);
  ctx.lineTo(-2, -1);
  ctx.lineTo(-19, 0);
  ctx.closePath();
  ctx.fill();

  // Blade shadow (bottom edge)
  ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-2, 2.5);
  ctx.lineTo(-2, 1);
  ctx.lineTo(-19, 0);
  ctx.closePath();
  ctx.fill();

  // Guard (cross-guard) - vertical
  const guardGradient = ctx.createLinearGradient(0, -5, 0, 5);
  guardGradient.addColorStop(0, '#ffd700');
  guardGradient.addColorStop(0.5, '#ffed4e');
  guardGradient.addColorStop(1, '#b8860b');
  ctx.fillStyle = guardGradient;
  ctx.fillRect(-2, -5, 2, 10);

  // Guard decorations
  ctx.fillStyle = '#b8860b';
  ctx.beginPath();
  ctx.arc(0, -5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Handle
  const handleGradient = ctx.createLinearGradient(0, 0, 8, 0);
  handleGradient.addColorStop(0, '#6b3410');
  handleGradient.addColorStop(0.5, '#8b4513');
  handleGradient.addColorStop(1, '#6b3410');
  ctx.fillStyle = handleGradient;
  ctx.fillRect(0, -2, 8, 4);

  // Handle grip lines
  ctx.strokeStyle = '#4a2508';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 8; i += 1.5) {
    ctx.beginPath();
    ctx.moveTo(i, -2);
    ctx.lineTo(i, 2);
    ctx.stroke();
  }

  // Handle wrap details
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(1, -2, 1, 4);
  ctx.fillRect(4, -2, 1, 4);
  ctx.fillRect(7, -2, 1, 4);

  // Pommel (end of handle) - golden ball
  const pommelGradient = ctx.createRadialGradient(10, 0, 0, 10, 0, 3);
  pommelGradient.addColorStop(0, '#ffd700');
  pommelGradient.addColorStop(0.7, '#ffed4e');
  pommelGradient.addColorStop(1, '#b8860b');
  ctx.fillStyle = pommelGradient;
  ctx.beginPath();
  ctx.arc(10, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Pommel highlight
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(9.5, -0.5, 1, 0, Math.PI * 2);
  ctx.fill();

  // Pommel gem
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(10, 0, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8888';
  ctx.beginPath();
  ctx.arc(9.7, -0.3, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Glow effect on blade
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-2, -2.5);
  ctx.stroke();

  ctx.restore();
}

async function drawEnhancedPetCard(ctx, pet, x, y, w, h, side, isActive) {
  if (!pet) return;

  const isDead = pet.currentHp <= 0;
  const teamColor = side === 'left' ? '#00bfff' : '#ff4444';

  ctx.save();
  ctx.translate(x, y);

  // Card shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 5;

  // Card background with gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
  if (isDead) {
    bgGradient.addColorStop(0, 'rgba(40, 40, 40, 0.95)');
    bgGradient.addColorStop(1, 'rgba(20, 20, 20, 0.95)');
  } else {
    bgGradient.addColorStop(0, 'rgba(30, 30, 50, 0.95)');
    bgGradient.addColorStop(1, 'rgba(20, 20, 35, 0.95)');
  }
  ctx.fillStyle = bgGradient;

  // Border color based on active/rarity
  if (isActive) {
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 6;
    ctx.shadowColor = teamColor;
    ctx.shadowBlur = 25;
  } else {
    ctx.strokeStyle = getRarityColor(pet.rarity || 'common');
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
  }

  // Draw rounded rectangle
  roundRect(ctx, 0, 0, w, h, 20);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Active indicator
  if (isActive) {
    drawActiveIndicator(ctx, w, h, side, teamColor);
  }

  // Pet avatar area
  const avatarSize = 160;
  const avatarX = side === 'left' ? 20 : w - avatarSize - 20;
  const avatarY = (h - avatarSize) / 2;

  // Draw pet pixel art
  if (isDead) {
    drawDeadPet(ctx, avatarX, avatarY, avatarSize);
  } else {
    drawPetPixelArt(ctx, pet, avatarX, avatarY, avatarSize);
  }

  // Info section
  const infoX = side === 'left' ? avatarSize + 40 : 20;
  const infoW = w - avatarSize - 60;

  drawPetInfo(ctx, pet, infoX, infoW, side, isDead);

  ctx.restore();
}

function drawPetPixelArt(ctx, pet, x, y, size) {
  // Background circle với rarity color
  const rarityColor = getRarityColor(pet.rarity || 'common');
  const gradient = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size / 2);
  gradient.addColorStop(0, rarityColor + '40');
  gradient.addColorStop(1, rarityColor + '10');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 5, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = rarityColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw pixel art based on pet type
  const petId = pet.petId || pet.name?.toLowerCase() || 'unknown';
  drawPetByType(ctx, petId, x, y, size);

  // Level badge
  drawLevelBadge(ctx, pet.level || 1, x + size - 35, y + 10, rarityColor);
}

function drawPetByType(ctx, petId, x, y, size) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const scale = size / 100;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);

  // Pixel art cho từng loại pet
  if (petId.includes('slime') || petId.includes('🦠')) {
    drawSlime(ctx);
  } else if (petId.includes('dragon') || petId.includes('🐉')) {
    drawDragon(ctx);
  } else if (petId.includes('wolf') || petId.includes('🐺')) {
    drawWolf(ctx);
  } else if (petId.includes('phoenix') || petId.includes('fire')) {
    drawPhoenix(ctx);
  } else if (petId.includes('bear') || petId.includes('🐻')) {
    drawBear(ctx);
  } else if (petId.includes('demon') || petId.includes('😈')) {
    drawDemon(ctx);
  } else if (petId.includes('tiger') || petId.includes('🐯')) {
    drawTiger(ctx);
  } else {
    drawGenericPet(ctx);
  }

  ctx.restore();
}

// Pixel art functions
function drawSlime(ctx) {
  ctx.fillStyle = '#66ff66';
  ctx.fillRect(-20, -10, 40, 30);
  ctx.fillRect(-25, -5, 50, 20);
  ctx.fillStyle = '#44dd44';
  ctx.fillRect(-15, -5, 30, 15);
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(-12, -2, 6, 6);
  ctx.fillRect(6, -2, 6, 6);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-10, 0, 3, 3);
  ctx.fillRect(8, 0, 3, 3);
}

function drawDragon(ctx) {
  // Body
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(-25, -10, 50, 35);
  ctx.fillRect(-30, 0, 60, 20);
  // Wings
  ctx.fillStyle = '#990000';
  ctx.fillRect(-45, -15, 20, 30);
  ctx.fillRect(25, -15, 20, 30);
  // Head
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(-20, -25, 40, 20);
  // Horns
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(-25, -35, 10, 15);
  ctx.fillRect(15, -35, 10, 15);
  // Eyes
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(-12, -18, 8, 8);
  ctx.fillRect(4, -18, 8, 8);
}

function drawWolf(ctx) {
  // Body
  ctx.fillStyle = '#666';
  ctx.fillRect(-20, -5, 40, 25);
  // Head
  ctx.fillStyle = '#777';
  ctx.fillRect(-15, -20, 30, 20);
  // Ears
  ctx.fillRect(-20, -28, 10, 12);
  ctx.fillRect(10, -28, 10, 12);
  // Eyes
  ctx.fillStyle = '#ff0';
  ctx.fillRect(-10, -15, 6, 6);
  ctx.fillRect(4, -15, 6, 6);
  // Nose
  ctx.fillStyle = '#000';
  ctx.fillRect(-3, -8, 6, 4);
}

function drawPhoenix(ctx) {
  // Body
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(-20, -10, 40, 30);
  // Wings
  ctx.fillStyle = '#ff9900';
  ctx.fillRect(-40, -15, 25, 40);
  ctx.fillRect(15, -15, 25, 40);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(-35, -10, 15, 30);
  ctx.fillRect(20, -10, 15, 30);
  // Head
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(-15, -25, 30, 20);
  // Crest
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(-10, -35, 8, 15);
  ctx.fillRect(2, -35, 8, 15);
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(-8, -18, 5, 5);
  ctx.fillRect(3, -18, 5, 5);
}

function drawBear(ctx) {
  // Body
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-25, -5, 50, 30);
  // Head
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(-20, -25, 40, 25);
  // Ears
  ctx.fillRect(-25, -32, 12, 12);
  ctx.fillRect(13, -32, 12, 12);
  // Snout
  ctx.fillStyle = '#D2691E';
  ctx.fillRect(-12, -12, 24, 15);
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(-12, -20, 6, 6);
  ctx.fillRect(6, -20, 6, 6);
  // Nose
  ctx.fillRect(-4, -8, 8, 6);
}

function drawDemon(ctx) {
  // Body
  ctx.fillStyle = '#440000';
  ctx.fillRect(-22, -8, 44, 32);
  // Head
  ctx.fillStyle = '#660000';
  ctx.fillRect(-18, -24, 36, 20);
  // Horns
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(-28, -32, 12, 20);
  ctx.fillRect(16, -32, 12, 20);
  // Eyes
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(-12, -18, 8, 8);
  ctx.fillRect(4, -18, 8, 8);
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(-10, -16, 4, 4);
  ctx.fillRect(6, -16, 4, 4);
}

function drawTiger(ctx) {
  // Body
  ctx.fillStyle = '#ff9933';
  ctx.fillRect(-24, -6, 48, 28);
  // Stripes
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, 0, 6, 20);
  ctx.fillRect(-8, 0, 6, 20);
  ctx.fillRect(4, 0, 6, 20);
  ctx.fillRect(16, 0, 6, 20);
  // Head
  ctx.fillStyle = '#ff9933';
  ctx.fillRect(-18, -22, 36, 20);
  // Ears
  ctx.fillRect(-22, -28, 10, 10);
  ctx.fillRect(12, -28, 10, 10);
  // Face stripes
  ctx.fillStyle = '#000';
  ctx.fillRect(-14, -18, 4, 12);
  ctx.fillRect(10, -18, 4, 12);
  // Eyes
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(-10, -16, 6, 6);
  ctx.fillRect(4, -16, 6, 6);
}

function drawGenericPet(ctx) {
  // Generic creature
  ctx.fillStyle = '#9999ff';
  ctx.fillRect(-20, -10, 40, 30);
  ctx.fillStyle = '#7777ff';
  ctx.fillRect(-15, -20, 30, 15);
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(-10, -15, 6, 6);
  ctx.fillRect(4, -15, 6, 6);
  ctx.fillStyle = '#000';
  ctx.fillRect(-8, -13, 3, 3);
  ctx.fillRect(6, -13, 3, 3);
}

function drawPetInfo(ctx, pet, x, w, side, isDead) {
  const align = side === 'left' ? 'left' : 'right';
  const textX = side === 'left' ? x : x + w;

  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  // Pet name
  ctx.fillStyle = isDead ? '#888' : '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(pet.name || 'Pet', textX, 25);

  // Rarity badge
  const rarityText = (pet.rarity || 'common').toUpperCase();
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = getRarityColor(pet.rarity);
  const rarityX = side === 'left' ? textX : textX - ctx.measureText(pet.name || 'Pet').width - 10;
  ctx.fillText(rarityText, rarityX, 55);

  // HP Bar
  drawStatsBar(ctx, pet, x, 75, w, side);

  // Stats display
  drawStats(ctx, pet, x, 140, w, side, isDead);

  // Weapon
  if (pet.weapon) {
    drawWeaponInfo(ctx, pet.weapon, x, 185, w, side);
  }
}

function drawStatsBar(ctx, pet, x, y, w, side) {
  const barHeight = 32;
  const maxHp = pet.maxHp || pet.hp || 1;
  const currentHp = Math.max(0, pet.currentHp ?? pet.hp ?? 0);
  const hpPct = currentHp / maxHp;

  // Background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x, y, w, barHeight);

  // HP gradient
  const hpGradient = ctx.createLinearGradient(x, y, x + w, y);
  if (hpPct > 0.6) {
    hpGradient.addColorStop(0, '#00ff88');
    hpGradient.addColorStop(1, '#00cc66');
  } else if (hpPct > 0.3) {
    hpGradient.addColorStop(0, '#ffcc00');
    hpGradient.addColorStop(1, '#ff9900');
  } else {
    hpGradient.addColorStop(0, '#ff4444');
    hpGradient.addColorStop(1, '#cc0000');
  }
  ctx.fillStyle = hpGradient;

  if (side === 'left') {
    ctx.fillRect(x, y, w * hpPct, barHeight);
  } else {
    ctx.fillRect(x + w * (1 - hpPct), y, w * hpPct, barHeight);
  }

  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, barHeight);

  // HP Text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.floor(currentHp)} / ${Math.floor(maxHp)} HP`, x + w / 2, y + barHeight / 2);
}

function drawStats(ctx, pet, x, y, w, side, isDead) {
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = side === 'left' ? 'left' : 'right';
  ctx.fillStyle = isDead ? '#666' : '#fff';

  const textX = side === 'left' ? x : x + w;
  const atk = (pet.atk || 0) + (pet.weapon?.atk || 0);
  const def = (pet.def || 0) + (pet.weapon?.def || 0);

  ctx.fillText(`⚔️ ATK: ${atk}`, textX, y);
  ctx.fillText(`🛡️ DEF: ${def}`, textX, y + 25);
}

function drawWeaponInfo(ctx, weapon, x, y, w, side) {
  const textX = side === 'left' ? x : x + w;
  ctx.textAlign = side === 'left' ? 'left' : 'right';

  // Weapon icon (pixel art)
  const iconSize = 32;
  const iconX = side === 'left' ? x : x + w - iconSize;
  drawWeaponPixelArt(ctx, weapon, iconX, y - 5, iconSize);

  // Weapon name
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#ffaa00';
  const nameX = side === 'left' ? x + iconSize + 8 : x + w - iconSize - 8;
  ctx.fillText(weapon.name || 'Weapon', nameX, y + 10);
}

function drawWeaponPixelArt(ctx, weapon, x, y, size) {
  const weaponId = weapon.id || weapon.name?.toLowerCase() || '';
  const scale = size / 24;

  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.scale(scale, scale);

  if (weaponId.includes('sword') || weaponId.includes('blade') || weaponId.includes('katana')) {
    drawSword(ctx);
  } else if (weaponId.includes('shield') || weaponId.includes('aegis')) {
    drawShield(ctx);
  } else if (weaponId.includes('bow')) {
    drawBow(ctx);
  } else if (weaponId.includes('hammer') || weaponId.includes('mjolnir')) {
    drawHammer(ctx);
  } else if (weaponId.includes('staff') || weaponId.includes('wand')) {
    drawStaff(ctx);
  } else if (weaponId.includes('spear') || weaponId.includes('gungnir')) {
    drawSpear(ctx);
  } else {
    drawGenericWeapon(ctx);
  }

  ctx.restore();
}

function drawSword(ctx) {
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(-2, -10, 4, 16);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(-3, 6, 6, 6);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-4, 5, 8, 2);
}

function drawShield(ctx) {
  ctx.fillStyle = '#4169e1';
  ctx.fillRect(-8, -8, 16, 16);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = '#4169e1';
  ctx.fillRect(-4, -4, 8, 8);
}

function drawBow(ctx) {
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-6, 0, 8, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(-6, 8);
  ctx.stroke();
}

function drawHammer(ctx) {
  ctx.fillStyle = '#696969';
  ctx.fillRect(-8, -6, 12, 8);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(0, -2, 2, 12);
}

function drawStaff(ctx) {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(-1, -10, 2, 20);
  ctx.fillStyle = '#9370db';
  ctx.beginPath();
  ctx.arc(0, -10, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpear(ctx) {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(-1, -4, 2, 16);
  ctx.fillStyle = '#c0c0c0';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
}

function drawGenericWeapon(ctx) {
  ctx.fillStyle = '#888';
  ctx.fillRect(-6, -6, 12, 12);
}

function drawDeadPet(ctx, x, y, size) {
  // Dark background
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 5, 0, Math.PI * 2);
  ctx.fill();

  // Skull pixel art
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const scale = size / 100;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ddd';
  ctx.fillRect(-20, -20, 40, 40);
  ctx.fillStyle = '#000';
  ctx.fillRect(-15, -12, 10, 12);
  ctx.fillRect(5, -12, 10, 12);
  ctx.fillRect(-8, 5, 16, 8);

  ctx.restore();
}

function drawActiveIndicator(ctx, w, h, side, color) {
  // Animated border glow
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.setLineDash([]);

  // Corner markers
  const cornerSize = 15;
  ctx.fillStyle = color;
  // Top left
  ctx.fillRect(0, 0, cornerSize, 3);
  ctx.fillRect(0, 0, 3, cornerSize);
  // Top right
  ctx.fillRect(w - cornerSize, 0, cornerSize, 3);
  ctx.fillRect(w - 3, 0, 3, cornerSize);
  // Bottom left
  ctx.fillRect(0, h - 3, cornerSize, 3);
  ctx.fillRect(0, h - cornerSize, 3, cornerSize);
  // Bottom right
  ctx.fillRect(w - cornerSize, h - 3, cornerSize, 3);
  ctx.fillRect(w - 3, h - cornerSize, 3, cornerSize);
}

function drawLevelBadge(ctx, level, x, y, color) {
  // Badge background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Level text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(level, x, y);
}

function drawBattleIndicator(ctx, x, y) {
  ctx.save();

  // Glow
  ctx.shadowColor = '#ff0';
  ctx.shadowBlur = 30;

  // VS circle
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
  gradient.addColorStop(0, '#ffaa00');
  gradient.addColorStop(1, '#ff6600');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // VS text
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VS', x, y);

  // Sparks
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    const sx = x + Math.cos(angle) * 60;
    const sy = y + Math.sin(angle) * 60;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function getRarityColor(rarity) {
  const colors = {
    common: '#95a5a6',
    uncommon: '#2ecc71',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f1c40f',
    mythic: '#e74c3c'
  };
  return colors[rarity?.toLowerCase()] || colors.common;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}