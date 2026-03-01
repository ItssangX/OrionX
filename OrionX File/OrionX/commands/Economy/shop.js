import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { User, GlobalData } from "../../database/models.js";
import { ALL_ITEMS, getRandomItems } from "../../config/shopConfig.js";
import { weaponPool } from "../../database/weaponPool.js";
import {
  reply,
  getUser,
  createOwnerCollector,
} from "../../utils/commandHelper.js";
import { getResetTimes } from "../../utils/resetHelper.js";

export default {
  name: "shop",
  aliases: ["cua-hang", "store", "spl"],
  description: "Cửa hàng vật phẩm và vũ khí (Làm mới theo mốc reset)",

  async execute(source, args) {
    const user = getUser(source);
    let shopData = await GlobalData.findOne({ key: "rotational_shop" });
    const now = new Date();
    const { lastReset, nextReset } = getResetTimes(now);

    // Weapon Prices Config
    const WEAPON_PRICES = {
      common: 5000,
      uncommon: 15000,
      rare: 50000,
      epic: 150000,
      mythic: 500000,
      legendary: 2000000,
    };

    let currentBuffs = [];
    let currentWeapons = [];
    let nextRefresh = null;

    const flattenWeapons = () => {
      const all = [];
      for (const r in weaponPool) {
        weaponPool[r].forEach((w) => all.push({ ...w, rarity: r }));
      }
      return all;
    };

    // --- WEIGHTED RANDOM RARITY ---
    const getWeightedRarity = () => {
      const rand = Math.random() * 100;
      if (rand < 40) return "common"; // 40%
      if (rand < 70) return "uncommon"; // 30%
      if (rand < 85) return "rare"; // 15%
      if (rand < 95) return "epic"; // 10%
      if (rand < 99) return "mythic"; // 4%
      return "legendary"; // 1%
    };

    const getRandomWeapons = (count = 3) => {
      const selectedWeapons = [];
      for (let i = 0; i < count; i++) {
        const rarity = getWeightedRarity();
        const pool = weaponPool[rarity];
        if (pool && pool.length > 0) {
          const weapon = pool[Math.floor(Math.random() * pool.length)];
          // Đảm bảo không trùng trong 1 lần refresh (nếu pool đủ lớn)
          if (!selectedWeapons.some((w) => w.id === weapon.id)) {
            selectedWeapons.push({ ...weapon, rarity });
          } else {
            i--; // Thử lại
          }
        }
      }
      return selectedWeapons;
    };

    const getWeaponById = (id) => {
      const all = flattenWeapons();
      return all.find((w) => w.id === id);
    };

    // --- HÀM RANDOM SỐ LƯỢNG THEO TỈ LỆ ---
    // Tỉ lệ: 1 = 50%, 2 = 30%, 3 = 20%
    const getRandomQuantity = () => {
      const rand = Math.random();
      if (rand < 0.5)
        return 1; // 50%: 0.0 - 0.5
      else if (rand < 0.8)
        return 2; // 30%: 0.5 - 0.8
      else return 3; // 20%: 0.8 - 1.0
    };

    // --- DATA LOADING & ROTATION LOGIC ---
    // Cấu trúc mới: mỗi vật phẩm có quantity (1-3)
    // Format: { id: 'item_id', quantity: 2, sold: 0 } (sold is kept for legacy/compatibility but not used for global limiting anymore)

    if (
      !shopData ||
      !shopData.lastUpdate ||
      new Date(shopData.lastUpdate) < lastReset
    ) {
      // New Rotation
      const buffs = getRandomItems(3);
      const weapons = getRandomWeapons(3);

      const newData = {
        buffs: buffs.map((b) => ({
          id: b.id,
          quantity: getRandomQuantity(),
          sold: 0,
        })),
        weapons: weapons.map((w) => ({
          id: w.id,
          quantity: getRandomQuantity(),
          sold: 0,
        })),
      };

      if (!shopData) {
        shopData = new GlobalData({
          key: "rotational_shop",
          data: newData,
          lastUpdate: lastReset,
        });
      } else {
        shopData.data = newData;
        shopData.lastUpdate = lastReset;
      }

      await shopData.save();
    }

    nextRefresh = nextReset;

    // --- USER DATA & HISTORY SYNC ---
    let userData = await User.findOne({ userId: user.id });
    if (!userData) {
      userData = await User.create({
        userId: user.id,
        username: user.username,
      });
    }

    const syncPurchaseHistory = () => {
      if (!userData.shopPurchaseHistory) {
        userData.shopPurchaseHistory = {
          lastShopUpdate: shopData.lastUpdate,
          purchases: [],
        };
        return true; // Modified
      }

      const userTime = userData.shopPurchaseHistory.lastShopUpdate
        ? new Date(userData.shopPurchaseHistory.lastShopUpdate).getTime()
        : 0;
      const shopTime = new Date(shopData.lastUpdate).getTime();

      // Nếu shop đã refresh (thời gian update khác nhau), reset lịch sử mua
      if (userTime !== shopTime) {
        userData.shopPurchaseHistory = {
          lastShopUpdate: shopData.lastUpdate,
          purchases: [],
        };
        return true; // Modified
      }
      return false;
    };

    if (syncPurchaseHistory()) {
      await userData.save();
    }

    // --- HELPER: GET USER REMAINING STOCK ---
    const getUserRemainingStock = (itemId, type) => {
      // 1. Get Max Quantity from Global Shop Data
      const shopItems = shopData.data;
      let shopItem;
      if (type === "buff")
        shopItem = shopItems.buffs.find((b) => b.id === itemId);
      else shopItem = shopItems.weapons.find((w) => w.id === itemId);

      if (!shopItem) return 0;
      const maxQuantity = shopItem.quantity || 1;

      // 2. Get User Purchased Count
      const purchaseRecord = userData.shopPurchaseHistory.purchases.find(
        (p) => p.itemId === itemId,
      );
      const userPurchased = purchaseRecord ? purchaseRecord.count : 0;

      return Math.max(0, maxQuantity - userPurchased);
    };

    // --- LOAD CURRENT ITEMS FOR UI ---
    const loadCurrentItems = () => {
      const savedData = shopData.data;
      // Ensure legacy data handling if needed, but assuming new format mostly
      // Or fallback to savedData.buffs/weapons directly

      if (savedData && !Array.isArray(savedData)) {
        currentBuffs = savedData.buffs
          .map((buffData) => {
            const item = ALL_ITEMS.find((i) => i.id === buffData.id);
            if (!item) return null;
            return { ...item, id: buffData.id }; // Simplified object, actual stock checked via helper
          })
          .filter(Boolean);

        currentWeapons = savedData.weapons
          .map((weapData) => {
            const weapon = getWeaponById(weapData.id);
            if (!weapon) return null;
            return { ...weapon, id: weapData.id };
          })
          .filter(Boolean);
      }
    };
    loadCurrentItems();

    // --- PAGINATION STATE ---
    let currentPage = 0; // 0: Buffs, 1: Weapons
    const PAGES = ["buffs", "weapons"];

    // --- RENDER FUNCTION ---
    const generateShopUI = () => {
      const pageType = PAGES[currentPage];

      // 1. Build Container/Embed
      const container = new ContainerBuilder();

      // Header
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## <a:Shop:1476477591018934417> OrionX Shop - ${pageType === "buffs" ? "Item Buff <:rocket_:1476463392163364924> " : "Weapons <:weapon:1476469242638504036>"}`,
        ),
      );

      container.addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> - Làm mới sau: <t:${Math.floor(nextRefresh.getTime() / 1000)}:R>`,
        ),
      );

      // Content
      let content = "";
      let selectOptions = [];

      if (pageType === "buffs") {
        content = `### 🔮 Buff Items List \n`;
        currentBuffs.forEach((item) => {
          const remaining = getUserRemainingStock(item.id, "buff");
          const stockStatus =
            remaining > 0
              ? `📦 Còn lại: \`${remaining}\``
              : `❌ **Hết Hàng (Bạn đã mua hết)**`;

          content +=
            `> * ${item.emoji} **${item.name}** \`${item.price.toLocaleString()}\` coins\n` +
            `>   - *${item.description}*\n` +
            `>   - ${stockStatus}\n`;

          // Chỉ thêm vào select menu nếu còn hàng
          if (remaining > 0) {
            selectOptions.push(
              new StringSelectMenuOptionBuilder()
                .setLabel(`${item.name} (Còn ${remaining})`)
                .setDescription(`${item.price.toLocaleString()} coins`)
                .setValue(`buff_${item.id}`)
                .setEmoji(item.emoji),
            );
          }
        });
      } else {
        content = `### ⚔️ DANH SÁCH VŨ KHÍ\n`;
        currentWeapons.forEach((wp) => {
          const price = WEAPON_PRICES[wp.rarity.toLowerCase()] || 999999;
          const remaining = getUserRemainingStock(wp.id, "weap");
          const stockStatus =
            remaining > 0
              ? `📦 Còn lại: \`${remaining}\``
              : `❌ **HẾT HÀNG (Bạn đã mua hết)**`;

          content +=
            `> * ${wp.emoji} **${wp.name}** [${wp.rarity}] \`${price.toLocaleString()}\` coins\n` +
            `>   - ⚔️${wp.atk} 🛡️${wp.def} ❤️${wp.hp}\n` +
            `>   - ${stockStatus}\n`;

          // Chỉ thêm vào select menu nếu còn hàng
          if (remaining > 0) {
            selectOptions.push(
              new StringSelectMenuOptionBuilder()
                .setLabel(`${wp.name} (Còn ${remaining})`)
                .setDescription(
                  `${price.toLocaleString()} coins - ${wp.rarity}`,
                )
                .setValue(`weap_${wp.id}`)
                .setEmoji(wp.emoji),
            );
          }
        });
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content),
      );

      // Footer (Money)
      container.addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `<:cash:1455874004727500956> **Số dư:** \`${userData.money.toLocaleString()}\` <:Xcoin:1433810075927183441>`,
        ),
      );

      // 2. Select Menu Row
      if (selectOptions.length > 0) {
        const select = new StringSelectMenuBuilder()
          .setCustomId("shop_buy")
          .setPlaceholder(
            `Chọn ${pageType === "buffs" ? "vật phẩm" : "vũ khí"} để mua...`,
          )
          .addOptions(selectOptions);
        container.addActionRowComponents(
          new ActionRowBuilder().addComponents(select),
        );
      }

      // 3. Navigation Row
      const btnPrev = new ButtonBuilder()
        .setCustomId("shop_prev")
        .setEmoji("◀")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0);

      const btnIndicator = new ButtonBuilder()
        .setCustomId("shop_indicator")
        .setLabel(`${currentPage + 1}/${PAGES.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const btnNext = new ButtonBuilder()
        .setCustomId("shop_next")
        .setEmoji("▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === PAGES.length - 1);

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(btnPrev, btnIndicator, btnNext),
      );

      return {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      };
    };

    const initialUI = generateShopUI();
    let shopMsg = await reply(source, {
      ...initialUI,
    });
    if (!shopMsg && source?.fetchReply) {
      shopMsg = await source.fetchReply().catch(() => null);
    }
    if (!shopMsg) return;

    // --- COLLECTOR ---
    const collector = createOwnerCollector(shopMsg, user.id, {
      time: 300000, // 5 minutes
    });

    collector.on("collect", async (i) => {
      try {
        // 1. Defer immediately based on action type
        // Prevent "Unknown interaction" by acknowledging instantly
        if (i.customId === "shop_prev" || i.customId === "shop_next") {
          await i.deferUpdate();
        } else if (i.customId === "shop_buy") {
          await i.deferReply({ flags: MessageFlags.Ephemeral });
        }

        // 2. Perform Database Operations (Safe to take > 3s now)
        userData = await User.findOne({ userId: user.id });

        // Re-sync history in case shop refreshed while collector is open
        const latestShopData = await GlobalData.findOne({
          key: "rotational_shop",
        });
        if (
          latestShopData &&
          latestShopData.lastUpdate.getTime() !== shopData.lastUpdate.getTime()
        ) {
          shopData = latestShopData;
          loadCurrentItems(); // Refresh current items list
          nextRefresh = getResetTimes(new Date()).nextReset;
        }

        if (syncPurchaseHistory()) {
          await userData.save();
        }

        // 3. Handle Actions
        if (i.customId === "shop_prev") {
          if (currentPage > 0) currentPage--;
          const nextUI = generateShopUI();
          await i.editReply({ components: nextUI.components });
        } else if (i.customId === "shop_next") {
          if (currentPage < PAGES.length - 1) currentPage++;
          const nextUI = generateShopUI();
          await i.editReply({ components: nextUI.components });
        } else if (i.customId === "shop_buy") {
          const value = i.values[0];
          const type = value.split("_")[0];
          const id = value.substring(type.length + 1);

          let buySuccess = false;
          let itemName = "";
          let itemEmoji = "";

          let remaining = 0;
          let price = 0;

          if (type === "buff") {
            const item = ALL_ITEMS.find((it) => it.id === id);
            if (!item) return i.editReply({ content: "Item error!" });

            remaining = getUserRemainingStock(id, "buff");
            price = item.price;
            itemName = item.name;
            itemEmoji = item.emoji;

            if (remaining <= 0) {
              return i.editReply({
                content:
                  "<a:no:1455096623804715080> Bạn đã mua hết số lượng cho phép của vật phẩm này!",
              });
            }
            if (userData.money < price) {
              return i.editReply({
                content: `<a:no:1455096623804715080> Thiếu tiền! Cần ${price.toLocaleString()}`,
              });
            }

            // Process Purchase
            userData.money -= price;
            const invItem = userData.inventory.find(
              (it) => it.itemId === item.id,
            );
            if (invItem) invItem.quantity++;
            else
              userData.inventory.push({
                itemId: item.id,
                itemName: item.name,
                quantity: 1,
              });

            buySuccess = true;
          } else if (type === "weap") {
            const wp = getWeaponById(id);
            if (!wp) return i.editReply({ content: "Weapon error!" });

            remaining = getUserRemainingStock(id, "weap");
            price = WEAPON_PRICES[wp.rarity.toLowerCase()];
            itemName = wp.name;
            itemEmoji = wp.emoji;

            if (remaining <= 0) {
              return i.editReply({
                content:
                  "<a:no:1455096623804715080> Bạn đã mua hết số lượng cho phép của vũ khí này!",
              });
            }
            if (userData.money < price) {
              return i.editReply({
                content: `<a:no:1455096623804715080> Thiếu tiền! Cần ${price.toLocaleString()}`,
              });
            }

            // Process Purchase
            userData.money -= price;
            userData.weapons.push({
              id: wp.id,
              name: wp.name,
              emoji: wp.emoji,
              rarity: wp.rarity,
              atk: wp.atk,
              def: wp.def,
              hp: wp.hp,
              favorite: false,
            });

            buySuccess = true;
          }

          if (buySuccess) {
            // Update Purchase History
            const purchaseIndex =
              userData.shopPurchaseHistory.purchases.findIndex(
                (p) => p.itemId === id,
              );
            if (purchaseIndex > -1) {
              userData.shopPurchaseHistory.purchases[purchaseIndex].count++;
            } else {
              userData.shopPurchaseHistory.purchases.push({
                itemId: id,
                count: 1,
              });
            }

            await userData.save();

            await i.editReply({
              content: `<a:checkyes:1455096631555915897> Đã mua thành công **${itemEmoji} ${itemName}**!`,
            });

            // Update the main shop message (not the interaction, which was ephemeral)
            await shopMsg.edit({ components: generateShopUI().components });
          }
        }
      } catch (err) {
        console.error("[SHOP COLLECTOR ERROR]", err);
        try {
          // Try to notify user if something went wrong
          if (!i.replied && !i.deferred)
            await i.reply({
              content: "❌ Có lỗi xảy ra!",
              flags: MessageFlags.Ephemeral,
            });
          else await i.editReply({ content: "❌ Có lỗi xảy ra!" });
        } catch (e) { }
      }
    });
  },
};
