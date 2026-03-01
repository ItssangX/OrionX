import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { User } from "../../database/models.js";
import { updateQuestProgress } from "../../utils/questHelper.js";
import { calculateReward } from "../../utils/buffHelper.js";
import { createOwnerCollector } from "../../utils/commandHelper.js";

const workCooldowns = new Map();

export default {
  name: "work",
  aliases: ["w", "lamviec"],

  async execute(message, args) {
    const userId = message.author.id;
    const cooldownTime = 15000;

    if (workCooldowns.has(userId)) {
      const expirationTime = workCooldowns.get(userId) + cooldownTime;
      const timeLeft = expirationTime - Date.now();

      if (timeLeft > 0) {
        const seconds = Math.ceil(timeLeft / 1000);
        const cooldownContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## <a:clock:1446769163669602335> CẦN NGHỈ NGƠI!\n\nBạn đã làm việc quá sức. Hãy thử lại sau **${seconds}** giây.`,
            ),
          );
        return message.reply({
          components: [cooldownContainer],
          flags: MessageFlags.IsComponentsV2,
          failIfNotExists: false,
        });
      }
    }

    try {
      let userData = await User.findOne({ userId });
      if (!userData) {
        userData = await User.create({
          userId,
          username: message.author.username,
        });
      }

      const taskType = Math.floor(Math.random() * 7) + 1;
      workCooldowns.set(userId, Date.now());

      switch (taskType) {
        case 1:
          await emojiTask(message, userData);
          break;
        case 2:
          await mathTask(message, userData);
          break;
        case 3:
          await reverseTask(message, userData);
          break;
        case 4:
          await memoryTask(message, userData);
          break;
        case 5:
          await colorTask(message, userData);
          break;
        case 6:
          await oddOneOutTask(message, userData);
          break;
        case 7:
          await scrambleTask(message, userData);
          break;
      }
    } catch (error) {
      console.error("Error in work command:", error);
      message.reply({
        content:
          "<a:no:1455096623804715080> Đã xảy ra lỗi khi thực hiện nhiệm vụ!",
        failIfNotExists: false,
      });
    }
  },
};

