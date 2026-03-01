import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { findOrCreateUser } from '../../utils/userHelper.js';
import { weaponPool } from '../../database/weaponPool.js';
import { getOrderedPetGroups } from '../../utils/petHelper.js';

export default {
    name: 'weapon',
    aliases: ['wp', 'weapons', 'inventoryweapon'],
    description: 'Xem kho vũ khí của bạn',

    async execute(message, args) {
        try {
            const userData = await findOrCreateUser(message.author.id, message.author.username);
            let weapons = userData.weapons || [];
            const pets = userData.pets || [];
            const orderedGroups = getOrderedPetGroups(pets); // Get pet groups for index mapping

            if (weapons.length === 0) {
                return message.reply('> <a:no:1455096623804715080> Bạn chưa có vũ khí nào!');
            }

            // --- CONFIG & STATE ---
            const ITEMS_PER_PAGE = 10;
            let currentPage = 0;
            let currentFilter = 'all'; // all, favorite, legendary, mythic, epic, rare, common
            let currentSort = 'number_asc'; // number_asc, number_desc, rarity_desc, atk_desc

            // --- HELPER: SORT LOGIC ---
            const sortWeapons = (list) => {
                const sorted = [...list];
                switch (currentSort) {
                    case 'number_desc': return sorted.sort((a, b) => b.originalIndex - a.originalIndex);
                    case 'number_asc': return sorted.sort((a, b) => a.originalIndex - b.originalIndex);
                    case 'rarity_desc':
                        const rMap = { common: 1, uncommon: 2, rare: 3, epic: 4, mythic: 5, legendary: 6 };
                        return sorted.sort((a, b) => rMap[b.rarity] - rMap[a.rarity]);
                    case 'atk_desc': return sorted.sort((a, b) => b.atk - a.atk);
                    default: return sorted;
                }
            };

            // --- RENDER FUNCTION ---
            const generateWeaponUI = () => {
                // 0. MAP & PRESERVE ORIGINAL INDEX
                let mappedWeapons = weapons.map((w, index) => {
                    const obj = w.toObject ? w.toObject() : { ...w };
                    obj.originalIndex = index + 1;
                    return obj;
                });

                // 1. FILTER
                let filteredWeapons = mappedWeapons;
                if (currentFilter !== 'all') {
                    if (currentFilter === 'favorite') filteredWeapons = mappedWeapons.filter(w => w.favorite);
                    else {
                        if (currentFilter === 'common') {
                            filteredWeapons = mappedWeapons.filter(w => w.rarity === 'common' || w.rarity === 'uncommon');
                        } else {
                            filteredWeapons = mappedWeapons.filter(w => w.rarity === currentFilter);
                        }
                    }
                }

                // 2. SORT
                filteredWeapons = sortWeapons(filteredWeapons);

                // 3. PAGINATION
                const totalPages = Math.ceil(filteredWeapons.length / ITEMS_PER_PAGE) || 1;
                if (currentPage >= totalPages) currentPage = 0;

                const start = currentPage * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const currentWeapons = filteredWeapons.slice(start, end);

                // 4. BUILD LIST CONTENT
                const getRarityIcon = (r) => {
                    switch (r) {
                        case 'legendary': return '🟡';
                        case 'mythic': return '🔴';
                        case 'epic': return '🟣';
                        case 'rare': return '🔵';
                        case 'uncommon': return '🟢';
                        default: return '⚪';
                    }
                };

                const getShortEffect = (effect) => {
                    if (!effect) return '';
                    const typeMap = {
                        'lifesteal': `🩸${effect.value}%`,
                        'shield': `🛡️-${effect.value}%`,
                        'stun': `❄️Stun`,
                        'freeze': `❄️Frz`,
                        'crit_boost': `🔥Crit`,
                        'execute': `☠️Exec`,
                        'reflect': `↩️Rflct`,
                        'ignore_def': `💥Prc`,
                        'magic_pierce': `✨MgcP`,
                        'burn': `🔥Burn`,
                        'poison': `🧪Psn`,
                        'heal_turn': `💖Heal`,
                        'revive': `🐦Rviv`,
                        'vampire': `🧛Vamp`
                    };
                    return typeMap[effect.type] || `✨${effect.type}`;
                };

                const getPetEquipInfo = (equippedKey) => {
                    if (!equippedKey) return '';
                    let groupIndex = -1;
                    // Find group logic
                    orderedGroups.some((g, idx) => {
                        // Check if any pet in this group matches the key
                        if (g.pets.some(p => `${p.petId}_${p.createdAt.getTime()}` === equippedKey)) {
                            groupIndex = idx;
                            return true;
                        }
                        return false;
                    });

                    if (groupIndex !== -1) {
                        return ` <a:checkyes:1455096631555915897> Pet : ${groupIndex + 1}`;
                    }
                    return '';
                };

                let listContent = '';
                if (currentWeapons.length > 0) {
                    currentWeapons.forEach((wp) => {
                        const globalIndex = wp.originalIndex;

                        const rIcon = getRarityIcon(wp.rarity);
                        const fav = wp.favorite ? '<:purplestar:1455096634609500315>' : '';
                        const equippedInfo = wp.equippedTo ? getPetEquipInfo(wp.equippedTo) : '';

                        let effect = wp.effect || (weaponPool[wp.rarity]?.find(w => w.id === wp.id)?.effect);
                        const effectTxt = effect ? ` | ${getShortEffect(effect)}` : '';

                        // Format: [#STT] Icon Name (Stats) [Fav] [EquippedInfo]
                        const idxStr = `#${globalIndex}`;
                        listContent += `\`${idxStr.padEnd(5)}\` ${rIcon} ${wp.emoji} **${wp.name}** ${fav}${equippedInfo} \`ATK:${wp.atk}${effectTxt}\`\n`;
                    });
                } else {
                    listContent = '> *Không tìm thấy vũ khí nào...*';
                }

                // 5. BUILD COMPONENTS
                const headerText = `## 🗡️ @${message.author.username}'s Weapons\n` +
                    `**Filter:** \`${currentFilter.toUpperCase()}\` | **Sort:** \`${currentSort}\` | **Total:** \`${filteredWeapons.length}\`\n` +
                    `> *Dùng lệnh \`Xequipweapon <STT> <PetSlot>\` để trang bị*`;

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listContent));

                // Row 1: Sort Select
                const sortSelect = new StringSelectMenuBuilder()
                    .setCustomId('wp_sort')
                    .setPlaceholder('Sắp xếp theo...')
                    .addOptions([
                        new StringSelectMenuOptionBuilder().setLabel('Sort by Number (Small->Large)').setValue('number_asc').setDefault(currentSort === 'number_asc').setEmoji('1️⃣'),
                        new StringSelectMenuOptionBuilder().setLabel('Sort by Number (Large->Small)').setValue('number_desc').setDefault(currentSort === 'number_desc').setEmoji('🔟'),
                        new StringSelectMenuOptionBuilder().setLabel('Sort by Rarity (High->Low)').setValue('rarity_desc').setDefault(currentSort === 'rarity_desc').setEmoji('💎'),
                        new StringSelectMenuOptionBuilder().setLabel('Sort by Attack (High->Low)').setValue('atk_desc').setDefault(currentSort === 'atk_desc').setEmoji('⚔️')
                    ]);

                container.addActionRowComponents(new ActionRowBuilder().addComponents(sortSelect));

                // Row 2: Controls
                const btnRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('wp_prev').setEmoji('◀').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                    new ButtonBuilder().setCustomId('wp_page_info').setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('wp_next').setEmoji('▶').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === totalPages - 1),
                    new ButtonBuilder().setCustomId('wp_filter_open').setLabel('Filter').setEmoji('🌪️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('wp_manage').setLabel('Manage').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
                );

                container.addActionRowComponents(btnRow);

                return { container, filteredWeapons };
            };

            const initial = generateWeaponUI();
            const msg = await message.reply({ components: [initial.container], flags: MessageFlags.IsComponentsV2 });
            const collector = msg.createMessageComponentCollector({ time: 300000 });

            collector.on('collect', async i => {
                try {
                    if (i.user.id !== message.author.id) return i.reply({ content: '> Không phải lệnh của bạn!', flags: [MessageFlags.Ephemeral] });

                    // HANDLE SORT
                    if (i.customId === 'wp_sort') {
                        currentSort = i.values[0];
                        currentPage = 0;
                        await i.update({ components: [generateWeaponUI().container] });
                    }

                    // HANDLE FILTER DIALOG
                    else if (i.customId === 'wp_filter_open') {
                        const filterOptions = [
                            new StringSelectMenuOptionBuilder().setLabel('Show All').setValue('all').setEmoji('🎒').setDefault(currentFilter === 'all'),
                            new StringSelectMenuOptionBuilder().setLabel('Favorites Only').setValue('favorite').setEmoji('⭐').setDefault(currentFilter === 'favorite'),
                            new StringSelectMenuOptionBuilder().setLabel('Legendary').setValue('legendary').setEmoji('🟡').setDefault(currentFilter === 'legendary'),
                            new StringSelectMenuOptionBuilder().setLabel('Mythic').setValue('mythic').setEmoji('🔴').setDefault(currentFilter === 'mythic'),
                            new StringSelectMenuOptionBuilder().setLabel('Epic').setValue('epic').setEmoji('🟣').setDefault(currentFilter === 'epic'),
                            new StringSelectMenuOptionBuilder().setLabel('Rare').setValue('rare').setEmoji('🔵').setDefault(currentFilter === 'rare'),
                            new StringSelectMenuOptionBuilder().setLabel('Common & Uncommon').setValue('common').setEmoji('⚪').setDefault(currentFilter === 'common')
                        ];

                        const select = new StringSelectMenuBuilder()
                            .setCustomId('wp_filter_apply')
                            .setPlaceholder('Chọn bộ lọc hiển thị...')
                            .addOptions(filterOptions);

                        const row = new ActionRowBuilder().addComponents(select);

                        const resp = await i.reply({ content: '> **Weapon Filters:**', components: [row], flags: [MessageFlags.Ephemeral], withResponse: true });

                        const filterCol = resp.resource.message.createMessageComponentCollector({ time: 60000, max: 1 });
                        filterCol.on('collect', async subI => {
                            if (subI.customId === 'wp_filter_apply') {
                                await subI.deferUpdate(); // Defer ephemeral interaction
                                currentFilter = subI.values[0];
                                currentPage = 0;
                                await msg.edit({ components: [generateWeaponUI().container] });
                                await subI.editReply({ content: `> ✅ Filter Applied: **${currentFilter.toUpperCase()}**`, components: [] });
                            }
                        });
                    }

                    // HANDLE MANAGE DIALOG
                    else if (i.customId === 'wp_manage') {
                        const manageRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('wp_fav_mode').setLabel('Favorite Item').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId('wp_sell_mode').setLabel('Sell Item').setStyle(ButtonStyle.Danger)
                        );
                        const resp = await i.reply({ content: '> **Chế độ quản lý:** Chọn hành động', components: [manageRow], flags: [MessageFlags.Ephemeral], withResponse: true });

                        const manageCol = resp.resource.message.createMessageComponentCollector({ time: 60000 });
                        manageCol.on('collect', async subI => {
                            if (subI.customId === 'wp_fav_mode') {
                                const { filteredWeapons } = generateWeaponUI();
                                const start = currentPage * ITEMS_PER_PAGE;
                                const currentWeapons = filteredWeapons.slice(start, start + ITEMS_PER_PAGE);

                                const options = currentWeapons.map((w, idx) =>
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel(`#${w.originalIndex} ${w.name} ${w.favorite ? '(Locked)' : ''}`)
                                        .setValue(`fav_idx_${w.originalIndex}`)
                                        .setDescription(`Rarity: ${w.rarity}`)
                                        .setEmoji(w.emoji || '⚔️')
                                );

                                if (options.length === 0) {
                                    return subI.update({ content: '> Không có item nào ở trang hiện tại!', components: [] });
                                }

                                const favSelect = new StringSelectMenuBuilder()
                                    .setCustomId('wp_fav_confirm')
                                    .setPlaceholder('Chọn vật phẩm để Favorite/Unfavorite')
                                    .addOptions(options);

                                await subI.update({ content: '> **Chọn vật phẩm để Khóa/Mở khóa:**', components: [new ActionRowBuilder().addComponents(favSelect)] });
                            }

                            else if (subI.customId === 'wp_fav_confirm') {
                                try {
                                    await subI.update({ content: '> ⏳ Đang lưu thay đổi...', components: [] });

                                    const parts = subI.values[0].split('_');
                                    const targetIndex = parseInt(parts[2]);
                                    const realIndex = targetIndex - 1;

                                    const currentUser = await findOrCreateUser(message.author.id, message.author.username);

                                    if (currentUser.weapons && currentUser.weapons[realIndex]) {
                                        // Toggle Favorite
                                        const newVal = !currentUser.weapons[realIndex].favorite;
                                        currentUser.weapons[realIndex].favorite = newVal;
                                        await currentUser.save();

                                        weapons = currentUser.weapons;

                                        await msg.edit({ components: [generateWeaponUI().container] });

                                        const statusIcon = newVal ? '🔒 Đã Khóa' : '🔓 Đã Mở khóa';
                                        await subI.editReply({ content: `> ✅ **Thành công:** ${statusIcon} vật phẩm **#${targetIndex} ${currentUser.weapons[realIndex].name}**`, components: [] });
                                    } else {
                                        await subI.editReply({ content: '> ⚠️ Lỗi: Không tìm thấy vật phẩm.', components: [] });
                                    }
                                } catch (err) {
                                    console.error(err);
                                    try { await subI.editReply({ content: '> ❌ Đã xảy ra lỗi khi lưu.', components: [] }); } catch (e) { }
                                }
                            }

                            else if (subI.customId === 'wp_sell_mode') {
                                await subI.update({ content: '> Dùng `xsellweapon <sttWp> / All` để có thể bán vũ khí.', components: [] });
                            }
                        });
                    }

                    // NAVIGATION
                    else if (i.customId === 'wp_prev' || i.customId === 'wp_next') {
                        if (i.customId === 'wp_prev' && currentPage > 0) currentPage--;
                        if (i.customId === 'wp_next') currentPage++;
                        await i.update({ components: [generateWeaponUI().container] });
                    }
                } catch (e) {
                    console.error("Collector Error:", e);
                }
            });

        } catch (error) {
            console.error(error);
            message.reply('> Có lỗi xảy ra khi xem kho vũ khí.');
        }
    }
};
