import { findOrCreateUser } from "../../utils/userHelper.js";
import { petPool } from "../../database/petPool.js";
import { getOrderedPetGroups } from "../../utils/petHelper.js";

export default {
  name: "zoo",
  aliases: ["pets", "z", "pet"],
  description: "Xem danh sách pets của bạn",

  async execute(message, args) {
    try {
      const target = message.mentions.users.first() || message.author;
      const userData = await findOrCreateUser(target.id, target.username);

      if (!userData.pets) userData.pets = [];

      const orderedGroups = getOrderedPetGroups(userData.pets);

      const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
      const toSuperscript = (num) => {
        return num
          .toString()
          .split("")
          .map((d) => superscripts[parseInt(d)])
          .join("");
      };

      const rarityConfig = [
        { key: "common", short: "C", emoji: "⚪" },
        { key: "uncommon", short: "U", emoji: "🟢" },
        { key: "rare", short: "R", emoji: "🔵" },
        { key: "epic", short: "E", emoji: "🟣" },
        { key: "mythic", short: "M", emoji: "🟠" },
        { key: "legendary", short: "L", emoji: "🟡" },
        { key: "event", short: "EV", emoji: "🎊" },
        { key: "special", short: "S", emoji: "✨" },
      ];

      let header = `## 🌿 ${target.username}'s Zoo\n`;
      let chunks = [];
      let currentChunk = header;
      let globalIndex = 1;
      let hasPets = orderedGroups.length > 0;
      const stats = {};

      rarityConfig.forEach((config) => {
        const groupsInRarity = orderedGroups.filter(
          (g) => g.rarity === config.key,
        );
        if (groupsInRarity.length === 0) return;

        const totalInRarity = groupsInRarity.reduce(
          (sum, g) => sum + g.count,
          0,
        );
        stats[config.short] = totalInRarity;

        let rarityPrefix = `- **${config.emoji} ${config.short}. **   `;
        let currentLine = rarityPrefix;

        groupsInRarity.forEach((group, idx) => {
          const pIdx = globalIndex++;
          const sup = group.count > 1 ? toSuperscript(group.count) : "";
          // Fav now applies to all copies of the same pet type at once
          const isFavorited = group.pets.some((p) => p.favorite);
          const favStr = isFavorited ? "<:purplestar:1455096634609500315>" : "";

          const petStr = `${pIdx}. ${group.emoji} ${favStr} **${group.name}**\u2009${sup}`;

          // Kiểm tra xem thêm pet này vào line hiện tại có quá dài không
          if ((currentLine + petStr).length > 1800) {
            // Thêm line hiện tại vào chunk
            if ((currentChunk + currentLine).length > 1900) {
              chunks.push(currentChunk);
              currentChunk = currentLine + "\n";
            } else {
              currentChunk += currentLine + "\n";
            }
            // Reset line mới (vẫn thuộc rarity này)
            currentLine = "    " + petStr + "  ";
          } else {
            currentLine += petStr + "  ";
          }
        });

        // Thêm phần còn lại của rarity vào chunk
        if ((currentChunk + currentLine).length > 1900) {
          chunks.push(currentChunk);
          currentChunk = currentLine + "\n";
        } else {
          currentChunk += currentLine + "\n";
        }
      });

      if (!hasPets) {
        currentChunk +=
          "*(Vườn thú hiện đang trống rỗng. Hãy đi săn bằng lệnh `xhunt`)*";
      } else {
        const statsStr = `**${Object.entries(stats)
          .map(([k, v]) => `${k}-${v}`)
          .join(", ")}**`;

        if ((currentChunk + statsStr).length > 1900) {
          chunks.push(currentChunk);
          currentChunk = statsStr;
        } else {
          currentChunk += statsStr;
        }
      }
      chunks.push(currentChunk);

      // Gửi tất cả các chunks
      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          await message.reply(chunks[i]);
        } else {
          await message.channel.send(chunks[i]);
        }
      }
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi zoo:", error);
      message.reply(
        "> <a:no:1455096623804715080> **Lỗi!** Không thể hiển thị vườn thú.",
      );
    }
  },
};
