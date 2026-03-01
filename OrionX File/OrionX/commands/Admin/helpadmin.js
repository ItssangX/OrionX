import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { User } from '../../database/models.js';
import { ADMIN_ID } from '../../config/captchaConfig.js';

const ADMIN_MAIN = ADMIN_ID;

export default {
  name: 'helpadmin',
  aliases: ['hadmin', 'adminhelp'],
  description: 'Xem hướng dẫn lệnh admin',

  async execute(message) {
    try {
      const userId = message.author.id;
      const isAdminMain = userId === ADMIN_MAIN;

      let isAdmin = false;
      if (!isAdminMain) {
        const user = await User.findOne({ userId });
        isAdmin = user?.isAdmin || false;
      }

      const helpContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 👑 HƯỚNG DẪN LỆNH ADMIN'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

      if (isAdminMain) {
        helpContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `> Bạn là **Admin Main** - Toàn quyền quản lý!\n\n` +
          `**[ QUẢN LÝ ADMIN ]**\n` +
          `- \`admin add @user\` - Thêm admin mới\n` +
          `- \`admin kick @user\` - Xóa quyền admin\n` +
          `- \`admin list\` - Xem danh sách tất cả admin\n` +
          `- \`admin logs [limit]\` - Xem lịch sử admin actions\n\n` +
          `**[ QUẢN LÝ TIỀN TỆ ]**\n` +
          `- \`admin give @user <số tiền>\` - Tặng tiền cho user\n` +
          `- \`admin set @user +/-<số tiền>\` - Điều chỉnh tiền user\n\n` +
          `**[ QUẢN LÝ USER - ⚠️ NGUY HIỂM ]**\n` +
          `- \`ban @user [lý do]\` - Ban vĩnh viễn user\n` +
          `- \`unban @user\` - Gỡ ban user\n` +
          `- \`mute @user <thời gian>\` - Mute user (10m, 1h, 1d)\n` +
          `- \`rsdata @user\` - ⚠️ RESET TOÀN BỘ DATA USER`
        ));
      } else if (isAdmin) {
        helpContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `> Bạn là **Admin** - Có quyền quản lý tiền tệ!\n\n` +
          `**[ QUYỀN HẠN ADMIN ]**\n` +
          `- \`admin give @user <số tiền>\` - Tặng tiền cho user\n` +
          `- \`admin set @user +/-<số tiền>\` - Điều chỉnh tiền user\n` +
          `- \`admin list\` - Xem danh sách tất cả admin\n` +
          `- \`admin logs [limit]\` - Xem lịch sử admin của chính mình`
        ));
      } else {
        helpContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `> Bạn không phải admin nhưng có thể xem danh sách!\n\n` +
          `**[ QUYỀN HẠN NGƯỜI DÙNG ]**\n` +
          `- \`admin list\` - Xem danh sách tất cả admin`
        ));
      }

      helpContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
      helpContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 📊 LỆNH HỮU ÍCH KHÁC\n` +
        `- \`servers\` hoặc \`sv\` - Xem thông tin bot trên các server\n` +
        `*Yêu cầu bởi ${message.author.username}*`
      ));

      message.reply({ components: [helpContainer], flags: MessageFlags.IsComponentsV2 });

    } catch (error) {
      console.error('<a:no:1455096623804715080> Lỗi helpadmin:', error);
      const errContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('> <a:no:1455096623804715080> **Lỗi!** Không thể hiển thị help.'));
      message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
