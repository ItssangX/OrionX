import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';

export default {
    name: 'rps',
    aliases: ['keobuabao', 'oantuti'],

    async execute(message, args) {
        const gameData = {
            playerScore: 0,
            botScore: 0,
            maxRounds: 3,
            currentRound: 0,
            lastResult: null
        };

        const getRow = (disabled = false) => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('rock').setLabel('✊ Kéo').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                    new ButtonBuilder().setCustomId('paper').setLabel('✋ Búa').setStyle(ButtonStyle.Success).setDisabled(disabled),
                    new ButtonBuilder().setCustomId('scissors').setLabel('✌️ Bao').setStyle(ButtonStyle.Danger).setDisabled(disabled)
                );
        };

        const getGameContainer = (endMessage = '') => {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## ⚔️ KÉO BÚA BAO - BEST OF 3'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

            let statusText = `> 🔥 **Sẵn sàng!**\nHãy chọn nước đi bên dưới để bắt đầu.`;
            if (gameData.currentRound > 0) {
                if (gameData.currentRound >= gameData.maxRounds) {
                    statusText = "> 🏁 **Trận đấu đã kết thúc!**";
                } else {
                    statusText = `> ⏳ **Ván tiếp theo: Ván ${gameData.currentRound + 1}...**`;
                }
            }

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusText));

            if (gameData.lastResult) {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📜 KẾT QUẢ VÁN ${gameData.currentRound}\n> ${gameData.lastResult}`));
            }

            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `**📊 TỶ SỐ HIỆN TẠI**\n` +
                `\`\`\`js\n👤 BẠN: ${gameData.playerScore}  🆚  🤖 BOT: ${gameData.botScore}\n\`\`\``
            ));

            if (endMessage) {
                container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(endMessage));
            }

            return container;
        };

        const msg = await message.reply({
            components: [getGameContainer(), getRow(false)],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '<a:no:1455096623804715080> Đây không phải lượt của bạn!', flags: [MessageFlags.Ephemeral] });
            }

            const playerChoice = i.customId;
            const choices = ['rock', 'paper', 'scissors'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            let roundResultText = '';
            if (playerChoice === botChoice) {
                roundResultText = `⚖️ **Hòa!** Cả hai cùng ra ${getEmoji(playerChoice)}`;
            } else if (
                (playerChoice === 'rock' && botChoice === 'scissors') ||
                (playerChoice === 'scissors' && botChoice === 'paper') ||
                (playerChoice === 'paper' && botChoice === 'rock')
            ) {
                gameData.playerScore++;
                roundResultText = `🎉 **Bạn thắng!** ${getEmoji(playerChoice)} thắng ${getEmoji(botChoice)}`;
            } else {
                gameData.botScore++;
                roundResultText = `🤖 **Bot thắng!** ${getEmoji(botChoice)} thắng ${getEmoji(playerChoice)}`;
            }

            gameData.currentRound++;
            gameData.lastResult = roundResultText;

            if (gameData.currentRound >= gameData.maxRounds) {
                let endMessage = '';
                if (gameData.playerScore > gameData.botScore) endMessage = `# 🏆 BẠN ĐÃ CHIẾN THẮNG! 🏆`;
                else if (gameData.botScore > gameData.playerScore) endMessage = `# 💀 BOT ĐÃ CHIẾN THẮNG! 💀`;
                else endMessage = `# 🤝 KẾT QUẢ HÒA! 🤝`;

                await i.update({ components: [getGameContainer(endMessage), getRow(true)] });
                collector.stop();
                return;
            }

            await i.update({ components: [getGameContainer(), getRow(false)] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                const timeoutText = `> <a:clock:1446769163669602335> **Hết giờ!** Bot đã dừng trò chơi.\n\nTỷ số cuối: ${gameData.playerScore} - ${gameData.botScore}`;
                msg.edit({ components: [getGameContainer(timeoutText), getRow(true)] }).catch(() => { });
            }
        });
    }
};

function getEmoji(choice) {
    switch (choice) {
        case 'rock': return '✊';
        case 'paper': return '✋';
        case 'scissors': return '✌️';
        default: return '';
    }
}