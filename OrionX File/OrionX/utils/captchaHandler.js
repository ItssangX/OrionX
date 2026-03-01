import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from "discord.js";
import logger from "./logger.js";
import { User } from "../database/models.js";
import { getCaptchaConfig, ADMIN_ID } from "../config/captchaConfig.js";

// Constants
const COMMAND_THRESHOLD = 250;
const MAX_ATTEMPTS = 3;
const CAPTCHA_TIMEOUT_MS = 300000;

function resetCaptchaChallengeState(userDoc, resetCommandCount = false) {
  if (!userDoc.captcha) userDoc.captcha = {};
  userDoc.captcha.verificationPending = false;
  userDoc.captcha.challengeAttempts = 0;
  userDoc.captcha.challengeExpiresAt = null;
  userDoc.captcha.currentCaptchaAnswer = null;
  userDoc.captcha.currentCaptchaId = null;
  if (resetCommandCount) {
    userDoc.captcha.commandCount = 0;
  }
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function chooseRandomCaptcha() {
  const captchas = getCaptchaConfig();
  if (!captchas.length) return null;
  return captchas[Math.floor(Math.random() * captchas.length)];
}

function scheduleCaptchaTimeout(dmChannel, userId, captchaId) {
  const timer = setTimeout(async () => {
    try {
      const latestUser = await User.findOne({ userId }).select(
        "userId username captcha",
      );
      if (!latestUser?.captcha?.verificationPending) return;

      const currentCaptchaId = String(
        latestUser.captcha.currentCaptchaId || "",
      );
      if (currentCaptchaId !== String(captchaId || "")) return;

      const expiresAt = latestUser.captcha.challengeExpiresAt
        ? new Date(latestUser.captcha.challengeExpiresAt).getTime()
        : 0;

      if (expiresAt && Date.now() < expiresAt) return;

      await onCaptchaAttemptFailed(
        dmChannel.client,
        dmChannel,
        latestUser,
        "> <a:clock:1446769163669602335> **Captcha hết hạn.** Đang gửi mã mới.",
      );
    } catch (err) {
      logger.error("Captcha timeout scheduler failed:", err);
    }
  }, CAPTCHA_TIMEOUT_MS + 1500);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

async function sendCaptchaChallenge(dmChannel, userDoc) {
  const currentCaptcha = chooseRandomCaptcha();
  if (!currentCaptcha) {
    throw new Error("No captchas configured in .env");
  }

  const attemptNumber = (userDoc.captcha?.challengeAttempts || 0) + 1;
  const captchaEmbed = new EmbedBuilder()
    .setColor("#0099FF")
    .setTitle(
      `<:redmemberids_:1476463354095734837> Captcha Xác Minh (${attemptNumber}/${MAX_ATTEMPTS})`,
    )
    .setDescription(
      `> <a:gtaarrow:1474804678024761476> Nhập mã trong ảnh và gửi tại DM.\n` +
      `> <a:gtaarrow:1474804678024761476> Phân biệt hoa/thường\n` +
      `> <a:clock:1446769163669602335> Thời Gian: **5 phút**.`,
    )
    .setImage(currentCaptcha.image)
    .setFooter({
      text: "OrionX Security System",
    });

  await dmChannel.send({ embeds: [captchaEmbed] });

  userDoc.captcha.currentCaptchaAnswer = String(currentCaptcha.answer);
  userDoc.captcha.currentCaptchaId = String(currentCaptcha.id);
  userDoc.captcha.challengeExpiresAt = new Date(
    Date.now() + CAPTCHA_TIMEOUT_MS,
  );
  await userDoc.save();

  scheduleCaptchaTimeout(
    dmChannel,
    userDoc.userId,
    userDoc.captcha.currentCaptchaId,
  );
}

async function markCaptchaFailed(client, dmChannel, userDoc) {
  userDoc.captcha.bannedTemporarily = true;
  resetCaptchaChallengeState(userDoc, false);
  await userDoc.save();

  const failEmbed = new EmbedBuilder()
    .setColor("#FF0000")
    .setTitle("<a:clock:1446769163669602335> Tài Khoản Tạm Khóa")
    .setDescription(
      `> <a:bluearrow:1474805094322012221> Trượt captcha **${MAX_ATTEMPTS}/${MAX_ATTEMPTS}**.\n` +
      `> <a:lightbulb:1455096627894423637> Vui lòng chờ admin xử lý.`,
    )
    .setTimestamp();

  await dmChannel.send({ embeds: [failEmbed] });

  logger.info(`User ${userDoc.userId} failed captcha. Notifying admin.`);
  await notifyAdmin(client, userDoc);
}

async function onCaptchaAttemptFailed(client, dmChannel, userDoc, failText) {
  userDoc.captcha.challengeAttempts =
    (userDoc.captcha.challengeAttempts || 0) + 1;
  userDoc.captcha.currentCaptchaAnswer = null;
  userDoc.captcha.currentCaptchaId = null;
  userDoc.captcha.challengeExpiresAt = null;

  if (userDoc.captcha.challengeAttempts >= MAX_ATTEMPTS) {
    await markCaptchaFailed(client, dmChannel, userDoc);
    return;
  }

  await userDoc.save();
  if (failText) {
    await dmChannel.send(failText);
  }
  await sendCaptchaChallenge(dmChannel, userDoc);
}

/**
 * Check and enforce captcha status for a user
 * Now accepts a lightweight captcha data object (lean) instead of full Mongoose doc.
 * Uses atomic updates to avoid writing back the entire user document.
 * @param {object} message - Discord message object
 * @param {object} captchaData - Lean object with { userId, captcha } fields
 * Returns true if user can proceed with command, false if blocked
 */
export async function checkCaptchaStatus(message, captchaData) {
  const captcha = captchaData.captcha || {};

  // 1. Check mute/ban status first
  if (captcha.isPermBanned) return false;

  if (captcha.muteUntil && new Date() < new Date(captcha.muteUntil)) {
    const muteEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("<a:clock:1446769163669602335> Đang Mute")
      .setDescription(
        `> <a:bluearrow:1474805094322012221> Gỡ mute: <t:${Math.floor(new Date(captcha.muteUntil).getTime() / 1000)}:R>`,
      )
      .setTimestamp();
    await message.reply({ embeds: [muteEmbed] });
    return false;
  }

  if (captcha.bannedTemporarily) {
    const banEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("<a:clock:1446769163669602335> Tài Khoản Tạm Khóa")
      .setDescription(
        `> <a:bluearrow:1474805094322012221> Bạn đang bị tạm khóa do trượt captcha.\n` +
        `> <a:lightbulb:1455096627894423637> Chờ admin mở lại quyền.`,
      )
      .setTimestamp();
    await message.reply({ embeds: [banEmbed] });
    return false;
  }

  // 2. Check pending verification
  if (captcha.verificationPending) {
    const warningContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "> <a:clock:1446769163669602335> **Hoàn tất captcha trong DM để tiếp tục.**",
      ),
    );

    try {
      await message.reply({
        components: [warningContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (e) {
      logger.error("Cannot reply to pending captcha warning:", e);
    }
    return false;
  }

  // 3. Atomic increment counter (no full document save)
  const newCount = (captcha.commandCount || 0) + 1;

  // 4. Check threshold
  if (newCount >= COMMAND_THRESHOLD) {
    // Only load full Mongoose doc when threshold is hit
    const user = await User.findOne({ userId: captchaData.userId }).select(
      "userId username captcha",
    );

    if (user) {
      user.captcha.commandCount = newCount;
      user.captcha.verificationPending = true;
      user.captcha.challengeAttempts = 0;
      user.captcha.challengeExpiresAt = null;
      user.captcha.currentCaptchaAnswer = null;
      user.captcha.currentCaptchaId = null;
      await user.save();

      startCaptchaFlow(message, user).catch((err) => {
        logger.error("startCaptchaFlow failed:", err);
      });
    }
    return false;
  }

  // Atomic increment - no need to load/save full document
  await User.updateOne(
    { userId: captchaData.userId },
    { $inc: { "captcha.commandCount": 1 } },
  );
  return true;
}

/**
 * Start the DM captcha flow
 */
async function startCaptchaFlow(message, user) {
  if (!chooseRandomCaptcha()) {
    logger.error("No captchas configured in .env!");
    resetCaptchaChallengeState(user, true);
    await user.save();
    return;
  }

  // Notify user in server using Components V2
  const notifyContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <:redmemberids_:1476463354095734837> Captcha Bảo Mật <:redmemberids_:1476463354095734837>",
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> <a:bluearrow:1474805094322012221> Bạn đã chạm mốc **${COMMAND_THRESHOLD}** lệnh.\n` +
        `> <a:greenarrow:1474805097337852047> Mở DM để xác minh và tiếp tục.`,
      ),
    );

  const checkBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Mở DM")
      .setEmoji("<:botgradient_:1476463355781972091>")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/users/${message.client.user.id}`),
  );

  notifyContainer.addActionRowComponents(checkBtn);

  try {
    await message.reply({
      components: [notifyContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (e) {
    logger.error("Cant reply to user:", e);
  }

  // Try to open DM
  let dmChannel;
  try {
    dmChannel = await message.author.createDM();
  } catch (err) {
    const failEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("<a:no:1455096623804715080> Không Gửi Được DM")
      .setDescription(
        `> <a:lightbulb:1455096627894423637> Vui lòng bật DM rồi thử lại.`,
      );

    await message.channel.send({ embeds: [failEmbed] });

    // Reset pending so they can try again later
    resetCaptchaChallengeState(user, false);
    await user.save();
    return;
  }

  await dmChannel.send(
    "## <:staffpurple_:1476463348030898317> Xác Minh Captcha <:staffpurple_:1476463348030898317>\n" +
    "> <a:bluearrow:1474805094322012221> Nhập mã trong ảnh bằng **văn bản**.\n" +
    "> <a:clock:1446769163669602335> Thời Gian: **5 phút**.",
  );
  await sendCaptchaChallenge(dmChannel, user);
}

/**
 * Handle DM replies for captcha verification.
 * Returns true when the DM message is consumed by captcha flow.
 */
export async function handleCaptchaDMMessage(message) {
  if (message.guild || message.author.bot) return false;

  const userDoc = await User.findOne({ userId: message.author.id }).select(
    "userId username captcha",
  );
  if (!userDoc?.captcha?.verificationPending) {
    return false;
  }

  const rawAnswer = String(message.content || "").trim();
  if (!rawAnswer) {
    await message.channel.send(
      "> <a:lightbulb:1455096627894423637> Vui lòng nhập mã captcha bằng văn bản.",
    );
    return true;
  }

  if (userDoc.captcha.isPermBanned || userDoc.captcha.bannedTemporarily) {
    return true;
  }

  const expiresAt = userDoc.captcha.challengeExpiresAt
    ? new Date(userDoc.captcha.challengeExpiresAt).getTime()
    : 0;
  const hasExpired = !expiresAt || Date.now() > expiresAt;

  if (hasExpired) {
    await onCaptchaAttemptFailed(
      message.client,
      message.channel,
      userDoc,
      "### <a:clock:1446769163669602335> Captcha hết hạn.\n" + "> - <:refresh:1455096616976650392> Đang gửi mã mới.",
    );
    return true;
  }

  if (!userDoc.captcha.currentCaptchaAnswer) {
    await sendCaptchaChallenge(message.channel, userDoc);
    return true;
  }

  const isCorrect =
    normalizeAnswer(rawAnswer) ===
    normalizeAnswer(userDoc.captcha.currentCaptchaAnswer);

  if (isCorrect) {
    resetCaptchaChallengeState(userDoc, true);
    await userDoc.save();

    const successEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription(
        `# <:approvedidsmember_:1476463346457903237> Xác Minh Thành Công!.\n` +
        `> - <:greentick_:1476463390426927114> Captcha hợp lệ.\n` +
        `> - <:approvedidsmember_:1476463346457903237> Bạn có thể tiếp tục dùng bot.`,
      )
      .setTimestamp();

    await message.channel.send({ embeds: [successEmbed] });
    return true;
  }

  await onCaptchaAttemptFailed(
    message.client,
    message.channel,
    userDoc,
    `### <a:no:1455096623804715080> Mã captcha chưa đúng.\n` +
    `> - <a:lightbulb:1455096627894423637> Đang gửi mã mới.`,
  );
  return true;
}

/**
 * Send notification panel to admin
 */
async function notifyAdmin(client, userDoc) {
  try {
    logger.info(
      `Attempting to notify admin (${ADMIN_ID}) about user ${userDoc.username} failing captcha.`,
    );
    const adminUser = await client.users.fetch(ADMIN_ID);
    if (!adminUser) {
      logger.error(`Could not find admin user with ID: ${ADMIN_ID}`);
      return;
    }

    const adminEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("<a:clock:1446769163669602335> Cảnh Báo Captcha")
      .setDescription(
        `> <a:bluearrow:1474805094322012221> Người dùng trượt captcha **${MAX_ATTEMPTS}/${MAX_ATTEMPTS}**.\n` +
        `> <a:lightbulb:1455096627894423637> Chọn hành động xử lý.`,
      )
      .addFields(
        {
          name: "Người dùng",
          value: `**${userDoc.username}**\n\`${userDoc.userId}\``,
          inline: true,
        },
        {
          name: "Trạng thái",
          value: "<a:bluearrow:1474805094322012221> Tạm khóa",
          inline: true,
        },
        {
          name: "Lý do",
          value: "<a:lightbulb:1455096627894423637> Trượt 3 lần liên tiếp",
          inline: true,
        },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`captcha_unban_${userDoc.userId}`)
        .setLabel("Gỡ khóa")
        .setStyle(ButtonStyle.Success)
        .setEmoji("<a:checkyes:1455096631555915897>"),
      new ButtonBuilder()
        .setCustomId(`captcha_mute_${userDoc.userId}`)
        .setLabel("Mute")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<a:clock:1446769163669602335>"),
      new ButtonBuilder()
        .setCustomId(`captcha_ban_permanent_${userDoc.userId}`)
        .setLabel("Ban vĩnh viễn")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("<a:bluearrow:1474805094322012221>"),
    );

    await adminUser.send({ embeds: [adminEmbed], components: [row] });
    logger.info(
      `Successfully notified admin (${ADMIN_ID}) about ${userDoc.username}.`,
    );
  } catch (err) {
    logger.error("Failed to notify admin:", err);
  }
}
