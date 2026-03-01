import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage, hasCanvas } from '../../utils/canvasHelper.js';
import { User } from '../../database/models.js';
import { getUserLevelInfo } from '../../utils/levelSystem.js';
import { reply, getUser } from '../../utils/commandHelper.js';

export default {
  name: 'profile',
  aliases: ['pf', 'me', 'stats'],
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Xem hồ sơ người chơi của bạn hoặc người khác')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Người bạn muốn xem hồ sơ')
        .setRequired(false)
    ),

  async execute(message, args) {
    try {
      if (message.options) await message.deferReply();

      let target;
      if (message.options) {
        target = message.options.getUser('user') || message.user;
      } else {
        target = message.mentions.users.first() || message.author;
      }
      let userData = await User.findOne({ userId: target.id });

      if (!userData) {
        return message.reply(`> <a:no:1455096623804715080> Người dùng **${target.username}** chưa đăng ký sử dụng bot!`);
      }

      const levelInfo = await getUserLevelInfo(target.id);
      const power = Math.round((userData.atk * 2) + (userData.def * 1.5) + (userData.hp * 0.2) + (userData.level * 5));
      const userRank = await User.countDocuments({
        $or: [
          { level: { $gt: userData.level } },
          { level: userData.level, exp: { $gt: userData.exp } }
        ]
      }) + 1;
      const totalUsers = await User.countDocuments({});
      const user = getUser(message);

      // --- TRƯỜNG HỢP CÓ CANVAS ---
      if (hasCanvas()) {
        const canvas = createCanvas(1400, 800);
        const ctx = canvas.getContext('2d');

        // ===== BACKGROUND =====
        // Gradient background chính
        const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(0.5, '#16213e');
        bgGradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Thêm các vòng tròn trang trí ở góc
        ctx.globalAlpha = 0.1;
        const circles = [
          { x: -50, y: -50, r: 200, color: '#e94560' },
          { x: canvas.width + 50, y: -50, r: 250, color: '#533483' },
          { x: canvas.width + 50, y: canvas.height + 50, r: 200, color: '#e94560' },
          { x: -50, y: canvas.height + 50, r: 250, color: '#533483' }
        ];
        
        circles.forEach(circle => {
          const circleGradient = ctx.createRadialGradient(circle.x, circle.y, 0, circle.x, circle.y, circle.r);
          circleGradient.addColorStop(0, circle.color);
          circleGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = circleGradient;
          ctx.beginPath();
          ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // ===== MAIN CONTAINER =====
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 10;
        
        // Container chính với gradient tinh tế
        const containerGradient = ctx.createLinearGradient(50, 50, 50, canvas.height - 50);
        containerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        containerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        ctx.fillStyle = containerGradient;
        roundRect(ctx, 50, 50, canvas.width - 100, canvas.height - 100, 30);
        ctx.fill();
        
        // Border gradient cho container
        const borderGradient = ctx.createLinearGradient(50, 50, canvas.width - 50, canvas.height - 50);
        borderGradient.addColorStop(0, 'rgba(233, 69, 96, 0.5)');
        borderGradient.addColorStop(0.5, 'rgba(83, 52, 131, 0.5)');
        borderGradient.addColorStop(1, 'rgba(233, 69, 96, 0.5)');
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();

        // ===== HEADER SECTION =====
        const headerHeight = 220;
        
        // Header background với gradient
        ctx.save();
        const headerGradient = ctx.createLinearGradient(70, 70, 70, 70 + headerHeight);
        headerGradient.addColorStop(0, 'rgba(233, 69, 96, 0.2)');
        headerGradient.addColorStop(1, 'rgba(83, 52, 131, 0.2)');
        ctx.fillStyle = headerGradient;
        roundRect(ctx, 70, 70, canvas.width - 140, headerHeight, 20);
        ctx.fill();
        ctx.restore();

        // ===== AVATAR =====
        const avatarX = 130;
        const avatarY = 130;
        const avatarSize = 140;
        
        try {
          const avatarURL = target.displayAvatarURL({ extension: 'png', size: 512 });
          const res = await fetch(avatarURL);
          const buffer = Buffer.from(await res.arrayBuffer());
          const avatar = await loadImage(buffer);

          // Shadow cho avatar
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = 5;
          
          // Vẽ avatar
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
          ctx.restore();

          // Border gradient cho avatar
          ctx.save();
          const avatarBorderGradient = ctx.createLinearGradient(
            avatarX, avatarY, 
            avatarX + avatarSize, avatarY + avatarSize
          );
          avatarBorderGradient.addColorStop(0, '#e94560');
          avatarBorderGradient.addColorStop(0.5, '#ffd700');
          avatarBorderGradient.addColorStop(1, '#e94560');
          
          ctx.strokeStyle = avatarBorderGradient;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

        } catch (e) {
          console.error('Lỗi tải avatar:', e);
        }

        // ===== LEVEL BADGE =====
        const badgeX = avatarX + avatarSize - 25;
        const badgeY = avatarY + avatarSize - 25;
        
        // Badge shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        
        // Badge background
        const badgeGradient = ctx.createLinearGradient(badgeX - 30, badgeY - 30, badgeX + 30, badgeY + 30);
        badgeGradient.addColorStop(0, '#ffd700');
        badgeGradient.addColorStop(1, '#ff6b6b');
        ctx.fillStyle = badgeGradient;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Badge border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        
        // Level text
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(userData.level, badgeX, badgeY);

        // ===== USERNAME & INFO =====
        const infoX = avatarX + avatarSize + 40;
        const infoY = 120;
        
        // Username với shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(target.username, infoX, infoY);
        ctx.restore();

        // Rank badge
        const rankY = infoY + 60;
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        roundRect(ctx, infoX, rankY, 150, 35, 17.5);
        ctx.fill();
        
        const rankGradient = ctx.createLinearGradient(infoX, rankY, infoX + 150, rankY + 35);
        rankGradient.addColorStop(0, '#e94560');
        rankGradient.addColorStop(1, '#ffd700');
        ctx.fillStyle = rankGradient;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`RANK #${userRank}`, infoX + 75, rankY + 17.5);

        // Bio text
        ctx.font = 'italic 18px Arial';
        ctx.fillStyle = '#d1d1d1';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const bioText = userData.bio || 'Chưa có tiểu sử...';
        const wrappedBio = wrapText(ctx, bioText, 750);
        let bioY = infoY + 110;
        wrappedBio.slice(0, 2).forEach(line => {
          ctx.fillText(line, infoX, bioY);
          bioY += 25;
        });

        // ===== STATS SECTION =====
        const statsY = 320;
        const statCards = [
          { 
            label: 'HP', 
            value: userData.hp || 100,
            iconType: 'heart',
            color: '#e74c3c',
            gradient: ['#e74c3c', '#c0392b']
          },
          { 
            label: 'ATK', 
            value: userData.atk || 10,
            iconType: 'sword',
            color: '#f39c12',
            gradient: ['#f39c12', '#e67e22']
          },
          { 
            label: 'DEF', 
            value: userData.def || 5,
            iconType: 'shield',
            color: '#3498db',
            gradient: ['#3498db', '#2980b9']
          },
          { 
            label: 'POWER', 
            value: power,
            iconType: 'star',
            color: '#9b59b6',
            gradient: ['#9b59b6', '#8e44ad']
          }
        ];

        const cardWidth = 280;
        const cardHeight = 110;
        const cardGap = 30;
        const cardsStartX = 90;

        statCards.forEach((stat, index) => {
          const cardX = cardsStartX + (cardWidth + cardGap) * index;
          
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 5;
          
          // Card background
          const cardGradient = ctx.createLinearGradient(cardX, statsY, cardX, statsY + cardHeight);
          cardGradient.addColorStop(0, `${stat.color}30`);
          cardGradient.addColorStop(1, `${stat.color}10`);
          ctx.fillStyle = cardGradient;
          roundRect(ctx, cardX, statsY, cardWidth, cardHeight, 15);
          ctx.fill();
          
          // Card border
          ctx.strokeStyle = `${stat.color}80`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // Draw custom icon
          const iconX = cardX + 40;
          const iconY = statsY + 35;
          drawIcon(ctx, stat.iconType, iconX, iconY, stat.color);

          // Label
          ctx.font = 'bold 18px Arial';
          ctx.fillStyle = stat.color;
          ctx.textAlign = 'left';
          ctx.fillText(stat.label, cardX + 20, statsY + 85);

          // Value
          ctx.font = 'bold 42px Arial';
          const valueGradient = ctx.createLinearGradient(cardX, statsY, cardX + cardWidth, statsY + cardHeight);
          valueGradient.addColorStop(0, stat.gradient[0]);
          valueGradient.addColorStop(1, stat.gradient[1]);
          ctx.fillStyle = valueGradient;
          ctx.textAlign = 'right';
          ctx.fillText(formatNumber(stat.value), cardX + cardWidth - 20, statsY + 63);
        });

        // ===== ECONOMY SECTION =====
        const ecoY = 460;
        const ecoCards = [
          {
            label: 'Vi tien',
            value: userData.money || 0,
            iconType: 'money',
            color: '#f1c40f',
            gradient: ['#f1c40f', '#f39c12']
          },
          {
            label: 'Ngan hang',
            value: userData.bank?.balance || 0,
            iconType: 'bank',
            color: '#2ecc71',
            gradient: ['#2ecc71', '#27ae60']
          },
          {
            label: 'Tong tai san',
            value: (userData.money || 0) + (userData.bank?.balance || 0),
            iconType: 'diamond',
            color: '#3498db',
            gradient: ['#3498db', '#2980b9']
          }
        ];

        const ecoCardWidth = 380;
        const ecoCardHeight = 100;
        const ecoCardGap = 30;
        const ecoStartX = 90;

        ecoCards.forEach((eco, index) => {
          const cardX = ecoStartX + (ecoCardWidth + ecoCardGap) * index;
          
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 5;
          
          // Card background
          const cardGradient = ctx.createLinearGradient(cardX, ecoY, cardX, ecoY + ecoCardHeight);
          cardGradient.addColorStop(0, `${eco.color}25`);
          cardGradient.addColorStop(1, `${eco.color}08`);
          ctx.fillStyle = cardGradient;
          roundRect(ctx, cardX, ecoY, ecoCardWidth, ecoCardHeight, 15);
          ctx.fill();
          
          // Card border
          ctx.strokeStyle = `${eco.color}60`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // Draw custom icon
          const iconX = cardX + 35;
          const iconY = ecoY + 30;
          drawIcon(ctx, eco.iconType, iconX, iconY, eco.color);

          // Label
          ctx.font = 'bold 18px Arial';
          ctx.fillStyle = eco.color;
          ctx.textAlign = 'left';
          ctx.fillText(eco.label, cardX + 20, ecoY + 75);

          // Value
          ctx.font = 'bold 36px Arial';
          const valueGradient = ctx.createLinearGradient(cardX, ecoY, cardX + ecoCardWidth, ecoY + ecoCardHeight);
          valueGradient.addColorStop(0, eco.gradient[0]);
          valueGradient.addColorStop(1, eco.gradient[1]);
          ctx.fillStyle = valueGradient;
          ctx.textAlign = 'right';
          ctx.fillText(formatNumber(eco.value) + '$', cardX + ecoCardWidth - 20, ecoY + 58);
        });

        // ===== XP PROGRESS BAR =====
        const xpY = 600;
        const xpBarWidth = canvas.width - 180;
        const xpBarHeight = 50;
        const xpBarX = 90;

        // XP Label
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('KINH NGHIEM (XP)', xpBarX, xpY - 10);

        // XP Bar background
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        roundRect(ctx, xpBarX, xpY + 10, xpBarWidth, xpBarHeight, 25);
        ctx.fill();
        ctx.restore();

        // XP Bar fill
        const expProgress = (levelInfo.currentXP / levelInfo.neededXP) * 100;
        const progressWidth = (xpBarWidth * expProgress) / 100;
        
        if (progressWidth > 0) {
          ctx.save();
          const xpGradient = ctx.createLinearGradient(xpBarX, xpY + 10, xpBarX + xpBarWidth, xpY + 10 + xpBarHeight);
          xpGradient.addColorStop(0, '#667eea');
          xpGradient.addColorStop(0.5, '#764ba2');
          xpGradient.addColorStop(1, '#f093fb');
          ctx.fillStyle = xpGradient;
          roundRect(ctx, xpBarX, xpY + 10, progressWidth, xpBarHeight, 25);
          ctx.fill();
          ctx.restore();

          // Shine effect
          ctx.save();
          const shineGradient = ctx.createLinearGradient(xpBarX, xpY + 10, xpBarX, xpY + 10 + xpBarHeight);
          shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
          shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
          shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = shineGradient;
          roundRect(ctx, xpBarX, xpY + 10, progressWidth, xpBarHeight / 2, 25);
          ctx.fill();
          ctx.restore();
        }

        // XP Text
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${levelInfo.currentXP.toLocaleString()} / ${levelInfo.neededXP.toLocaleString()} XP (${levelInfo.percentage}%)`,
          xpBarX + xpBarWidth / 2,
          xpY + 10 + xpBarHeight / 2
        );

        // ===== FOOTER INFO =====
        const footerY = 690;
        
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText(`Tổng XP: ${levelInfo.totalXP.toLocaleString()}`, xpBarX, footerY);
        
        ctx.textAlign = 'center';
        ctx.fillText(`Cần thêm ${(levelInfo.neededXP - levelInfo.currentXP).toLocaleString()} XP để lên level ${userData.level + 1}`, canvas.width / 2, footerY);
        
        ctx.textAlign = 'right';
        ctx.fillText(`Hạng: #${userRank.toLocaleString()} / ${totalUsers.toLocaleString()}`, canvas.width - xpBarX, footerY);

        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });

        const embed = new EmbedBuilder()
          .setColor(userData.profileSettings?.color || '#e94560')
          .setImage('attachment://profile.png')
          .setFooter({ 
            text: `Yêu cầu bởi ${user.username}`, 
            iconURL: user.displayAvatarURL() 
          })
          .setTimestamp();

        await reply(message, { embeds: [embed], files: [attachment] });

      } else {
        // --- TRƯỜNG HỢP KHÔNG CÓ CANVAS (ANDROID/TERMUX) ---
        const embed = new EmbedBuilder()
          .setColor(userData.profileSettings?.color || '#5865F2')
          .setTitle(`📊 PROFILE CỦA ${target.username.toUpperCase()}`)
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            { 
              name: '👤 Thông tin', 
              value: `> **Cấp độ:** \`${userData.level}\`\n> **Hạng:** \`#${userRank.toLocaleString()}\`\n> **Sức mạnh:** \`${Math.round(power)}\`\n> **Bio:** *${userData.bio || 'Chưa có bio'}*`, 
              inline: false 
            },
            { 
              name: '⚔️ Chỉ số chiến đấu', 
              value: `> **HP:** \`${userData.hp}\`\n> **Công:** \`${userData.atk}\`\n> **Thủ:** \`${userData.def}\``, 
              inline: true 
            },
            { 
              name: '💰 Tài sản', 
              value: `> **Ví:** \`${formatNumber(userData.money || 0)}$\`\n> **Ngân hàng:** \`${formatNumber(userData.bank?.balance || 0)}$\``, 
              inline: true 
            },
            { 
              name: '📈 Kinh nghiệm', 
              value: `> \`${levelInfo.currentXP.toLocaleString()} / ${levelInfo.neededXP.toLocaleString()} XP\` (${levelInfo.percentage}%)\n> ${'🟢'.repeat(Math.floor(levelInfo.percentage / 10))}${'⚪'.repeat(10 - Math.floor(levelInfo.percentage / 10))}` 
            }
          )
          .setFooter({ 
            text: `Yêu cầu bởi ${user.username} (Chế độ tương thích Android)`, 
            iconURL: user.displayAvatarURL() 
          })
          .setTimestamp();

        await reply(message, { embeds: [embed] });
      }

    } catch (error) {
      console.error('Lỗi khi tạo profile:', error);
      await message.reply('<a:no:1455096623804715080> Có lỗi xảy ra khi tạo profile!');
    }
  }
};

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Vẽ các icon tùy chỉnh bằng shapes
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} iconType - Loại icon (heart, sword, shield, star, money, bank, diamond)
 * @param {number} x - Tọa độ x
 * @param {number} y - Tọa độ y
 * @param {string} color - Màu của icon
 */
