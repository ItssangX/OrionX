import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { Guild } from "../../database/models.js";
import { reply } from "../../utils/commandHelper.js";

function buildNoDataContainer() {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## <a:checkyes:1455096631555915897> KHÔNG CÓ LỆNH NÀO BỊ TẮT",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Tất cả lệnh đang hoạt động bình thường trên server này!",
      ),
    );
}

export default {
  name: "disabledlist",
  aliases: ["disablelist", "listdisabled", "listdisable"],
  data: new SlashCommandBuilder()
    .setName("disabledlist")
    .setDescription("Xem danh sách kênh và lệnh đang bị tắt trên server"),

  async execute(source) {
    try {
      const guildData = await Guild.findOne({ guildId: source.guild.id });
      if (
        !guildData ||
        !Array.isArray(guildData.disabledCommands) ||
        guildData.disabledCommands.length === 0
      ) {
        return await reply(source, {
          components: [buildNoDataContainer()],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const disabledConfigs = guildData.disabledCommands.filter(
        (config) => Array.isArray(config.commands) && config.commands.length > 0,
      );

      if (disabledConfigs.length === 0) {
        return await reply(source, {
          components: [buildNoDataContainer()],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const client = source.client || source.guild?.client;
      const disabledByMap = new Map();
      const disabledByIds = [
        ...new Set(disabledConfigs.map((config) => config.disabledBy).filter(Boolean)),
      ];

      await Promise.all(
        disabledByIds.map(async (userId) => {
          try {
            const user = await client.users.fetch(userId);
            if (user) disabledByMap.set(userId, user.tag);
          } catch {
            // Ignore fetch errors
          }
        }),
      );

      const entries = disabledConfigs.map((config) => {
        const channel = source.guild.channels.cache.get(config.channelId);
        const channelName = channel
          ? channel.toString()
          : `Kênh đã bị xóa (${config.channelId})`;

        const commandsList = config.commands.includes("all")
          ? "**Tất cả lệnh**"
          : config.commands.map((cmd) => `\`${cmd}\``).join(", ");

        const disabledByName =
          disabledByMap.get(config.disabledBy) || "Không xác định";

        const disabledAt = config.disabledAt
          ? new Date(config.disabledAt).toLocaleString("vi-VN")
          : "Không rõ";

        return {
          channelName,
          commandsList,
          disabledByName,
          disabledAt,
        };
      });

      const ITEMS_PER_PAGE = 10;
      const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));
      const ownerId = source.user?.id || source.author?.id;
      let currentPage = 0;

      const buildContainer = (page, disableNav = false) => {
        const start = page * ITEMS_PER_PAGE;
        const pageEntries = entries.slice(start, start + ITEMS_PER_PAGE);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## DANH SÁCH LỆNH BỊ TẮT"),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "Dưới đây là danh sách các lệnh đang bị vô hiệu hóa theo từng kênh.\n" +
                "Sử dụng `Xenable` để mở lại khi cần.",
            ),
          );

        for (const item of pageEntries) {
          container.addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          );
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ${item.channelName}\n` +
                `> **Lệnh:** ${item.commandsList}\n` +
                `> **Bởi:** ${item.disabledByName}\n` +
                `> **Lúc:** ${item.disabledAt}`,
            ),
          );
        }

        if (totalPages > 1) {
          const navRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("disabledlist_prev")
              .setEmoji("◀")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disableNav || page === 0),
            new ButtonBuilder()
              .setCustomId("disabledlist_page")
              .setLabel(`${page + 1}/${totalPages}`)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId("disabledlist_next")
              .setEmoji("▶")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disableNav || page >= totalPages - 1),
          );

          container.addActionRowComponents(navRow);
        }

        return container;
      };

      const sentMessage = await reply(source, {
        components: [buildContainer(currentPage)],
        flags: MessageFlags.IsComponentsV2,
        fetchReply: true,
      });

      if (totalPages <= 1 || !sentMessage?.createMessageComponentCollector) {
        return;
      }

      const collector = sentMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000,
      });

      collector.on("collect", async (interaction) => {
        try {
          if (interaction.user.id !== ownerId) {
            return interaction.reply({
              content: "> <a:no:1455096623804715080> Đây không phải nút của bạn!",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (interaction.customId === "disabledlist_prev" && currentPage > 0) {
            currentPage -= 1;
          } else if (
            interaction.customId === "disabledlist_next" &&
            currentPage < totalPages - 1
          ) {
            currentPage += 1;
          }

          await interaction.update({
            components: [buildContainer(currentPage)],
          });
        } catch {
          // Ignore collector update errors
        }
      });

      collector.on("end", async () => {
        try {
          await sentMessage.edit({
            components: [buildContainer(currentPage, true)],
          });
        } catch {
          // Ignore edit errors
        }
      });
    } catch (error) {
      console.error("Error in disabledlist command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> Đã xảy ra lỗi khi liệt kê danh sách.",
        ),
      );
      return await reply(source, {
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