async function emojiTask(message, userData) {
  const emojis = ["🎯", "⭐", "💎", "🔥", "⚡", "🎨", "🎭", "🎪", "🎲", "🎰"];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  const successButton = new ButtonBuilder()
    .setCustomId("work_emoji_success")
    .setEmoji(randomEmoji)
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(successButton);

  const taskContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🎯 Nhiệm Vụ : Bấm Emoji\n\n > - Bấm Vào Emoji ${randomEmoji} bên dưới trong **10 giây**!`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents();

  taskContainer.addActionRowComponents(row);

  const taskMessage = await message.reply({
    components: [taskContainer],
    flags: MessageFlags.IsComponentsV2,
    failIfNotExists: false,
  });

  try {
    const interaction = await taskMessage.awaitMessageComponent({
      filter: (i) =>
        i.customId === "work_emoji_success" && i.user.id === message.author.id,
      time: 10000,
    });

    await interaction.deferUpdate();

    const baseAmount = 5000;
    const { total, multipliers, bonus } = calculateReward(
      userData,
      baseAmount,
      "work",
    );

    userData.money += total;
    await userData.save();
    await updateQuestProgress(userData.userId, "work_times", 1);

    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:checkyes:1455096631555915897> HOÀN THÀNH NHIỆM VỤ!\n\nChúc mừng! Bạn đã bấm đúng emoji ${randomEmoji}`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 💰 Phần Thưởng\n` +
          `- <a:pixelcoin:1456194056798339104> **Nhận:** +\`${total.toLocaleString()}\` <:Xcoin:1433810075927183441> ${bonus > 0 ? `(Buff: +\`${bonus.toLocaleString()}\`)` : ""}\n` +
          `- <a:money:1455553866182430751> **Số dư mới:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n\n` +
          (multipliers.length > 0
            ? `💡 **Buff active:** ${multipliers.map((m) => `\`${m.name}\``).join(", ")}`
            : ""),
        ),
      );

    await taskMessage.edit({ components: [successContainer] });
  } catch (error) {
    const failContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <a:no:1455096623804715080> THẤT BẠI!\n\nBạn đã quá chậm tay!",
      ),
    );
    await taskMessage.edit({ components: [failContainer] });
  }
}

async function mathTask(message, userData) {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ["+", "-", "x", ":"];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let question, answer;
  switch (operator) {
    case "+":
      question = `${num1} + ${num2}`;
      answer = num1 + num2;
      break;
    case "-":
      question = `${num1} - ${num2}`;
      answer = num1 - num2;
      break;
    case "x":
      question = `${num1} × ${num2}`;
      answer = num1 * num2;
      break;
    case ":":
      const divisor = Math.floor(Math.random() * 9) + 1;
      const dividend = divisor * (Math.floor(Math.random() * 10) + 1);
      question = `${dividend} ÷ ${divisor}`;
      answer = dividend / divisor;
      break;
  }

  const taskContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🧮 Nhiệm Vụ : Giải Toán\n\nTính: **${question} = ?**\n\nTrả lời trong vòng **15 giây**!`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Nhập đáp án của bạn vào khung chat.",
      ),
    );

  await message.reply({
    components: [taskContainer],
    flags: MessageFlags.IsComponentsV2,
    failIfNotExists: false,
  });

  try {
    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === message.author.id,
      max: 1,
      time: 15000,
      errors: ["time"],
    });

    const userAnswer = parseInt(collected.first().content);

    if (userAnswer === answer) {
      const baseAmount = 5000;
      const { total, multipliers, bonus } = calculateReward(
        userData,
        baseAmount,
        "work",
      );
      userData.money += total;
      await userData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:checkyes:1455096631555915897> CHÍNH XÁC!\n\n**${question} = ${answer}**. Bạn đã trả lời đúng!`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 💰 Phần Thưởng\n` +
            `- <a:pixelcoin:1456194056798339104> **Nhận:** +\`${total.toLocaleString()}\` <:Xcoin:1433810075927183441> ${bonus > 0 ? `(Buff: +\`${bonus.toLocaleString()}\`)` : ""}\n` +
            `- <a:money:1455553866182430751> **Số dư mới:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n\n` +
            (multipliers.length > 0
              ? `💡 **Buff active:** ${multipliers.map((m) => `\`${m.name}\``).join(", ")}`
              : ""),
          ),
        );

      await message.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    } else {
      const failContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:no:1455096623804715080> SAI RỒI!\n\nĐáp án đúng là: **${answer}**\nBạn trả lời: **${userAnswer}**`,
        ),
      );
      await message.reply({
        components: [failContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    }
  } catch (error) {
    const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## <a:clock:1446769163669602335> Hết Thời Gian!\n\nĐáp án đúng là: **${answer}**`,
      ),
    );
    await message.reply({
      components: [timeoutContainer],
      flags: MessageFlags.IsComponentsV2,
      failIfNotExists: false,
    });
  }
}