function drawIcon(ctx, iconType, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Scale vừa phải để icon không quá to
  const scale = 1.2;

  switch (iconType) {
    case 'heart':
      // Vẽ trái tim
      ctx.beginPath();
      ctx.moveTo(x, y + 5 * scale);
      ctx.bezierCurveTo(x, y - 2 * scale, x - 10 * scale, y - 7 * scale, x - 10 * scale, y);
      ctx.bezierCurveTo(x - 10 * scale, y + 7 * scale, x, y + 15 * scale, x, y + 20 * scale);
      ctx.bezierCurveTo(x, y + 15 * scale, x + 10 * scale, y + 7 * scale, x + 10 * scale, y);
      ctx.bezierCurveTo(x + 10 * scale, y - 7 * scale, x, y - 2 * scale, x, y + 5 * scale);
      ctx.fill();
      break;

    case 'sword':
      // Vẽ thanh kiếm
      ctx.lineWidth = 3.5 * scale / 1.2;
      // Lưỡi kiếm
      ctx.beginPath();
      ctx.moveTo(x - 8 * scale, y + 15 * scale);
      ctx.lineTo(x + 8 * scale, y - 15 * scale);
      ctx.stroke();
      
      // Thanh ngang
      ctx.lineWidth = 3 * scale / 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 12 * scale, y + 8 * scale);
      ctx.lineTo(x + 4 * scale, y + 8 * scale);
      ctx.stroke();
      
      // Cán kiếm
      ctx.lineWidth = 4 * scale / 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 6 * scale, y + 15 * scale);
      ctx.lineTo(x - 9 * scale, y + 20 * scale);
      ctx.stroke();
      
      // Núm cán
      ctx.beginPath();
      ctx.arc(x - 10 * scale, y + 22 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'shield':
      // Vẽ khiên
      ctx.beginPath();
      ctx.moveTo(x, y - 15 * scale);
      ctx.lineTo(x + 12 * scale, y - 10 * scale);
      ctx.lineTo(x + 12 * scale, y + 5 * scale);
      ctx.quadraticCurveTo(x + 12 * scale, y + 15 * scale, x, y + 20 * scale);
      ctx.quadraticCurveTo(x - 12 * scale, y + 15 * scale, x - 12 * scale, y + 5 * scale);
      ctx.lineTo(x - 12 * scale, y - 10 * scale);
      ctx.closePath();
      ctx.fill();
      
      // Vẽ dấu cộng ở giữa
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 8 * scale);
      ctx.lineTo(x, y + 8 * scale);
      ctx.moveTo(x - 6 * scale, y);
      ctx.lineTo(x + 6 * scale, y);
      ctx.stroke();
      break;

    case 'star':
      // Vẽ ngôi sao 5 cánh
      const spikes = 5;
      const outerRadius = 15 * scale;
      const innerRadius = 7 * scale;
      let rot = Math.PI / 2 * 3;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(x, y - outerRadius);
      
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
        rot += step;
      }
      ctx.lineTo(x, y - outerRadius);
      ctx.closePath();
      ctx.fill();
      break;

    case 'money':
      // Vẽ túi tiền
      ctx.beginPath();
      ctx.arc(x, y + 5 * scale, 12 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Miệng túi
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(x, y - 7 * scale, 8 * scale, 3 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Ký hiệu $
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = `bold ${16 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', x, y + 5 * scale);
      break;

    case 'bank':
      // Vẽ ngân hàng
      // Mái nhà
      ctx.beginPath();
      ctx.moveTo(x, y - 15 * scale);
      ctx.lineTo(x + 15 * scale, y - 5 * scale);
      ctx.lineTo(x - 15 * scale, y - 5 * scale);
      ctx.closePath();
      ctx.fill();
      
      // Thân nhà
      ctx.fillRect(x - 12 * scale, y - 5 * scale, 24 * scale, 20 * scale);
      
      // Cột
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      const colWidth = 3 * scale;
      const colSpacing = 7 * scale;
      ctx.fillRect(x - 9 * scale, y - 3 * scale, colWidth, 15 * scale);
      ctx.fillRect(x - 1.5 * scale, y - 3 * scale, colWidth, 15 * scale);
      ctx.fillRect(x + 6 * scale, y - 3 * scale, colWidth, 15 * scale);
      
      // Cửa
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x - 4 * scale, y + 7 * scale, 8 * scale, 8 * scale);
      break;

    case 'diamond':
      // Vẽ kim cương
      ctx.beginPath();
      ctx.moveTo(x, y - 15 * scale);
      ctx.lineTo(x + 10 * scale, y - 5 * scale);
      ctx.lineTo(x + 6 * scale, y + 15 * scale);
      ctx.lineTo(x - 6 * scale, y + 15 * scale);
      ctx.lineTo(x - 10 * scale, y - 5 * scale);
      ctx.closePath();
      ctx.fill();
      
      // Các đường trang trí
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10 * scale, y - 5 * scale);
      ctx.lineTo(x, y + 5 * scale);
      ctx.lineTo(x + 10 * scale, y - 5 * scale);
      ctx.stroke();
      
      // Đường dọc giữa
      ctx.beginPath();
      ctx.moveTo(x, y - 15 * scale);
      ctx.lineTo(x, y + 5 * scale);
      ctx.stroke();
      break;

    default:
      // Vẽ hình tròn mặc định
      ctx.beginPath();
      ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}