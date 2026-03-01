/**
 * ============================================
 * OUTSV.JS - Tu dong roi server duoi nguong mem
 * ============================================
 * Cach su dung: node scripts/outsv.js
 * Script nay co the chay doc lap khi bot dang online.
 * Chinh cac config ben duoi truoc khi chay.
 */

import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });
delete process.env.SHARD_COUNT; // Tranh loi parse "auto" khi chay script rieng

// ============================================
// CAU HINH - CHINH O DAY
// ============================================

const MIN_MEMBER_COUNT = 10; // Bot se roi cac server co member < muc nay
const LEAVE_DELAY_MS = 1500; // Delay giua moi lan roi server (ms)
const DRY_RUN = false; // true = chi log, false = thuc su roi server
const EXCLUDED_GUILD_IDS = [
  // "123456789012345678", // Them ID server khong muon out
];
const OWNER_DM_THUMBNAIL_URL =
  "https://media.discordapp.net/attachments/1429068134668832848/1456601871484584009/Orion_Avatar.png?ex=699ed534&is=699d83b4&hm=60a8c12ffdcf032b0fb514bbe4ea98c983b57ebe61e30c1f612e493edf038ad3&=&format=webp&quality=lossless&width=799&height=799"; // Dán link thumbnail vào đây (vd: https://.../thumb.png)
const OWNER_DM_IMAGE_URL =
  "https://media.discordapp.net/attachments/1429068134668832848/1456602423614378026/standard.gif?ex=699ed5b8&is=699d8438&hm=f53371383d1572a88e6ef5e815f69d07b66f382c1788098d3dec9944754b936c&=&width=1804&height=105"; // Dán link ảnh lớn phía dưới embed vào đây (vd: https://.../banner.png)

// ============================================
// NOI DUNG DM OWNER
// ============================================

