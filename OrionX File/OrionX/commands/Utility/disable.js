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
  name: "disable",
  aliases: ["disablecmd", "cmdoff"],
  data: new SlashCommandBuilder()
    .setName("disable")
    .setDescription("Tắt một lệnh hoặc tất cả lệnh trên kênh hiện tại")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription('Tên lệnh muốn tắt hoặc "all"')
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
        const helpContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <:identifylogo_:1476463388300410942> Disable System <:identifylogo_:1476463388300410942>",
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "### Hướng dẫn sử dụng Disable\n" +
                "_Tắt một lệnh hoặc tất cả lệnh trên kênh hiện tại_\n\n" +
                "```yaml\nCú pháp: Xdisable <tên_lệnh> | all\n```",
            ),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "**Ví dụ**\n" +
                "> `Xdisable ping` - Tắt lệnh ping\n" +
                "> `Xdisable all` - Tắt tất cả lệnh\n\n" +
                "**Bật lại lệnh**\n" +
                "> Sử dụng `Xenable <lệnh>` để bật lại",
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

      const client = source.client || source.guild?.client;
      const targetCommand =
        client.commands.get(commandName) ||
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
        commandName === "all" ? "all" : targetCommand.name.toLowerCase();

      if (
        resolvedCommandName === "disable" ||
        resolvedCommandName === "enable" ||
        resolvedCommandName === "disablelist" ||
        resolvedCommandName === "disabledlist"
      ) {
        const protectedContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "> <a:no:1455096623804715080> Không thể tắt lệnh quản lý hệ thống!",
            ),
          );
        return await reply(source, {
          components: [protectedContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      let guildData =
        (await Guild.findOne({ guildId: guild.id })) ||
        (await Guild.create({
          guildId: guild.id,
          guildName: guild.name,
          disabledCommands: [],
        }));

      let channelConfig = guildData.disabledCommands.find(
        (dc) => dc.channelId === channelId,
      );
      if (!channelConfig) {
        guildData.disabledCommands.push({
          channelId,
          commands: [],
          disabledBy: user.id,
          disabledAt: new Date(),
        });

        channelConfig = guildData.disabledCommands.find(
          (dc) => dc.channelId === channelId,
        );
      }

      if (commandName === "all") {
        if (channelConfig.commands.includes("all")) {
          const alreadyContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "> <:warning:1455096625373380691> Tất cả lệnh đã bị tắt trên kênh này rồi!",
              ),
            );
          return await reply(source, {
            components: [alreadyContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        channelConfig.commands = ["all"];
        channelConfig.disabledBy = user.id;
        channelConfig.disabledAt = new Date();

        guildData.markModified("disabledCommands");
        await guildData.save();
        console.log(
          `[DISABLE] All commands disabled in channel ${channelId} by ${user.tag}`,
        );

        const successContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <a:checkyes:1455096631555915897> Đã tắt tất cả lệnh trên kênh",
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> - Tất cả lệnh đã bị tắt trên kênh ${source.channel}\n\n` +
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
        const errContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "> <:warning:1455096625373380691> Tất cả lệnh đang bị tắt. Dùng `Xenable all` để bật lại trước!",
          ),
        );
        return await reply(source, {
          components: [errContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (channelConfig.commands.includes(resolvedCommandName)) {
        const alreadyContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> <:warning:1455096625373380691> Lệnh \`${resolvedCommandName}\` đã bị tắt trên kênh này rồi!`,
            ),
          );
        return await reply(source, {
          components: [alreadyContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      channelConfig.commands.push(resolvedCommandName);
      channelConfig.disabledBy = user.id;
      channelConfig.disabledAt = new Date();

      guildData.markModified("disabledCommands");
      await guildData.save();

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## <a:checkyes:1455096631555915897> Đã tắt lệnh: \`${resolvedCommandName}\``,
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> - Lệnh \`${resolvedCommandName}\` đã bị tắt trên kênh ${source.channel}\n\n` +
              `- <:member:1446769169738502165> **Bởi:** ${user.tag}\n` +
              `- <a:clock:1446769163669602335> **Lúc:** ${new Date().toLocaleString("vi-VN")}`,
          ),
        );
      return await reply(source, {
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error in xdisable command:", error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "> <a:no:1455096623804715080> Đã xảy ra lỗi khi tắt lệnh.",
        ),
      );
      return await reply(source, {
        components: [errContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
