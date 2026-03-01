import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { reply, getUser } from "../../utils/commandHelper.js";

export default {
  name: "servershard",
  aliases: ["svs", "servershardstats", "guildstatsshard"],

  async execute(source, args) {
    try {
      const user = getUser(source);
      const client = source.client;
      const guilds = client.guilds.cache;

      const totalGuilds = guilds.size;
      const totalMembers = guilds.reduce(
        (acc, guild) => acc + guild.memberCount,
        0,
      );

      const currentGuild = source.guild;
      const currentGuildMembers = currentGuild ? currentGuild.memberCount : 0;
      const currentGuildOwner = currentGuild ? currentGuild.ownerId : "N/A";

      const topServers = guilds
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(10);

      let serverList = "";
      topServers.forEach((guild, index) => {
        serverList += `${index + 1}. **${guild.name}**\n\`${guild.memberCount}\` members\n\n`;
      });

      const serversContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## 📊 Server List 📊"),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🌍 Tổng Quan\n` +
              `- **Tổng server:** \`${totalGuilds}\`\n` +
              `- **Tổng user:** \`${totalMembers.toLocaleString()}\``,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🏠 Server Hiện Tại\n` +
              `- **Tên:** \`${currentGuild.name}\`\n` +
              `- **ID:** \`${currentGuild.id}\`\n` +
              `- **Thành viên:** \`${currentGuildMembers}\`\n` +
              `- **Owner:** <@${currentGuildOwner}>`,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### <:leaderboard:1463850215592165448> Top 10 Servers \n` +
              (serverList || "> Không có dữ liệu"),
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`*Yêu cầu bởi ${user.username}*`),
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("📖 Hướng Dẫn")
          .setStyle(ButtonStyle.Link)
          .setURL("https://orxdocs.web.app/"),
        new ButtonBuilder()
          .setLabel("🌐 Trang Chủ")
          .setStyle(ButtonStyle.Link)
          .setURL("https://orxbot.web.app/"),
      );

      serversContainer.addActionRowComponents(row);

      await reply(source, {
        components: [serversContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("<a:no:1455096623804715080> Lỗi servers command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> **Lỗi!** Không thể lấy thông tin servers.",
        ),
      );
      await reply(source, {
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