function buildOwnerMessage(guildName, memberCount) {
  return [
    `> **Gửi Owner Server ${guildName},**`,
    "",
    "**OrionX** chân thành xin lỗi vì sự bất tiện này.",
    "Hiện tại bot chưa hoàn tất quy trình xác minh với Discord,",
    "vì vậy hệ thống cần tạm thời tối ưu số lượng máy chủ để đảm bảo vận hành ổn định.",
    "",
    "**📌 Thông Tin**",
    `> - Thành viên hiện tại: **${memberCount}**`,
    `? - Ngưỡng duy trì tạm thời: **< ${MIN_MEMBER_COUNT} thành viên**`,
    "",
    "**⚠️ Hành động hệ thống**",
    "> - Bot sẽ tạm thời rời khỏi máy chủ của bạn sau thông báo này.",
    "> - Đây là điều chỉnh kỹ thuật tạm thời, không ảnh hưởng dữ liệu ngoài máy chủ.",
    "",
    "**🤝 Cam kết**",
    "Sau khi hoàn tất xác minh, chúng tôi rất mong có cơ hội quay lại phục vụ cộng đồng của bạn.",
    "Nhận thông tin mới nhất và Support tại: https://discord.gg/3AgHp9CXJP",
    "",
    "Trân trọng cảm ơn sự thông cảm và đồng hành của bạn.",
    "",
    "*OrionX Team*",
  ].join("\n");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function notifyGuildOwner(guild, memberCount) {
  try {
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle("📣 ** Thông Báo Từ OrionX**")
      .setDescription(buildOwnerMessage(guild.name, memberCount))
      .addFields(
        { name: "Máy chủ", value: `${guild.name}\n\`${guild.id}\`` },
        {
          name: "Lý do điều chỉnh",
          value:
            "Tối ưu vận hành trong thời gian bot chưa xác minh chính thức.",
        },
      )
      .setTimestamp()
      .setFooter({ text: "OrionX • Xin lỗi vì sự bất tiện" });

    if (OWNER_DM_THUMBNAIL_URL) {
      embed.setThumbnail(OWNER_DM_THUMBNAIL_URL);
    }
    if (OWNER_DM_IMAGE_URL) {
      embed.setImage(OWNER_DM_IMAGE_URL);
    }

    await owner.send({ embeds: [embed] });
    return { success: true, ownerTag: owner.user.tag, ownerId: owner.id };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

async function outSmallServers() {
  console.log("[1/4] Dang dong bo danh sach server...");
  await client.guilds.fetch();

  const allGuilds = [...client.guilds.cache.values()];
  const targetGuilds = allGuilds
    .filter(
      (guild) =>
        !EXCLUDED_GUILD_IDS.includes(guild.id) &&
        (guild.memberCount ?? 0) < MIN_MEMBER_COUNT,
    )
    .sort((a, b) => (a.memberCount ?? 0) - (b.memberCount ?? 0));

  console.log(
    `[2/4] Tong server: ${allGuilds.length} | Server duoi nguong: ${targetGuilds.length}`,
  );
  console.log(
    `[Config] MIN_MEMBER_COUNT=${MIN_MEMBER_COUNT}, DRY_RUN=${DRY_RUN}, DELAY=${LEAVE_DELAY_MS}ms`,
  );

  if (targetGuilds.length === 0) {
    console.log("[Done] Khong co server nao can out.");
    return;
  }

  let dmSuccess = 0;
  let dmFailed = 0;
  let leaveSuccess = 0;
  let leaveFailed = 0;

  for (let i = 0; i < targetGuilds.length; i += 1) {
    const guild = targetGuilds[i];
    const memberCount = guild.memberCount ?? 0;
    const progress = `[${i + 1}/${targetGuilds.length}]`;

    console.log(
      `${progress} ${guild.name} (${guild.id}) - ${memberCount} members`,
    );

    if (DRY_RUN) {
      console.log(`${progress} DRY_RUN: bo qua DM va leave.`);
      continue;
    }

    const dmResult = await notifyGuildOwner(guild, memberCount);
    if (dmResult.success) {
      dmSuccess += 1;
      console.log(
        `${progress} DM owner thanh cong: ${dmResult.ownerTag} (${dmResult.ownerId})`,
      );
    } else {
      dmFailed += 1;
      console.log(`${progress} DM owner that bai: ${dmResult.reason}`);
    }

    try {
      await guild.leave();
      leaveSuccess += 1;
      console.log(`${progress} Da roi server thanh cong.`);
    } catch (error) {
      leaveFailed += 1;
      console.log(`${progress} Roi server that bai: ${error.message}`);
    }

    if (LEAVE_DELAY_MS > 0) {
      await sleep(LEAVE_DELAY_MS);
    }
  }

  console.log("\n========================================");
  console.log("KET QUA OUTSV");
  console.log("========================================");
  console.log(`Tong server dang co: ${allGuilds.length}`);
  console.log(`Server duoi nguong: ${targetGuilds.length}`);
  console.log(`DM owner thanh cong: ${dmSuccess}`);
  console.log(`DM owner that bai: ${dmFailed}`);
  console.log(`Out server thanh cong: ${leaveSuccess}`);
  console.log(`Out server that bai: ${leaveFailed}`);
  console.log(`Thoi gian: ${new Date().toLocaleString("vi-VN")}`);
  console.log("========================================");
}

async function main() {
  if (!process.env.TOKEN) {
    console.error("[ERROR] Thieu TOKEN trong file .env");
    process.exit(1);
  }

  try {
    console.log("[0/4] Dang dang nhap bot...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Login timeout: khong nhan duoc ready event"));
      }, 30000);

      client.once("ready", () => {
        clearTimeout(timeout);
        console.log(`[READY] ${client.user.tag} (${client.user.id})`);
        resolve();
      });

      client.login(process.env.TOKEN).catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    await outSmallServers();
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error("[ERROR]", error.message);
    client.destroy();
    process.exit(1);
  }
}

main();
