import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { findOrCreateUser } from '../../utils/userHelper.js';
import { reply, getUser, getOption } from '../../utils/commandHelper.js';

export default {
    name: 'profileedit',
    aliases: ['pe', 'editprofile', 'ep'],

    async execute(source, args) {
        try {
            const user = getUser(source);
            const userData = await findOrCreateUser(user.id, user.username);

            // Initialize profileSettings nếu chưa có
            if (!userData.profileSettings) {
                userData.profileSettings = {
                    color: '#5865F2',
                    title: null,
                    image: null,
                    showStats: true,
                    showPets: true,
                    showBadges: true
                };
                await userData.save();
            }

            // Không có args -> hiển thị menu
            const subcommand = source.options?.getSubcommand(false) || args[0]?.toLowerCase();

            if (!subcommand || subcommand === 'menu') {
                return await showEditMenu(source, userData);
            }

            const valueFromOption = (optName) => getOption(source, optName, 'string');
            let value = args.slice(1).join(' ');

            switch (subcommand) {
                case 'bio':
                    return await editBio(source, userData, valueFromOption('text') || value);
                case 'color':
                    return await editColor(source, userData, valueFromOption('hex') || value);
                case 'title':
                    return await editTitle(source, userData, valueFromOption('text') || value);
                case 'image':
                    return await editImage(source, userData, valueFromOption('url') || value);
                case 'toggle':
                    return await toggleSection(source, userData, valueFromOption('section') || args[1]);
                case 'reset':
                    return await resetProfile(source, userData);
                default:
                    return await showEditMenu(source, userData);
            }

        } catch (error) {
            console.error('<a:no:1455096623804715080> Lỗi profileedit:', error);
            await reply(source, { content: '> <a:no:1455096623804715080> **Lỗi!** Không thể chỉnh sửa profile.' });
        }
    }
};

// ==========================================
// HIỂN THỊ MENU CHỈNH SỬA
// ==========================================
function showEditMenu(source, userData) {
    const settings = userData.profileSettings;

    const menuContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## ✏️ CHỈNH SỬA PROFILE'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Các tùy chọn:**\n\n` +
            `- \`Xpe bio <nội dung>\` - Đổi bio (**500** <:Xcoin:1433810075927183441>)\n` +
            `- \`Xpe color <hex>\` - Đổi màu embed (**500** <:Xcoin:1433810075927183441>)\n` +
            `- \`Xpe title <text>\` - Đổi title (**1,000** <:Xcoin:1433810075927183441>)\n` +
            `- \`Xpe image <url>\` - Đổi ảnh nền (**2,000** <:Xcoin:1433810075927183441>)\n` +
            `- \`Xpe toggle <section>\` - Ẩn/hiện section (miễn phí)\n` +
            `- \`Xpe reset\` - Reset profile (miễn phí)\n\n` +
            `**Sections:** \`stats\`, \`pets\`, \`badges\``
        ))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 📊 Cài đặt hiện tại\n` +
            `- **Bio:** ${userData.bio || '*Chưa có*'}\n` +
            `- **Màu:** \`${settings.color}\`\n` +
            `- **Title:** ${settings.title || '*Chưa có*'}\n` +
            `- **Stats:** ${settings.showStats ? '<a:checkyes:1455096631555915897>' : '<a:no:1455096623804715080>'}\n` +
            `- **Pets:** ${settings.showPets ? '<a:checkyes:1455096631555915897>' : '<a:no:1455096623804715080>'}\n` +
            `- **Badges:** ${settings.showBadges ? '<a:checkyes:1455096631555915897>' : '<a:no:1455096623804715080>'}`
        ))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Số dư: ${userData.money.toLocaleString()} <:Xcoin:1433810075927183441>*`));

    return reply(source, { components: [menuContainer], flags: MessageFlags.IsComponentsV2 });
}

// ==========================================
// EDIT BIO
// ==========================================
async function editBio(source, userData, value) {
    const cost = 500;

    if (!value) {
        const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('<a:no:1455096623804715080> Vui lòng nhập nội dung bio!'));
        return await reply(source, { components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (value.length > 200) {
        const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('<a:no:1455096623804715080> Bio tối đa **200** ký tự!'));
        return await reply(source, { components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (userData.money < cost) {
        const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<a:no:1455096623804715080> Không đủ tiền! Cần \`${cost}\` <:Xcoin:1433810075927183441>`));
        return await reply(source, { components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }

    userData.money -= cost;
    userData.bio = value;
    await userData.save();

    const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:checkyes:1455096631555915897> ĐÃ ĐỔI BIO!'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `- **Bio mới:** ${value}\n` +
            `- **Chi phí:** -\`${cost}\` <:Xcoin:1433810075927183441>`
        ));

    return await reply(source, { components: [successContainer], flags: MessageFlags.IsComponentsV2 });
}

