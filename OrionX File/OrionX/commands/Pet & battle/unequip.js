import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { findOrCreateUser } from '../../utils/userHelper.js';

export default {
    name: 'unequip',
    aliases: ['ue', 'remove', ' thao'],
    description: 'Gỡ pet khỏi team (cú pháp: xunequip [slot] hoặc all)',

    async execute(message, args) {
        try {
            const userData = await findOrCreateUser(message.author.id, message.author.username);

            // Initialize/Normalize team
            if (!userData.team) userData.team = { slot1: null, slot2: null, slot3: null };

            // Helper to get active slots
            const getActiveSlots = () => {
                const slots = [];
                if (userData.team.slot1) slots.push(1);
                if (userData.team.slot2) slots.push(2);
                if (userData.team.slot3) slots.push(3);
                return slots;
            };

            const activeSlots = getActiveSlots();

            if (activeSlots.length === 0) {
                return message.reply('> <a:no:1455096623804715080> Bạn chưa trang bị pet nào!');
            }

            // Args handling
            const arg = args[0] ? args[0].toLowerCase() : null;

            if (arg === 'all') {
                // Remove all
                userData.team = { slot1: null, slot2: null, slot3: null };
                // Reset equipped flags
                userData.pets.forEach(p => p.equipped = false);

                userData.markModified('team');
                userData.markModified('pets');
                await userData.save();

                return message.reply(`> <a:checkyes:1455096631555915897> Đã gỡ **TẤT CẢ** pet khỏi đội hình!`);
            }

            let targetSlot = parseInt(arg);

            // If no arg provided and only 1 pet equipped, unequip it
            if (!arg && activeSlots.length === 1) {
                targetSlot = activeSlots[0];
            } else if (!arg) {
                // Show menu or guide
                const guideContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        '## <a:no:1455096623804715080> Chọn Slot Cần Gỡ\n' +
                        '> Bạn đang trang bị nhiều pet. Vui lòng chọn:\n' +
                        '> `xunequip <1-3>`: Gỡ slot tương ứng\n' +
                        '> `xunequip all`: Gỡ tất cả\n\n' +
                        '**Đội hình hiện tại:**\n' +
                        (userData.team.slot1 ? `> **Slot 1:** ${userData.team.slot1.name}\n` : '') +
                        (userData.team.slot2 ? `> **Slot 2:** ${userData.team.slot2.name}\n` : '') +
                        (userData.team.slot3 ? `> **Slot 3:** ${userData.team.slot3.name}\n` : '')
                    ));
                return message.reply({ components: [guideContainer], flags: MessageFlags.IsComponentsV2 });
            }

            if (isNaN(targetSlot) || targetSlot < 1 || targetSlot > 3) {
                return message.reply('> <a:no:1455096623804715080> Slot không hợp lệ! Chọn 1, 2, 3 hoặc `all`.');
            }

            const slotKey = `slot${targetSlot}`;
            const currentPet = userData.team[slotKey];

            if (!currentPet) {
                return message.reply(`> <a:no:1455096623804715080> **Slot ${targetSlot}** đang trống!`);
            }

            const petName = currentPet.name || 'Unknown Pet';

            // Gỡ pet
            userData.team[slotKey] = null;

            // Update equipped flag
            // Check if pet is equipped in other slots (unlikely but safe to check)
            const remainingKeys = new Set();
            if (userData.team.slot1) remainingKeys.add(userData.team.slot1.key);
            if (userData.team.slot2) remainingKeys.add(userData.team.slot2.key);
            if (userData.team.slot3) remainingKeys.add(userData.team.slot3.key);

            const pet = userData.pets.find(p => `${p.petId}_${p.createdAt.getTime()}` === currentPet.key);
            if (pet) {
                pet.equipped = remainingKeys.has(currentPet.key);
            }

            userData.markModified('team');
            userData.markModified('pets');
            await userData.save();

            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## <a:checkyes:1455096631555915897> THÀNH CÔNG!\n` +
                    `Đã gỡ **${petName}** khỏi **Slot ${targetSlot}**.\n`
                ));

            message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error('<a:no:1455096623804715080> Lỗi unequip:', error);
            const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> **Lỗi!** Không thể gỡ pet.'));
            message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
