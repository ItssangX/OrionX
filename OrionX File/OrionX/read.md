# 📚 HƯỚNG DẪN CẤU TRÚC BOT DISCORD - HANDLER PATTERN

## 🏗️ Cấu trúc thư mục

```
OrionXVIP/
├── 📄 package.json           # Config project & dependencies
├── 📄 index.js               # File khởi động bot chính
├── 📄 run.js                 # File auto-restart bot
├── 📄 .env                   # Biến môi trường (TOKEN, PREFIX)
│
├── 📁 commands/              # Chứa tất cả lệnh
│   ├── 📁 general/           # Nhóm lệnh general
│   │   ├── card.js
│   │   ├── ping.js
│   │   └── profile.js
│   ├── 📁 moderation/        # Nhóm lệnh moderation
│   │   ├── ban.js
│   │   ├── kick.js
│   │   └── mute.js
│   └── 📁 fun/               # Nhóm lệnh giải trí
│       ├── meme.js
│       └── joke.js
│
├── 📁 events/                # Chứa các event handlers
│   ├── messageCreate.js      # Xử lý khi có tin nhắn mới
│   ├── interactionCreate.js  # Xử lý slash commands
│   └── ready.js              # Xử lý khi bot sẵn sàng
│
├── 📁 handlers/              # Chứa các handler loaders
│   ├── commandHandler.js     # Load tất cả commands
│   └── eventHandler.js       # Load tất cả events
│
├── 📁 utils/                 # Tiện ích & helper functions
│   ├── logger.js
│   └── helpers.js
│
├── 📁 config/                # File cấu hình
│   └── config.js
│
└── 📁 assets/                # Hình ảnh, fonts, resources
    ├── fonts/
    └── images/
```

---

## 📦 Setup ban đầu

### 1. Tạo package.json

```bash
npm init -y
```

Sau đó chỉnh sửa `package.json`:

```json
{
  "name": "orionxvip",
  "version": "1.0.0",
  "type": "module",
  "description": "Discord Bot with Handler Pattern",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node run.js"
  },
  "keywords": ["discord", "bot"],
  "author": "Your Name",
  "license": "ISC",
  "dependencies": {
    "discord.js": "^14.14.1",
    "@napi-rs/canvas": "^0.1.44",
    "dotenv": "^16.3.1"
  }
}
```

### 2. Cài đặt dependencies

```bash
npm install discord.js @napi-rs/canvas dotenv
```

### 3. Tạo file .env

```env
TOKEN=your_bot_token_here
PREFIX=!
CLIENT_ID=your_client_id
```

---

## 🔧 Cấu trúc Handler Pattern

### **Handler Pattern là gì?**

Handler Pattern là cách tổ chức code để:
- ✅ Tự động load commands từ các folder
- ✅ Tự động load events
- ✅ Dễ thêm/xóa lệnh mà không cần sửa file chính
- ✅ Code gọn gàng, dễ maintain

---

## 📝 HƯỚNG DẪN TẠO LỆNH MỚI

### **Bước 1: Tạo file lệnh**

Tạo file trong `commands/general/tenlenhcuaban.js`

### **Bước 2: Cấu trúc cơ bản của 1 lệnh**

```javascript
export default {
  name: 'tenlệnh',           // Tên lệnh (bắt buộc)
  aliases: ['alias1', 'alias2'],  // Tên gọi khác (tùy chọn)
  
  async execute(message) {
    // Code xử lý lệnh của bạn ở đây
    await message.reply('Hello World!');
  }
};
```

---

## 🎨 MẪU LỆNH CƠ BẢN

### **1. Lệnh đơn giản (Text)**

```javascript
export default {
  name: 'hello',
  aliases: ['hi', 'hey'],
  
  async execute(message) {
    await message.reply(`Xin chào ${message.author.username}!`);
  }
};
```

**Sử dụng:** `!hello`

---

### **2. Lệnh với tham số**

```javascript
export default {
  name: 'say',
  aliases: ['echo'],
  
  async execute(message, args) {
    if (!args.length) {
      return message.reply('❌ Vui lòng nhập nội dung!');
    }
    
    const text = args.join(' ');
    await message.channel.send(text);
    await message.delete(); // Xóa message gốc
  }
};
```

**Sử dụng:** `!say Hello World`

---

### **3. Lệnh với Embed**

```javascript
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'userinfo',
  aliases: ['ui'],
  
  async execute(message) {
    const user = message.mentions.users.first() || message.author;
    const member = await message.guild.members.fetch(user.id);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`Thông tin ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '📛 Tên', value: user.username, inline: true },
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '📅 Tham gia', value: member.joinedAt.toLocaleDateString('vi-VN') }
      )
      .setTimestamp()
      .setFooter({ text: `Yêu cầu bởi ${message.author.username}` });
    
    await message.reply({ embeds: [embed] });
  }
};
```

**Sử dụng:** `!userinfo @user`

---

### **4. Lệnh với Canvas (Tạo ảnh)**

```javascript
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