// ==========================================
// EDIT COLOR
// ==========================================
async function editColor(source, userData, value) {
    const cost = 500;

    if (!value) {
        const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('<a:no:1455096623804715080> Vui lòng nhập mã màu hex! VD: `#FF5733`'));
        return await reply(source, { components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Validate hex color
    const hexRegex = /^#?([0-9A-Fa-f]{6})$/;
    if (!hexRegex.test(value)) {
        const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('<a:no:1455096623804715080> Mã màu không hợp lệ! VD: `#FF5733`'));
        return await reply(source, { components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }

    const color = value.startsWith('#') ? value : `#${value}`;

    if (userData.money < cost) {
        const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<a:no:1455096623804715080> Không đủ tiền! Cần \`${cost}\` <:Xcoin:1433810075927183441>`));
        return await reply(source, { components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }

    userData.money -= cost;
    userData.profileSettings.color = color;
    await userData.save();

    const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:checkyes:1455096631555915897> ĐÃ ĐỔI MÀU PROFILE!'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `- **Màu mới:** \`${color}\`\n` +
            `- **Chi phí:** -\`${cost}\` <:Xcoin:1433810075927183441>`
        ));

    return await reply(source, { components: [successContainer], flags: MessageFlags.IsComponentsV2 });
}

// ==========================================
// EDIT TITLE
// ==========================================
async function editTitle(source, userData, value) {
    const cost = 1000;

    if (!value) {
        return await reply(source, { content: '> <a:no:1455096623804715080> Vui lòng nhập title! VD: `Xpe title Dragon Master`' });
    }

    if (value.length > 50) {
        return await reply(source, { content: '> <a:no:1455096623804715080> Title tối đa **50** ký tự!' });
    }

    if (userData.money < cost) {
        return await reply(source, { content: `> <a:no:1455096623804715080> Không đủ tiền! Cần \`${cost}\` <:Xcoin:1433810075927183441>` });
    }

    userData.money -= cost;
    userData.profileSettings.title = value;
    await userData.save();

    const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:checkyes:1455096631555915897> ĐÃ ĐỔI TITLE!'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `- **Title mới:** ${value}\n` +
            `- **Chi phí:** -\`${cost}\` <:Xcoin:1433810075927183441>`
        ));

    return await reply(source, { components: [successContainer], flags: MessageFlags.IsComponentsV2 });
}

// ==========================================
// EDIT IMAGE
// ==========================================
async function editImage(source, userData, value) {
    const cost = 2000;

    if (!value) {
        return await reply(source, { content: '> <a:no:1455096623804715080> Vui lòng nhập URL hình ảnh!' });
    }

    // Simple URL validation
    try {
        new URL(value);
    } catch {
        return await reply(source, { content: '> <a:no:1455096623804715080> URL không hợp lệ!' });
    }

    if (userData.money < cost) {
        return await reply(source, { content: `> <a:no:1455096623804715080> Không đủ tiền! Cần \`${cost}\` <:Xcoin:1433810075927183441>` });
    }

    userData.money -= cost;
    userData.profileSettings.image = value;
    await userData.save();

    const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:checkyes:1455096631555915897> ĐÃ ĐỔI ẢNH PROFILE!'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `- **Chi phí:** -\`${cost}\` <:Xcoin:1433810075927183441>\n` +
            `- *Xem profile để kiểm tra!*`
        ));

    return await reply(source, { components: [successContainer], flags: MessageFlags.IsComponentsV2 });
}

// ==========================================
// TOGGLE SECTION
// ==========================================
async function toggleSection(source, userData, section) {
    const validSections = ['stats', 'pets', 'badges'];

    if (!section || !validSections.includes(section.toLowerCase())) {
        return await reply(source, { content: '> <a:no:1455096623804715080> Section không hợp lệ! Chọn: `stats`, `pets`, `badges`' });
    }

    const key = `show${section.charAt(0).toUpperCase() + section.slice(1).toLowerCase()}`;
    userData.profileSettings[key] = !userData.profileSettings[key];
    await userData.save();

    const newState = userData.profileSettings[key] ? '**Hiện**' : '**Ẩn**';

    const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:checkyes:1455096631555915897> ĐÃ TOGGLE SECTION!'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `- **${section.toUpperCase()}:** ${newState}\n` +
            `- *Miễn phí*`
        ));

    return await reply(source, { components: [successContainer], flags: MessageFlags.IsComponentsV2 });
}

// ==========================================
// RESET PROFILE
// ==========================================
async function resetProfile(source, userData) {
    userData.profileSettings = {
        color: '#5865F2',
        title: null,
        image: null,
        showStats: true,
        showPets: true,
        showBadges: true
    };
    userData.bio = 'Chưa có bio';
    await userData.save();

    const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:checkyes:1455096631555915897> ĐÃ RESET PROFILE!'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `- Tất cả cài đặt đã được đặt về mặc định!\n` +
            `- *Miễn phí*`
        ));

    return await reply(source, { components: [successContainer], flags: MessageFlags.IsComponentsV2 });
}
