import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { User } from '../../database/models.js';
import { updateQuestProgress } from '../../utils/questHelper.js';
import { calculateReward } from '../../utils/buffHelper.js';
import { getBetAmount, createOwnerCollector } from '../../utils/commandHelper.js';

export default {
  name: 'coinflip',
  aliases: ['cf', 'flip', 'coin'],

  async execute(message, args) {
    try {
      let choice = (args.length >= 2 ? args[0].toLowerCase() : null);
      let betInput = (args.length >= 2 ? args[1].toLowerCase() : args[0]?.toLowerCase());

      if (!betInput) {
        const guideContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:coinflip:1456570452519686272> COINFLIP'))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Cú pháp:** \`xcf <heads/tails> <tiền>\` hoặc \`xcf <tiền>\`\n` +
            `**Ví dụ:** \`xcf heads 1000\` hoặc \`xcf 1000\``
          ));
        return message.reply({ components: [guideContainer], flags: MessageFlags.IsComponentsV2 });
      }

      if (choice && choice !== 'heads' && choice !== 'tails' && choice !== 'ngua' && choice !== 'sap') {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> Chọn `heads` (ngửa) hoặc `tails` (sấp)!'));
        return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }

      let userData = await User.findOne({ userId: message.author.id }) || await User.create({ userId: message.author.id, username: message.author.username, money: 0 });

      const betAmount = getBetAmount(betInput, userData.money, 250000);

      if (isNaN(betAmount) || betAmount <= 0) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> Số tiền phải là **số dương**!'));
        return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
      if (betAmount < 100) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> Cược tối thiểu: `100` <:Xcoin:1433810075927183441>'));
        return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
      if (betAmount > 250000) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> Cược tối đa: `250,000` <:Xcoin:1433810075927183441>'));
        return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
      if (userData.money < betAmount) {
        const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`> <a:no:1455096623804715080> Không đủ tiền! Số dư: \`${userData.money.toLocaleString('vi-VN')}\` <:Xcoin:1433810075927183441>`));
        return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }

      if (!choice) {
        const promptContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## <:startoken:1476448467982487584> Chọn Mặt Đồng Xu\n\n> - <a:pixelcoin:1456194056798339104> **Tiền cược:** \`${betAmount.toLocaleString('vi-VN')}\` <:Xcoin:1433810075927183441>\n> - Bạn chọn **Ngửa (Heads)** hay **Sấp (Tails)**?`));

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('cf_select_heads').setLabel('⚪ Ngửa (Heads)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('cf_select_tails').setLabel('⚫ Sấp (Tails)').setStyle(ButtonStyle.Secondary)
        );

        const promptMsg = await message.reply({ components: [promptContainer, row], flags: MessageFlags.IsComponentsV2 });

        const collector = createOwnerCollector(promptMsg, message.author.id, {
          time: 30000,
          max: 1
        });

        collector.on('collect', async i => {
          const selectedChoice = i.customId === 'cf_select_heads' ? 'heads' : 'tails';
          await handleFlip(i, message.author, userData, betAmount, selectedChoice, true);
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time' && collected.size === 0) {
            const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:clock:1446769163669602335> **Hết thời gian chọn!**'));
            promptMsg.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
          }
        });

        return;
      }

      const normalizedChoice = (choice === 'ngua' || choice === 'heads') ? 'heads' : 'tails';
      await handleFlip(message, message.author, userData, betAmount, normalizedChoice, false);

    } catch (error) {
      console.error('Lỗi coinflip:', error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> **Lỗi!** Không thể tung xu.'));
      message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
    }
  }
};

async function handleFlip(interactionOrMessage, user, userData, betAmount, choice, isInteraction) {
  try {
    const flipContainer = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:coinflip:1456570452519686272> ĐANG TUNG XU...'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('> *Đồng xu đang xoay vòng trên không trung...* ⏳'));

    let msg;
    if (isInteraction) {
      await interactionOrMessage.update({ components: [flipContainer], flags: MessageFlags.IsComponentsV2 });
      if (interactionOrMessage.fetchReply) {
        msg = await interactionOrMessage.fetchReply().catch(() => null);
      }
    } else {
      msg = await interactionOrMessage.reply({ components: [flipContainer], flags: MessageFlags.IsComponentsV2 });
    }
    if (!msg) return;

    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice === result;

    const currentUserData = await User.findOne({ userId: user.id });

    if (won) {
      const { total, multipliers, bonus } = calculateReward(currentUserData, betAmount, 'gambling');
      currentUserData.money += total;
    } else {
      currentUserData.money -= betAmount;
    }

    await currentUserData.save();
    await updateQuestProgress(user.id, 'coinflip_play', 1);

    let displayAmount = betAmount;
    let buffInfo = '';
    let rewardMultipliers = [];

    if (won) {
      const rewardCalc = calculateReward(currentUserData, betAmount, 'gambling');
      displayAmount = rewardCalc.total;
      rewardMultipliers = rewardCalc.multipliers;
      if (rewardCalc.bonus > 0) {
        buffInfo = `\n💡 **Buff bonus:** +\`${rewardCalc.bonus.toLocaleString('vi-VN')}\` <:Xcoin:1433810075927183441>`;
        if (rewardMultipliers.length > 0) {
          buffInfo += `\n✨ **Active buffs:** ${rewardMultipliers.map(m => `\`${m.name}\``).join(', ')}`;
        }
      }
    }

    const resultContainer = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## <:startoken:1476448467982487584> COINFLIP - ${won ? 'THẮNG! <a:2giveaway:1446775157036417125>' : 'THUA! <:minecoin:1476448457022636254>'}`))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `> **Lựa chọn:** ${choice === 'heads' ? 'Ngửa (Heads)' : 'Sấp (Tails)'}\n` +
        `> **Kết quả:** ${result === 'heads' ? 'Ngửa (Heads)' : 'Sấp (Tails)'}\n\n` +
        `- <a:dollar2:1476448466203971655> **Biến động:** ${won ? '+' : '-'}\`${displayAmount.toLocaleString('vi-VN')}\` <:Xcoin:1433810075927183441>${buffInfo}\n` +
        `- <a:moneybag:1476448471274881024> **Số dư mới:** \`${currentUserData.money.toLocaleString('vi-VN')}\` <:Xcoin:1433810075927183441>`
      ));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('cf_retry_heads')
        .setLabel('⚪ Ngửa (Heads)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('cf_retry_tails')
        .setLabel('⚫ Sấp (Tails)')
        .setStyle(ButtonStyle.Secondary)
    );

    resultContainer.addActionRowComponents(row);

    await msg.edit({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 });

    const collector = createOwnerCollector(msg, user.id, {
      time: 30000
    });

    collector.on('collect', async i => {
      if (i.customId.startsWith('cf_retry_')) {
        const side = i.customId.split('_')[2];
        await i.reply({ content: `<a:coinflip:1456570452519686272> Bạn hãy gõ lại lệnh cược (ví dụ: \`xcf ${side} <tiền>\`) để tiếp tục nhé!`, flags: [MessageFlags.Ephemeral] });
      }
    });

  } catch (error) {
    console.error('Lỗi handleFlip:', error);
  }
}