async function reverseTask(message, userData) {
  const words = [
    "orionx",
    "discord",
    "coding",
    "gaming",
    "dragon",
    "phoenix",
    "legend",
    "master",
    "champion",
    "victory",
  ];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const reversedWord = randomWord.split("").reverse().join("");

  const taskContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🔄 Nhiệm Vụ : Đảo Ngược Chữ\n\nHãy đảo ngược từ sau:\n\n**${reversedWord}**\n\nTrả lời trong vòng **15 giây**!`,
    ),
  );

  await message.reply({
    components: [taskContainer],
    flags: MessageFlags.IsComponentsV2,
    failIfNotExists: false,
  });

  try {
    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === message.author.id,
      max: 1,
      time: 15000,
      errors: ["time"],
    });

    const userAnswer = collected.first().content.toLowerCase().trim();

    if (userAnswer === randomWord) {
      const baseAmount = 5000;
      const { total, multipliers, bonus } = calculateReward(
        userData,
        baseAmount,
        "work",
      );
      userData.money += total;
      await userData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:checkyes:1455096631555915897> CHÍNH XÁC!\n\n**${reversedWord}** → **${randomWord}**. Bạn đã đảo ngược đúng!`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 💰 Phần Thưởng\n` +
            `- <a:pixelcoin:1456194056798339104> **Nhận:** +\`${total.toLocaleString()}\` <:Xcoin:1433810075927183441> ${bonus > 0 ? `(Buff: +\`${bonus.toLocaleString()}\`)` : ""}\n` +
            `- <a:money:1455553866182430751> **Số dư mới:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>\n\n` +
            (multipliers.length > 0
              ? `💡 **Buff active:** ${multipliers.map((m) => `\`${m.name}\``).join(", ")}`
              : ""),
          ),
        );

      await message.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    } else {
      const failContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:no:1455096623804715080> SAI RỒI!\n\nĐáp án đúng là: **${randomWord}**`,
        ),
      );
      await message.reply({
        components: [failContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    }
  } catch (error) {
    const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## <a:clock:1446769163669602335> Hết Thời Gian!\n\nĐáp án đúng là: **${randomWord}**`,
      ),
    );
    await message.reply({
      components: [timeoutContainer],
      flags: MessageFlags.IsComponentsV2,
      failIfNotExists: false,
    });
  }
}

async function memoryTask(message, userData) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = Math.floor(Math.random() * 3) + 5;
  let randomString = "";
  for (let i = 0; i < length; i++)
    randomString += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );

  const taskContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🧠 Nhiệm Vụ : Nhớ Ký Tự\n\nHãy nhớ chuỗi ký tự sau:\n\n**${randomString}**\n\nBấm nút bên dưới để bắt đầu!`,
    ),
  );

  const button = new ButtonBuilder()
    .setCustomId("memory_start")
    .setLabel("Bắt đầu")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("▶️");
  const row = new ActionRowBuilder().addComponents(button);

  taskContainer.addActionRowComponents(row);

  const taskMessage = await message.reply({
    components: [taskContainer],
    flags: MessageFlags.IsComponentsV2,
    failIfNotExists: false,
  });

  try {
    const buttonClick = await taskMessage.awaitMessageComponent({
      filter: (i) =>
        i.customId === "memory_start" && i.user.id === message.author.id,
      time: 30000,
    });

    const hiddenContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## 🧠 Nhiệm Vụ : Nhớ Ký Tự\n\nHãy nhập lại chuỗi ký tự bạn vừa nhìn thấy!\n\nThời gian: **20 giây**",
      ),
    );

    await buttonClick.update({ components: [hiddenContainer] });

    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === message.author.id,
      max: 1,
      time: 20000,
      errors: ["time"],
    });

    const userAnswer = collected.first().content.toUpperCase().trim();

    if (userAnswer === randomString) {
      const baseAmount = 6000;
      const { total, multipliers, bonus } = calculateReward(
        userData,
        baseAmount,
        "work",
      );
      userData.money += total;
      await userData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:checkyes:1455096631555915897> TRÍ NHỚ TUYỆT VỜI!\n\nBạn đã nhớ chính xác: **${randomString}**`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 💰 Phần Thưởng\n- <a:pixelcoin:1456194056798339104> **Nhận:** +\`${total.toLocaleString()}\` <:Xcoin:1433810075927183441> ${bonus > 0 ? `(Buff: +\`${bonus.toLocaleString()}\`)` : ""}\n- <a:money:1455553866182430751> **Số dư mới:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>` +
            (multipliers.length > 0
              ? `\n\n💡 **Buff active:** ${multipliers.map((m) => `\`${m.name}\``).join(", ")}`
              : ""),
          ),
        );

      await message.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    } else {
      const failContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:no:1455096623804715080> SAI RỒI!\n\nChuỗi đúng là: **${randomString}**`,
        ),
      );
      await message.reply({
        components: [failContainer],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    }
  } catch (error) {
    const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <a:clock:1446769163669602335> Hết Thời Gian!",
      ),
    );
    await message.reply({
      components: [timeoutContainer],
      flags: MessageFlags.IsComponentsV2,
      failIfNotExists: false,
    });
  }
}

