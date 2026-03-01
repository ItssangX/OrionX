import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Guild } from "../../database/models.js";
import { reply, getUser, getOption } from "../../utils/commandHelper.js";

export default {
  name: "enable",
  aliases: ["enablecmd", "cmdon"],
  data: new SlashCommandBuilder()
    .setName("enable")
    .setDescription("Bật lại các lệnh đã bị tắt trên kênh")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription('Tên lệnh muốn bật hoặc "all"')
        .setRequired(true),
    ),

  async execute(source, args) {
    try {
      const member = source.member;
      if (!member.permissions.has("Administrator")) {
        const noPermContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <a:no:1455096623804715080> Bạn cần quyền **Administrator** để sử dụng lệnh này!",
          ),
        );
        return await reply(source, {
          components: [noPermContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const commandName =
        getOption(source, "command", "string") || args?.[0]?.toLowerCase();

      if (!commandName) {
        console.log(`[ENABLE] Missing commandName for ${getUser(source).tag}`);
        const helpContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <:identifylogo_:1476463388300410942> Enable System <:identifylogo_:1476463388300410942>",
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "### Hướng dẫn sử dụng Enable\n" +
                "_Bật lại các lệnh đã bị tắt trên kênh_\n\n" +
                "```yaml\nCú pháp: Xenable <tên_lệnh> | all\n```",
            ),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "**Ví dụ**\n" +
                "> `Xenable ping` - Bật lại lệnh ping\n" +
                "> `Xenable all` - Bật lại tất cả lệnh\n\n" +
                "**Xem danh sách**\n" +
                "> Sử dụng `Xdisabledlist` để xem lệnh đang tắt",
            ),
          );
        return await reply(source, {
          components: [helpContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const channelId = source.channel.id;
      const user = getUser(source);
      const guild = source.guild;

      const guildData = await Guild.findOne({ guildId: guild.id });
      if (
        !guildData ||
        !guildData.disabledCommands ||
        guildData.disabledCommands.length === 0
      ) {
        const noDataContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <:warning:1455096625373380691> Không có lệnh nào đang bị tắt trên server này!",
          ),
        );
        return await reply(source, {
          components: [noDataContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const client = source.client || source.guild?.client;
      const exemptCommands = new Set([
        "disable",
        "enable",
        "disablelist",
        "disabledlist",
      ]);

      const targetCommand =
        commandName === "all"
          ? null
          : client.commands.get(commandName) ||
            client.commands.find((cmd) =>
              cmd.aliases?.map((a) => a.toLowerCase()).includes(commandName),
            );

      if (commandName !== "all" && !targetCommand) {
        const notFoundContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> <a:no:1455096623804715080> Không tìm thấy lệnh \`${commandName}\`!`,
            ),
          );
        return await reply(source, {
          components: [notFoundContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const resolvedCommandName =
        commandName === "all"
          ? "all"
          : targetCommand
            ? targetCommand.name.toLowerCase()
            : commandName;

      const channelIndex = guildData.disabledCommands.findIndex(
        (dc) => dc.channelId === channelId,
      );
      if (channelIndex === -1) {
        const noChannelContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "> <:warning:1455096625373380691> Không có lệnh nào bị tắt trên kênh này!",
            ),
          );
        return await reply(source, {
          components: [noChannelContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const channelConfig = guildData.disabledCommands[channelIndex];

      if (resolvedCommandName === "all") {
        if (channelConfig.commands.length === 0) {
          const noCommandsContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "> <:warning:1455096625373380691> Không có lệnh nào bị tắt trên kênh này!",
              ),
            );
          return await reply(source, {
            components: [noCommandsContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        guildData.disabledCommands.splice(channelIndex, 1);
        guildData.markModified("disabledCommands");
        await guildData.save();
        console.log(
          `[ENABLE] All commands enabled in channel ${channelId} by ${user.tag}`,
        );

        const successContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <a:checkyes:1455096631555915897> Đã bật lại tất cả lệnh",
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> - Tất cả lệnh đã được bật lại trên kênh ${source.channel}\n\n` +
                `- <:member:1446769169738502165> **Bởi:** ${user.tag}\n` +
                `- <a:clock:1446769163669602335> **Lúc:** ${new Date().toLocaleString("vi-VN")}`,
            ),
          );
        return await reply(source, {
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (channelConfig.commands.includes("all")) {
        // Chuyển trạng thái "all" về danh sách cụ thể để có thể mở riêng từng lệnh.
        channelConfig.commands = [
          ...new Set(
            [...client.commands.values()]
              .map((cmd) => cmd.name.toLowerCase())
              .filter((name) => !exemptCommands.has(name)),
          ),
        ];
      }

      const commandIndex = channelConfig.commands.indexOf(resolvedCommandName);
      if (commandIndex === -1) {
        const notDisabledContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> <:warning:1455096625373380691> Lệnh \`${resolvedCommandName}\` không bị tắt trên kênh này!`,
            ),
          );
        return await reply(source, {
          components: [notDisabledContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      channelConfig.commands.splice(commandIndex, 1);
      if (channelConfig.commands.length === 0)
        guildData.disabledCommands.splice(channelIndex, 1);

      guildData.markModified("disabledCommands");
      await guildData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:checkyes:1455096631555915897> Đã bật lại lệnh: \`${resolvedCommandName}\``,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> - Lệnh \`${resolvedCommandName}\` đã được bật lại trên kênh ${source.channel}\n\n` +
              `- <:member:1446769169738502165> **Bởi:** ${user.tag}\n` +
              `- <a:clock:1446769163669602335> **Lúc:** ${new Date().toLocaleString("vi-VN")}`,
          ),
        );
      return await reply(source, {
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error in xenable command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> Đã xảy ra lỗi khi bật lại lệnh.",
        ),
      );
      return await reply(source, {
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