export default {
  name: 'welcome',
  aliases: ['wlc'],
  
  async execute(message) {
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#23272A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Avatar
    const avatarURL = message.author.displayAvatarURL({ 
      format: 'png', 
      size: 128 
    });
    const res = await fetch(avatarURL);
    const buffer = Buffer.from(await res.arrayBuffer());
    const avatar = await loadImage(buffer);
    
    ctx.drawImage(avatar, 25, 50, 150, 150);
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(`Welcome ${message.author.username}!`, 200, 140);
    
    const attachment = new AttachmentBuilder(
      canvas.toBuffer('image/png'),
      { name: 'welcome.png' }
    );
    
    await message.reply({ files: [attachment] });
  }
};
```

**Sử dụng:** `!welcome`

---

### **5. Lệnh mention user**

```javascript
export default {
  name: 'hug',
  aliases: ['ôm'],
  
  async execute(message) {
    const target = message.mentions.users.first();
    
    if (!target) {
      return message.reply('❌ Bạn cần mention ai đó!');
    }
    
    if (target.id === message.author.id) {
      return message.reply('❌ Bạn không thể tự ôm mình!');
    }
    
    await message.reply(`${message.author} đã ôm ${target}! 🤗`);
  }
};
```

**Sử dụng:** `!hug @user`

---

### **6. Lệnh random**

```javascript
export default {
  name: 'dice',
  aliases: ['xúc xắc', 'roll'],
  
  async execute(message, args) {
    const sides = parseInt(args[0]) || 6;
    
    if (sides < 2 || sides > 100) {
      return message.reply('❌ Số mặt phải từ 2-100!');
    }
    
    const result = Math.floor(Math.random() * sides) + 1;
    await message.reply(`🎲 Bạn tung được: **${result}** (/${sides})`);
  }
};
```

**Sử dụng:** `!dice` hoặc `!dice 20`

---

### **7. Lệnh với cooldown**

```javascript
const cooldowns = new Map();

export default {
  name: 'daily',
  aliases: ['điểm danh'],
  
  async execute(message) {
    const userId = message.author.id;
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 giờ
    
    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId) + cooldownTime;
      
      if (Date.now() < expirationTime) {
        const timeLeft = (expirationTime - Date.now()) / 1000 / 60 / 60;
        return message.reply(`<a:clock:1446769163669602335> Bạn cần đợi ${timeLeft.toFixed(1)} giờ nữa!`);
      }
    }
    
    cooldowns.set(userId, Date.now());
    await message.reply('✅ Bạn đã nhận 1000 xu!');
  }
};
```

**Sử dụng:** `!daily`

---

## 🎯 TEMPLATE ĐẦY ĐỦ CHO LỆNH CANVAS

```javascript
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

