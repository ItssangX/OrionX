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
import { getBetAmount, createOwnerCollector } from '../../utils/commandHelper.js';

// Magic 8-Ball responses (20 câu trả lời chuẩn)
const RESPONSES = {
    positive: [
        '🎱 **Chắc chắn rồi!**',
        '🎱 **Không nghi ngờ gì!**',
        '🎱 **Chắc chắn như vậy!**',
        '🎱 **Có thể tin tưởng được!**',
        '🎱 **Như tôi thấy thì có!**',
        '🎱 **Rất có thể!**',
        '🎱 **Triển vọng tốt!**',
        '🎱 **Có!**',
        '🎱 **Các dấu hiệu chỉ có!**',
        '🎱 **Không cần suy nghĩ!**'
    ],
    uncertain: [
        '🎱 **Hãy thử lại sau...**',
        '🎱 **Không thể đoán được...**',
        '🎱 **Tốt hơn là đừng nói...**',
        '🎱 **Không thể dự đoán ngay...**',
        '🎱 **Hãy tập trung và hỏi lại!**'
    ],
    negative: [
        '🎱 **Đừng tin vào điều đó!**',
        '🎱 **Câu trả lời là không!**',
        '🎱 **Các dấu hiệu không tốt!**',
        '🎱 **Rất khó tin!**',
        '🎱 **Không nên mơ mộng!**'
    ]
};

export default {
    name: '8ball',
    aliases: ['8b', 'ball', 'magic'],

    async execute(message, args) {
        try {
            // Kiểm tra nếu người dùng không đặt câu hỏi
            if (!args || args.length === 0) {
                const guideContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🎱 MAGIC 8-BALL'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**Magic 8-Ball** là quả cầu thần kỳ trả lời mọi câu hỏi của bạn!\n\n` +
                        `**Cú pháp:** \`X8ball <câu hỏi của bạn>\`\n` +
                        `**Ví dụ:** \`X8ball Hôm nay tôi có may mắn không?\`\n\n` +
                        `> 💚 **10 câu trả lời tích cực**\n` +
                        `> 💛 **5 câu trả lời trung lập**\n` +
                        `> 💔 **5 câu trả lời tiêu cực**\n\n` +
                        `*Đặt câu hỏi yes/no và để 8-Ball dự đoán!*`
                    ));
                return message.reply({ components: [guideContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Lấy câu hỏi từ người dùng
            const question = args.join(' ');

            // Kiểm tra độ dài câu hỏi
            if (question.length < 5) {
                const errContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        '> <a:no:1455096623804715080> Câu hỏi quá ngắn! Hãy đặt một câu hỏi rõ ràng hơn (tối thiểu 5 ký tự).'
                    ));
                return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
            }

            if (question.length > 200) {
                const errContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        '> <a:no:1455096623804715080> Câu hỏi quá dài! Giới hạn 200 ký tự.'
                    ));
                return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Kiểm tra và tạo user data
            let userData = await User.findOne({ userId: message.author.id });
            if (!userData) {
                userData = await User.create({
                    userId: message.author.id,
                    username: message.author.username,
                    money: 0
                });
            }

            // Tạo hiệu ứng "đang suy nghĩ"
            const thinkingContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## 🎱 MAGIC 8-BALL\n\n` +
                    `**Câu hỏi:** *${question}*\n\n` +
                    `> 🔮 *Quả cầu thần kỳ đang suy nghĩ...*`
                ));
            
            const thinkingMsg = await message.reply({
                components: [thinkingContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Đợi 2 giây để tạo hiệu ứng
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Chọn ngẫu nhiên loại câu trả lời (50% tích cực, 25% trung lập, 25% tiêu cực)
            const random = Math.random();
            let responseType;
            let responseColor;
            
            if (random < 0.5) {
                responseType = RESPONSES.positive;
                responseColor = '💚'; // Xanh lá - tích cực
            } else if (random < 0.75) {
                responseType = RESPONSES.uncertain;
                responseColor = '💛'; // Vàng - trung lập
            } else {
                responseType = RESPONSES.negative;
                responseColor = '💔'; // Đỏ - tiêu cực
            }

            // Chọn ngẫu nhiên một câu trả lời từ loại đã chọn
            const answer = responseType[Math.floor(Math.random() * responseType.length)];

            // Tạo container kết quả
            const resultContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎱 MAGIC 8-BALL ${responseColor}`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Câu hỏi của bạn:**\n> *${question}*\n\n` +
                    `**Câu trả lời:**\n${answer}\n\n` +
                    `*${getFooterText(responseType)}*`
                ));

            // Tạo nút hành động
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('8ball_again')
                    .setLabel('🎱 Hỏi câu khác')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('8ball_same')
                    .setLabel('🔄 Hỏi lại')
                    .setStyle(ButtonStyle.Secondary)
            );

            resultContainer.addActionRowComponents(row);

            // Cập nhật tin nhắn
            await thinkingMsg.edit({
                components: [resultContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Tạo collector cho buttons
            const collector = createOwnerCollector(thinkingMsg, message.author.id, {
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === '8ball_again') {
                    await i.reply({ 
                        content: '🎱 Hãy đặt câu hỏi mới bằng cách gõ: `X8ball <câu hỏi của bạn>`', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                } else if (i.customId === '8ball_same') {
                    // Chọn lại câu trả lời ngẫu nhiên
                    const newRandom = Math.random();
                    let newResponseType;
                    let newResponseColor;
                    
                    if (newRandom < 0.5) {
                        newResponseType = RESPONSES.positive;
                        newResponseColor = '💚';
                    } else if (newRandom < 0.75) {
                        newResponseType = RESPONSES.uncertain;
                        newResponseColor = '💛';
                    } else {
                        newResponseType = RESPONSES.negative;
                        newResponseColor = '💔';
                    }

                    const newAnswer = newResponseType[Math.floor(Math.random() * newResponseType.length)];

                    const newResultContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎱 MAGIC 8-BALL ${newResponseColor}`))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `**Câu hỏi của bạn:**\n> *${question}*\n\n` +
                            `**Câu trả lời:**\n${newAnswer}\n\n` +
                            `*${getFooterText(newResponseType)}*`
                        ));

                    newResultContainer.addActionRowComponents(row);

                    await i.update({
                        components: [newResultContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            });

            collector.on('end', async () => {
                // Vô hiệu hóa buttons khi hết thời gian
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('8ball_again')
                        .setLabel('🎱 Hỏi câu khác')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('8ball_same')
                        .setLabel('🔄 Hỏi lại')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                resultContainer.addActionRowComponents(disabledRow);

                await thinkingMsg.edit({
                    components: [resultContainer],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
            });

            // Cập nhật quest progress
            await updateQuestProgress(message.author.id, 'use_commands', 1);

        } catch (error) {
            console.error('❌ Lỗi 8ball:', error);
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '> <a:no:1455096623804715080> **Lỗi!** Không thể sử dụng Magic 8-Ball. Vui lòng thử lại.'
                ));
            message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }
};

/**
 * Lấy text footer dựa trên loại câu trả lời
 * @param {Array} responseType - Mảng câu trả lời
 * @returns {string} Footer text
 */
function getFooterText(responseType) {
    if (responseType === RESPONSES.positive) {
        return '✨ Magic 8-Ball tin rằng điều tốt đẹp sẽ đến với bạn!';
    } else if (responseType === RESPONSES.uncertain) {
        return '🌟 Vận mệnh vẫn còn mơ hồ, hãy thử lại sau!';
    } else {
        return '🌙 Đôi khi câu trả lời không như ý muốn, nhưng đó là phần của cuộc sống!';
    }
}