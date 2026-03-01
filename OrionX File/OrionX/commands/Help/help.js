import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { ADMIN_ID } from "../../config/captchaConfig.js";
import { reply, getUser } from "../../utils/commandHelper.js";

export default {
  name: "help",
  aliases: ["tro-giup", "huongdan"],
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Xem danh sách lệnh của OrionX"),

  async execute(source, args) {
    const user = getUser(source);
    const isAdmin = user.id === ADMIN_ID;

    // Main Help Embed
    const mainEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({
        name: "OrionX",
        iconURL: source.client.user.displayAvatarURL(),
      })
      .setTitle("❈ OrionX Bot ⌬")
      .setURL("https://orxbot.web.app/")
      .setDescription(
        "> * <:botgradient_:1476463355781972091> **OrionX ❈ **  \n" +
          ">    * <:qatesters:1474807275637047446> Bot **OrionX** nền tảng bot đa module, linh hoạt và mở rộng.  🛰️\n" +
          ">    - <:bank:1476487486799745045> Tiền Tệ Chính Thức Của Bot Là **<:Xcoin:1433810075927183441>** 🛰️\n\n" +
          "> * **Tính Năng ❈  ** \n" +
          ">   * <a:2giveaway:1446775157036417125> **Giveaway**\n" +
          ">   * 🔊 **TTS**\n" +
          ">   * <a:moneybag:1476448471274881024> **Economy**\n" +
          ">   * 🐾 **Pet / Battle**\n" +
          ">   * <:playing:1476453754160283749> **Game**\n" +
          ">   * 📊 **Level / XP**\n" +
          ">   * <:trade:1476448459748802601> **Transfer**\n" +
          ">   * <:Utility:1456810282465624135> **Utility**" +
          "\n\n> - <:regionicon_:1476463334042636361> **Web:** https://orxbot.web.app/\n" +
          "> - <:docs:1476490620314058933> **Docs:** https://orxdocs.web.app/",
      )
      .setImage(
        "https://media.discordapp.net/attachments/1429068134668832848/1456602423614378026/standard.gif?ex=6958f638&is=6957a4b8&hm=b382fcee02714f6cdb19527f1fb861520efb9ccf6e2ebe5250a811b6c02b8d9e&=&width=1804&height=105",
      )
      .setThumbnail(
        "https://media.discordapp.net/attachments/1429068134668832848/1456603087501398189/OrionX_Avatar_Gif.gif?ex=696e0ed6&is=696cbd56&hm=dd3284629184ce2fc9332cd78271699fd9e34c74955d8a867a24f6bc8c245cec&=&width=320&height=320",
      )
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category_select")
      .setPlaceholder("📋 Chọn danh mục lệnh...")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Economy & Shop")
          .setValue("economy")
          .setDescription("Kiếm tiền, làm việc, mua bán")
          .setEmoji("<a:moneybag:1476448471274881024>"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Games & Casino")
          .setValue("games")
          .setDescription("Giải trí, cá cược, mini-games")
          .setEmoji("<:playing:1476453754160283749>"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Pet & Battle")
          .setValue("pets")
          .setDescription("Chiến đấu, tiến hóa, săn pet")
          .setEmoji("🐾"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Profile & Social")
          .setValue("profile")
          .setDescription("Hồ sơ, level, bảng xếp hạng")
          .setEmoji("<:member:1446769169738502165>"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Bot Info & Links")
          .setValue("info")
          .setDescription("Ping, invite, web, docs")
          .setEmoji("<:informationbadge:1455096618755031192>"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Utility & Config")
          .setValue("utility")
          .setDescription("Giveaway, TTS, bật tắt lệnh")
          .setEmoji("<:Utility:1456810282465624135>"),
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await reply(source, {
      embeds: [mainEmbed],
      components: [row],
    });
  },
};
