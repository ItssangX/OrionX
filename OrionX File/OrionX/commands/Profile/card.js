import { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage, hasCanvas } from '../../utils/canvasHelper.js';
import { reply, getUser } from '../../utils/commandHelper.js';

export default {
  name: 'card',
  aliases: ['usercard', 'uc'],
  description: 'Tạo thẻ thành viên đẹp mắt',
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Tạo thẻ thành viên đẹp mắt'),

  async execute(source) {
    try {
      const user = getUser(source);
      // 1. Lấy dữ liệu User
      const member = source.guild ? await source.guild.members.fetch(user.id).catch(() => null) : null;

      // Xử lý ngày tham gia
      let joinDateStr = 'N/A';
      if (member) {
        const joinDate = member.joinedAt;
        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        joinDateStr = joinDate.toLocaleDateString('vi-VN', dateOptions);
      }

      // Xử lý trạng thái (Status)
      let status = 'offline';
      if (member && member.presence) {
        status = member.presence.status;
      }

      const userData = {
        username: user.username,
        discriminator: user.discriminator === '0' ? '' : `#${user.discriminator}`,
        id: user.id,
        avatarUrl: user.displayAvatarURL({ format: 'png', size: 512 }),
        joinDate: joinDateStr,
        status: status
      };

      // 2. Tạo Canvas
      if (hasCanvas()) {
        const width = 700;
        const height = 250;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 3. Render (Vẽ hình)
        await drawCard(ctx, canvas, userData);

        // 4. Gửi
        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'usercard.png' });
        const embed = new EmbedBuilder()
          .setColor('#8E2DE2')
          .setTitle(`🎫 THẺ THÀNH VIÊN: ${user.username.toUpperCase()}`)
          .setImage('attachment://usercard.png')
          .setTimestamp();

        await reply(source, { embeds: [embed], files: [attachment] });
      } else {
        // Fallback for Android
        const embed = new EmbedBuilder()
          .setColor('#8E2DE2')
          .setTitle(`🎫 THẺ THÀNH VIÊN: ${user.username.toUpperCase()}`)
          .setThumbnail(userData.avatarUrl)
          .addFields(
            { name: '🆔 ID', value: `\`${userData.id}\``, inline: true },
            { name: '📅 Tham gia', value: `\`${userData.joinDate}\``, inline: true },
            { name: 'Status', value: `\`${userData.status}\``, inline: true }
          )
          .setFooter({ text: 'Chế độ tương thích Android (Không có hình ảnh thẻ)' })
          .setTimestamp();

        await reply(source, { embeds: [embed] });
      }

    } catch (error) {
      console.error('Lỗi command card:', error);
      await reply(source, { content: '> <a:no:1455096623804715080> **Lỗi!** Không thể tạo thẻ thành viên.' });
    }
  }
};

async function drawCard(ctx, canvas, data) {
  const { width, height } = canvas;

  // --- Background ---
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#8E2DE2');
  gradient.addColorStop(1, '#4A00E0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // --- Chấm trang trí ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < width; i += 30) {
    for (let j = 0; j < height; j += 30) {
      ctx.beginPath();
      ctx.arc(i, j, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Card Body ---
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 25, 25, width - 50, height - 50, 20);
  ctx.fill();
  ctx.restore();

  // --- Avatar Area ---
  const avatarX = 110;
  const avatarY = 125;
  const avatarRadius = 70;

  // Nền mờ avatar
  ctx.fillStyle = 'rgba(142, 45, 226, 0.05)';
  roundRect(ctx, 25, 25, 170, height - 50, [20, 0, 0, 20]);
  ctx.fill();

  // Vẽ Avatar
  const avatar = await loadImage(data.avatarUrl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  ctx.restore();

  // Viền Avatar
  const borderGrad = ctx.createLinearGradient(avatarX - avatarRadius, avatarY - avatarRadius, avatarX + avatarRadius, avatarY + avatarRadius);
  borderGrad.addColorStop(0, '#8E2DE2');
  borderGrad.addColorStop(1, '#4A00E0');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius - 3, 0, Math.PI * 2, true);
  ctx.stroke();

  // --- Text Info ---
  const startX = 220;

  // Username (Sử dụng font mặc định hệ thống sẽ mượt hơn nếu không cài font riêng)
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#2d3436';
  const displayName = truncateText(ctx, data.username, 250);
  ctx.fillText(displayName, startX, 80);

  // Discriminator
  if (data.discriminator) {
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#636e72';
    ctx.fillText(data.discriminator, startX + ctx.measureText(displayName).width + 10, 80);
  }

  // Gạch chân
  ctx.strokeStyle = 'rgba(142, 45, 226, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, 100);
  ctx.lineTo(width - 50, 100);
  ctx.stroke();

  // Info details
  ctx.font = '18px sans-serif';
  const infoStartY = 140;
  const lineHeight = 30;

  drawInfoLine(ctx, '🆔 ID:', data.id, startX, infoStartY);
  drawInfoLine(ctx, '📅 Tham gia:', data.joinDate, startX, infoStartY + lineHeight);

  // --- Status ---
  const statusColors = {
    online: '#2ecc71',
    idle: '#f1c40f',
    dnd: '#e74c3c',
    offline: '#95a5a6'
  };

  const statusY = avatarY + avatarRadius + 5;
  ctx.fillStyle = statusColors[data.status] || statusColors.offline;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(avatarX, statusY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawInfoLine(ctx, label, value, x, y) {
  ctx.fillStyle = '#b2bec3';
  ctx.fillText(label, x, y);
  const labelWidth = ctx.measureText(label).width;
  ctx.fillStyle = '#2d3436';
  ctx.fillText(value, x + labelWidth + 10, y);
}

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'undefined') radius = 5;
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}