async function colorTask(message, userData) {
  const colors = [
    { name: "Red", emoji: "🔴", style: ButtonStyle.Danger, id: "color_red" },
    { name: "Blue", emoji: "🔵", style: ButtonStyle.Primary, id: "color_blue" },
    {
      name: "Green",
      emoji: "🟢",
      style: ButtonStyle.Success,
      id: "color_green",
    },
    {
      name: "Yellow",
      emoji: "🟡",
      style: ButtonStyle.Secondary,
      id: "color_yellow",
    },
  ];

  const sequence = [];
  for (let i = 0; i < 3; i++)
    sequence.push(colors[Math.floor(Math.random() * colors.length)]);

  const taskContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🚥 Nhớ Màu Sắc\n\n- Hãy nhớ thứ tự màu sau:\n# ${sequence.map((c) => c.emoji).join(" ")}\n\n> - Bấm nút bên dưới để bắt đầu!`,
    ),
  );

  const startBtn = new ButtonBuilder()
    .setCustomId("color_start")
    .setLabel("Bắt đầu")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("▶️");
  taskContainer.addActionRowComponents(
    new ActionRowBuilder().addComponents(startBtn),
  );

  const taskMessage = await message.reply({
    components: [taskContainer],
    flags: MessageFlags.IsComponentsV2,
    failIfNotExists: false,
  });

  try {
    const startClick = await taskMessage.awaitMessageComponent({
      filter: (i) =>
        i.customId === "color_start" && i.user.id === message.author.id,
      time: 20000,
    });

    const inputContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## 🚥 Nhớ Màu Sắc\n\n- Hãy chọn các nút theo đúng thứ tự màu vừa hiện!",
      ),
    );

    const buttons = colors.map((c) =>
      new ButtonBuilder().setCustomId(c.id).setEmoji(c.emoji).setStyle(c.style),
    );
    inputContainer.addActionRowComponents(
      new ActionRowBuilder().addComponents(buttons),
    );

    await startClick.update({ components: [inputContainer] });

    let currentIndex = 0;
    const collector = createOwnerCollector(taskMessage, message.author.id, {
      time: 20000,
    });

    collector.on("collect", async (i) => {
      try {
        await i.deferUpdate();

        if (i.customId === sequence[currentIndex].id) {
          currentIndex++;
          if (currentIndex === sequence.length) {
            collector.stop("success");
            const baseAmount = 8000;
            const { total, bonus } = calculateReward(
              userData,
              baseAmount,
              "work",
            );
            userData.money += total;
            await userData.save();
            await updateQuestProgress(userData.userId, "work_times", 1);

            const success = new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## <a:checkyes:1455096631555915897> THÀNH CÔNG!\n\nBạn có trí nhớ thật tuyệt vời!\n\n**Nhận:** +\`${total.toLocaleString()}\` <:Xcoin:1433810075927183441> ${bonus > 0 ? `(Buff: +\`${bonus.toLocaleString()}\`)` : ""}`,
              ),
            );
            await i.editReply({ components: [success] });
          } else {
            // Deferred
          }
        } else {
          collector.stop("fail");
          const fail = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <a:no:1455096623804715080> SAI RỒI!\n\nBạn đã bấm sai thứ tự màu sắc.",
            ),
          );
          await i.editReply({ components: [fail] });
        }
      } catch (e) {
        console.error("Color Task Error:", e);
      }
    });
  } catch (e) {
    const timeout = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <a:clock:1446769163669602335> Hết Thời Gian!",
      ),
    );
    await taskMessage.edit({ components: [timeout] });
  }
}

