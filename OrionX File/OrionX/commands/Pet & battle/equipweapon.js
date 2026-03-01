import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { findOrCreateUser } from "../../utils/userHelper.js";
import { petPool } from "../../database/petPool.js";
import { getOrderedPetGroups } from "../../utils/petHelper.js";

export default {
  name: "equipweapon",
  aliases: ["ew", "eqw", "equipw"],
  description: "Trang bị vũ khí cho pet",
  usage: "Xequipweapon <stt vũ khí> <stt pet>",

  async execute(message, args) {
    try {
      const userData = await findOrCreateUser(
        message.author.id,
        message.author.username,
      );
      const weapons = userData.weapons || [];
      const pets = userData.pets || [];

      // Helper lấy emoji pet từ config
      const getPetEmojiLocal = (p) => {
        if (p.emoji) return p.emoji;
        const rarity = (p.type || "common").toLowerCase();
        const config = petPool[rarity]?.find(
          (pd) => pd.petId === (p.petId || p.name.toLowerCase()),
        );
        return config?.emoji || "🐾";
      };

      // 1. Kiểm tra điều kiện đầu vào
      if (weapons.length === 0)
        return message.reply(
          "> <a:no:1455096623804715080> Bạn không sở hữu vũ khí nào!",
        );
      if (pets.length === 0)
        return message.reply(
          "> <a:no:1455096623804715080> Bạn không có pet nào để trang bị!",
        );

      if (!args[0] || !args[1]) {
        return message.reply({
          content: `## 🔍 Hướng Dẫn Trang Bị\n> - **Cú pháp**: \`xequipweapon <stt_vũ_khí> <stt_pet>\`\n> - **Ví dụ**: \`xew 1 1\`\n> - <a:lightbulb:1455096627894423637> Dùng \`xinventory\` để xem STT vũ khí và \`xzoo\` để xem STT pet.`,
        });
      }

      const wpIndex = parseInt(args[0]) - 1;
      const zooIndex = parseInt(args[1]) - 1;

      // 2. Kiểm tra tính hợp lệ của STT
      if (isNaN(wpIndex) || wpIndex < 0 || wpIndex >= weapons.length) {
        return message.reply(
          "> <a:no:1455096623804715080> Số thứ tự **vũ khí** không hợp lệ!",
        );
      }

      const orderedGroups = getOrderedPetGroups(pets);
      if (isNaN(zooIndex) || zooIndex < 0 || zooIndex >= orderedGroups.length) {
        return message.reply(
          `> <a:no:1455096623804715080> Số thứ tự **pet** không hợp lệ! Bạn hiện có **${orderedGroups.length}** loại pet.`,
        );
      }

      const weapon = weapons[wpIndex];
      const pet = orderedGroups[zooIndex].pets[0]; // Chọn con đầu tiên trong nhóm STT đó
      const petKey = `${pet.petId}_${pet.createdAt.getTime()}`;

      // 3. Logic xử lý hoán đổi trang bị
      // Case A: Nếu vũ khí này đang được con pet khác cầm -> Tháo ra khỏi con đó
      if (weapon.equippedTo && weapon.equippedTo !== petKey) {
        const oldOwner = pets.find(
          (p) => `${p.petId}_${p.createdAt.getTime()}` === weapon.equippedTo,
        );
        if (oldOwner) {
          oldOwner.atk -= weapon.atk;
          oldOwner.def -= weapon.def;
          oldOwner.hp -= weapon.hp;
          oldOwner.currentHp = Math.max(1, oldOwner.currentHp - weapon.hp);
          oldOwner.weapon = null;
        }
      }

      // Case B: Nếu con pet hiện tại đang cầm vũ khí khác -> Tháo vũ khí cũ ra
      if (pet.weapon && pet.weapon.id) {
        const oldWeaponInSlot = weapons.find((w) => w.id === pet.weapon.id);
        if (oldWeaponInSlot) oldWeaponInSlot.equippedTo = null;

        pet.atk -= pet.weapon.atk;
        pet.def -= pet.weapon.def;
        pet.hp -= pet.weapon.hp;
        pet.currentHp = Math.max(1, pet.currentHp - pet.weapon.hp);
      }

      // 4. Thực hiện Trang bị mới
      pet.weapon = {
        id: weapon.id,
        name: weapon.name,
        emoji: weapon.emoji,
        rarity: weapon.rarity,
        atk: weapon.atk,
        def: weapon.def,
        hp: weapon.hp,
      };

      pet.atk += weapon.atk;
      pet.def += weapon.def;
      pet.hp += weapon.hp;
      pet.currentHp += weapon.hp;

      weapon.equippedTo = petKey;

      // 5. Lưu vào Database
      userData.markModified("pets");
      userData.markModified("weapons");
      await userData.save();

      // 6. Hiển thị kết quả chuyên nghiệp
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:checkyes:1455096631555915897> Trang Bị Thành Công\n` +
              `> - **${weapon.emoji} ${weapon.name}** đã được trang bị cho **${getPetEmojiLocal(pet)} ${pet.name}**`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**📊 Chỉ số cộng thêm:**\n` +
              `> - ⚔️ Tấn công: \`+${weapon.atk}\` ATK\n` +
              `> - 🛡️ Phòng thủ: \`+${weapon.def}\` DEF\n` +
              `> - ❤️ Máu: \`+${weapon.hp}\` HP`,
          ),
        );

      return message.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Lỗi Equip Weapon:", error);
      message.reply(
        "> <a:no:1455096623804715080> Đã xảy ra lỗi hệ thống khi trang bị vũ khí!",
      );
    }
  },
};
