import { findOrCreateUser } from '../../utils/userHelper.js';
import { getOrderedPetGroups } from '../../utils/petHelper.js';

export default {
    name: 'unequipweapon',
    aliases: ['unew', 'ueqw'],
    description: 'Gỡ vũ khí khỏi pet',
    usage: 'Xunequipweapon <số thứ tự pet>',

    async execute(message, args) {
        try {
            const userData = await findOrCreateUser(message.author.id, message.author.username);
            const pets = userData.pets || [];
            const weapons = userData.weapons || [];

            if (!args[0]) {
                return message.reply('> Cú pháp: `Xunequipweapon <số thứ tự pet>`');
            }

            const zooIndex = parseInt(args[0]) - 1;

            const orderedGroups = getOrderedPetGroups(pets);
            if (isNaN(zooIndex) || zooIndex < 0 || zooIndex >= orderedGroups.length) {
                return message.reply(`> Số thứ tự pet không hợp lệ! Bạn hiện có **${orderedGroups.length}** loại pet.`);
            }

            const petGroup = orderedGroups[zooIndex];
            const pet = petGroup.pets.find(p => p.weapon && p.weapon.id) || petGroup.pets[0];

            if (!pet.weapon || !pet.weapon.id) {
                return message.reply('> Pet này không trang bị vũ khí nào!');
            }

            const petKey = `${pet.petId}_${pet.createdAt.getTime()}`;
            const weaponEntry = weapons.find(w => w.id === pet.weapon.id && w.equippedTo === petKey);

            if (weaponEntry) {
                weaponEntry.equippedTo = null;
            }

            // Revert stats
            pet.atk = Math.max(1, pet.atk - (pet.weapon.atk || 0));
            pet.def = Math.max(0, pet.def - (pet.weapon.def || 0));
            pet.hp = Math.max(1, pet.hp - (pet.weapon.hp || 0));
            if (pet.currentHp > pet.hp) pet.currentHp = pet.hp;

            const oldWeaponName = pet.weapon.name;
            pet.weapon = undefined;

            userData.markModified('pets');
            userData.markModified('weapons');
            await userData.save();

            message.reply(`> <a:checkyes:1455096631555915897> Đã gỡ **${oldWeaponName}** khỏi **${pet.name}**!`);

        } catch (error) {
            console.error(error);
            message.reply('> Lỗi khi gỡ vũ khí.');
        }
    }
};