async function oddOneOutTask(message, userData) {
  const sets = [
    { valid: "🍎", fake: "🍒" },
    { valid: "🐶", fake: "🐱" },
    { valid: "⚽", fake: "🏀" },
    { valid: "🚗", fake: "🚕" },
    { valid: "🍔", fake: "🍕" },
  ];
  const set = sets[Math.floor(Math.random() * sets.length)];
  const options = [set.valid, set.valid, set.valid, set.fake].sort(
    () => Math.random() - 0.5,
  );

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "## 🔍 Tìm điểm khác biệt\n\nHãy tìm emoji khác loại trong 4 lựa chọn dưới đây!",
    ),
  );

  const row = new ActionRowBuilder();
  options.forEach((emoji, index) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`odd_${index}`)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary),
    );
  });

  container.addActionRowComponents(row);

  const msg = await message.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    failIfNotExists: false,
  });

  try {
    const interaction = await msg.awaitMessageComponent({
      filter: (i) => i.user.id === message.author.id,
      time: 10000,
    });

    const choiceId = interaction.customId.split("_")[1];
    if (options[choiceId] === set.fake) {
      const baseAmount = 6000;
      const { total, bonus } = calculateReward(userData, baseAmount, "work");
      userData.money += total;
      await userData.save();
      await updateQuestProgress(userData.userId, "work_times", 1);

      const win = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:checkyes:1455096631555915897> CHÍNH XÁC!\n\n> - Bạn đã tìm thấy **${set.fake}** ẩn nấp!\n\n**Nhận:** +\`${total.toLocaleString()}\` <:Xcoin:1433810075927183441> ${bonus > 0 ? `(Buff: +\`${bonus.toLocaleString()}\`)` : ""}`,
        ),
      );
      await interaction.update({ components: [win] });
    } else {
      const lose = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:no:1455096623804715080> SAI RỒI!\n\n> - Bạn đã chọn nhầm ${options[choiceId]}. Đáng lẽ phải là ${set.fake}!`,
        ),
      );
      await interaction.update({ components: [lose] });
    }
  } catch (e) {
    const time = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <a:clock:1446769163669602335> Hết Thời Gian!",
      ),
    );
    await msg.edit({ components: [time] });
  }
}

async function scrambleTask(message, userData) {
  const words = [
    "MEO",
    "CHO",
    "BOT",
    "GAME",
    "DEPTRAI",
    "ORIONX",
    "VIP",
    "PET",
    "TIEN",
    "BAC",
  ];
  const originalWord = words[Math.floor(Math.random() * words.length)];
  const scrambled = originalWord
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🔡 Giải Mã Từ\n\nHãy sắp xếp lại các chữ cái sau thành từ có nghĩa:\n\n# \`${scrambled}\`\n\nThời gian: **15 giây**`,
    ),
  );

  await message.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    failIfNotExists: false,
  });

  try {
    const collected = await message.channel.awaitMessages({
      filter: (m) => m.author.id === message.author.id,
      max: 1,
      time: 15000,
      errors: ["time"],
    });

    if (collected.first().content.toUpperCase() === originalWord) {
      const baseAmount = 10000;
      const { total, bonus } = calculateReward(userData, baseAmount, "work");
      userData.money += total;
      await userData.save();
      await updateQuestProgress(userData.userId, "work_times", 1);

      const win = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:checkyes:1455096631555915897> GIẢI MÃ THÀNH CÔNG!\n\nTừ đúng là: **${originalWord}**\n\n**Nhận:** +\`${total.toLocaleString()}\` <:Xcoin:1433810075927183441> ${bonus > 0 ? `(Buff: +\`${bonus.toLocaleString()}\`)` : ""}`,
        ),
      );
      await message.reply({
        components: [win],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    } else {
      const lose = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:no:1455096623804715080> SAI RỒI!\n\nTừ đúng phải là: **${originalWord}**`,
        ),
      );
      await message.reply({
        components: [lose],
        flags: MessageFlags.IsComponentsV2,
        failIfNotExists: false,
      });
    }
  } catch (e) {
    const time = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## <a:clock:1446769163669602335> Hết Thời Gian!\n\nTừ đúng là: **${originalWord}**`,
      ),
    );
    await message.reply({
      components: [time],
      flags: MessageFlags.IsComponentsV2,
      failIfNotExists: false,
    });
  }
}