export default {
  name: 'profile',
  aliases: ['pf', 'userinfo'],

  async execute(message) {
    try {
      // 1. Lấy thông tin user
      const target = message.mentions.users.first() || message.author;
      const member = await message.guild.members.fetch(target.id);

      // 2. Tạo canvas
      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext('2d');

      // 3. Vẽ background
      ctx.fillStyle = '#2C2F33';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 4. Load và vẽ avatar
      const avatarURL = target.displayAvatarURL({ 
        format: 'png', 
        size: 256 
      });
      const res = await fetch(avatarURL);
      const buffer = Buffer.from(await res.arrayBuffer());
      const avatar = await loadImage(buffer);
      
      // Vẽ avatar tròn
      ctx.save();
      ctx.beginPath();
      ctx.arc(150, 200, 100, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 50, 100, 200, 200);
      ctx.restore();

      // 5. Vẽ text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 40px Arial';
      ctx.fillText(target.username, 280, 180);
      
      ctx.font = '24px Arial';
      ctx.fillStyle = '#99AAB5';
      ctx.fillText(`ID: ${target.id}`, 280, 220);

      // 6. Tạo attachment
      const attachment = new AttachmentBuilder(
        canvas.toBuffer('image/png'),
        { name: 'profile.png' }
      );

      // 7. Tạo embed (tùy chọn)
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Profile của ${target.username}`)
        .setImage('attachment://profile.png')
        .setTimestamp();

      // 8. Reply
      await message.reply({
        embeds: [embed],
        files: [attachment]
      });

    } catch (error) {
      console.error('Lỗi:', error);
      await message.reply('❌ Có lỗi xảy ra!');
    }
  }
};
```

---

## 📚 CÁC HÀM CANVAS THƯỜNG DÙNG

### **Vẽ hình chữ nhật bo góc**

```javascript
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

// Sử dụng
ctx.fillStyle = '#FFFFFF';
roundRect(ctx, 10, 10, 200, 100, 15);
ctx.fill();
```

### **Vẽ gradient**

```javascript
// Linear gradient
const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Radial gradient
const radial = ctx.createRadialGradient(400, 200, 0, 400, 200, 200);
radial.addColorStop(0, '#FF0000');
radial.addColorStop(1, '#0000FF');
ctx.fillStyle = radial;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

### **Vẽ text với shadow**

```javascript
ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
ctx.shadowBlur = 10;
ctx.shadowOffsetX = 5;
ctx.shadowOffsetY = 5;
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 48px Arial';
ctx.fillText('Hello World', 100, 100);
ctx.shadowBlur = 0; // Reset shadow
```

### **Cắt text quá dài**

```javascript
function wrapText(ctx, text, maxWidth) {
  let displayText = text;
  while (ctx.measureText(displayText).width > maxWidth && displayText.length > 0) {
    displayText = displayText.slice(0, -1);
  }
  return displayText.length < text.length ? displayText + '...' : displayText;
}

// Sử dụng
const shortText = wrapText(ctx, 'Text rất dài này sẽ bị cắt', 200);
ctx.fillText(shortText, 10, 50);
```

### **Vẽ progress bar**

```javascript
function drawProgressBar(ctx, x, y, width, height, percent, color) {
  // Background
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = '#99AAB5';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
  // Progress
  const progressWidth = (width - 4) * (percent / 100);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, progressWidth, height - 4);
  
  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${percent}%`, x + width / 2, y + height / 2 + 6);
  ctx.textAlign = 'left';
}

// Sử dụng
drawProgressBar(ctx, 50, 100, 300, 30, 75, '#43B581');
```

---

## 🔍 DEBUGGING & COMMON ERRORS

### **Lỗi: "Cannot read properties of undefined"**

```javascript
// ❌ Sai
const user = message.mentions.users.first();
await message.reply(`Hello ${user.username}`); // Lỗi nếu không mention

// ✅ Đúng
const user = message.mentions.users.first();
if (!user) {
  return message.reply('Vui lòng mention user!');
}
await message.reply(`Hello ${user.username}`);
```

### **Lỗi: "command.default is undefined"**

Đảm bảo file lệnh có `export default`:

```javascript
// ❌ Sai
export const command = { ... }

// ✅ Đúng
export default { ... }
```

### **Lỗi: Avatar không load**

```javascript
// ✅ Cách đúng để load avatar
const avatarURL = user.displayAvatarURL({ 
  format: 'png',  // Bắt buộc
  size: 256       // 128, 256, 512, 1024
});

const res = await fetch(avatarURL);
const buffer = Buffer.from(await res.arrayBuffer());
const avatar = await loadImage(buffer);
```

---

## 📋 CHECKLIST KHI TẠO LỆNH MỚI

- [ ] File có `export default`
- [ ] Có property `name`
- [ ] Có function `execute(message, args)`
- [ ] Có xử lý lỗi `try/catch`
- [ ] Có kiểm tra input từ user
- [ ] Test lệnh trong server
- [ ] Thêm aliases nếu cần
- [ ] Thêm cooldown nếu cần
- [ ] Thêm permission check nếu cần

---

## 🚀 TIPS & BEST PRACTICES

### **1. Luôn xử lý lỗi**

```javascript
async execute(message) {
  try {
    // Code của bạn
  } catch (error) {
    console.error('Lỗi:', error);
    await message.reply('❌ Có lỗi xảy ra!');
  }
}
```

### **2. Validate input**

```javascript
if (!args.length) {
  return message.reply('❌ Thiếu tham số!');
}

if (isNaN(args[0])) {
  return message.reply('❌ Phải là số!');
}
```

### **3. Sử dụng embed cho UX tốt hơn**

```javascript
const embed = new EmbedBuilder()
  .setColor(0x00FF00)
  .setTitle('Thành công!')
  .setDescription('Lệnh đã hoàn thành')
  .setTimestamp();

await message.reply({ embeds: [embed] });
```

### **4. Cache để tăng performance**

```javascript
// Lưu data tạm
const cache = new Map();

if (cache.has(userId)) {
  return cache.get(userId);
}

const data = await fetchData();
cache.set(userId, data);
return data;
```

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra console log
2. Đảm bảo intents đủ trong index.js
3. Kiểm tra token và permissions
4. Xem lại cấu trúc file

**Intents cần thiết:**

```javascript
import { GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});
```

---

## 📝 GHI CHÚ

- Lưu file này để tham khảo sau này
- Mỗi lệnh nên có 1 chức năng rõ ràng
- Code sạch, dễ đọc = dễ maintain
- Test kỹ trước khi deploy

**Chúc bạn code vui! 🎉**