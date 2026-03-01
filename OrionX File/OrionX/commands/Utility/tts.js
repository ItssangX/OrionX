import gtts from 'google-tts-api';
import { createWriteStream, unlinkSync } from 'fs';
import { get } from 'https';
import { EmbedBuilder } from 'discord.js';

// --- Dynamic Voice Loading ---
let voice = null;
try {
    voice = await import('@discordjs/voice');
} catch (e) {
    // @discordjs/voice not available - TTS disabled
}


// ==================== FFMPEG SETUP ====================
try {
    const ffmpegStatic = await import('ffmpeg-static');
    process.env.FFMPEG_PATH = ffmpegStatic.default;
} catch (error) {
    // ffmpeg-static not found, using system FFmpeg
}

// ==================== COOLDOWN SYSTEM ====================
const ttsCooldowns = new Map();
const TTS_COOLDOWN = 5000; // 5 giây

// ==================== VOICE TIMEOUT SYSTEM ====================
const leaveTimeouts = new Map(); // Timeout để disconnect sau 30s

// ==================== HELPER: CHECK COOLDOWN ====================
function checkTTSCooldown(userId) {
    const now = Date.now();

    if (ttsCooldowns.has(userId)) {
        const lastUse = ttsCooldowns.get(userId);
        const timeLeft = TTS_COOLDOWN - (now - lastUse);

        if (timeLeft > 0) {
            return {
                ready: false,
                timeLeft: timeLeft,
                unixTimestamp: Math.floor((now + timeLeft) / 1000)
            };
        }
    }

    ttsCooldowns.set(userId, now);
    return { ready: true };
}

// ==================== HELPER: DOWNLOAD AUDIO ====================
function downloadAudio(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(filepath);

        get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close(() => resolve(filepath));
            });

            file.on('error', (err) => {
                unlinkSync(filepath);
                reject(err);
            });
        }).on('error', (err) => {
            unlinkSync(filepath);
            reject(err);
        });
    });
}

export default {
    name: 'tts',

    async execute(message, args) {
        if (!voice) {
            return message.reply('⚠️ **Lỗi:** Bot đang chạy ở chế độ tương thích Android, tính năng TTS (âm thanh) hiện không khả dụng.');
        }

        const text = args.join(' ');

        if (!text || text.trim().length === 0) {
            return message.reply('🔊 **Cú pháp:** `Xtts <nội dung>`\n**Ví dụ:** `Xtts Hello World`');
        }

        if (text.length > 200) {
            return message.reply(`<a:no:1455096623804715080> **Văn bản quá dài!** Giới hạn: 200 ký tự (hiện tại: ${text.length})`);
        }

        const cooldown = checkTTSCooldown(message.author.id);
        if (!cooldown.ready) {
            return message.reply(`<a:clock:1446769163669602335> **TTS COOLDOWN:** Có thể dùng lại sau <t:${cooldown.unixTimestamp}:R> (\`${Math.ceil(cooldown.timeLeft / 1000)}s\`)`);
        }

        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) {
            return message.reply('<a:no:1455096623804715080> **Bạn chưa vào voice channel!**');
        }

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('<a:no:1455096623804715080> **Bot không có quyền Connect/Speak trong kênh này!**');
        }

        const botVoiceChannel = message.guild.members.me?.voice?.channel;
        if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
            return message.reply(`<a:no:1455096623804715080> **Bot đang ở voice channel khác (<#${botVoiceChannel.id}>)!**`);
        }

        const tempFile = `./tts_${Date.now()}_${message.author.id}.mp3`;
        let processingMsg = null;
        let connection = null;

        try {
            processingMsg = await message.reply('🔄 **Đang tạo audio...**');

            const ttsUrl = gtts.getAudioUrl(text, { lang: 'vi', slow: false, host: 'https://translate.google.com' });
            await downloadAudio(ttsUrl, tempFile);

            await processingMsg.edit('🔌 **Đang kết nối voice channel...**');

            const guildId = message.guild.id;
            if (leaveTimeouts.has(guildId)) {
                clearTimeout(leaveTimeouts.get(guildId));
                leaveTimeouts.delete(guildId);
            }

            connection = voice.joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false
            });

            try {
                await Promise.race([
                    voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 30000),
                    voice.entersState(connection, voice.VoiceConnectionStatus.Signalling, 5000)
                        .then(() => voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 25000))
                ]);
            } catch (error) {
                if (connection) connection.destroy();
                try { unlinkSync(tempFile); } catch { }
                return await processingMsg.edit('<a:no:1455096623804715080> **KHÔNG THỂ KẾT NỐI VOICE:** Discord đang lag hoặc bot thiếu quyền.');
            }

            await processingMsg.edit('🔊 **Đang phát TTS...**');

            const player = voice.createAudioPlayer();
            const resource = voice.createAudioResource(tempFile);
            player.play(resource);
            connection.subscribe(player);

            await new Promise((resolve, reject) => {
                player.once(voice.AudioPlayerStatus.Idle, () => {
                    try { unlinkSync(tempFile); } catch { }
                    const timeout = setTimeout(() => {
                        connection.destroy();
                        leaveTimeouts.delete(guildId);
                    }, 30000);
                    leaveTimeouts.set(guildId, timeout);
                    resolve();
                });
                player.once('error', (error) => reject(error));
            });

            await processingMsg.edit(`<a:checkyes:1455096631555915897> **TTS HOÀN TẤT:** "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n⏱️ Bot sẽ rời voice sau **30s** không hoạt động`);

        } catch (error) {
            console.error('<a:no:1455096623804715080> [TTS] Error:', error);
            try { unlinkSync(tempFile); } catch { }
            if (processingMsg) await processingMsg.edit(`<a:no:1455096623804715080> **Lỗi TTS:** ${error.message}`).catch(() => { });
            else await message.reply(`<a:no:1455096623804715080> **Lỗi TTS:** ${error.message}`).catch(() => { });
        }
    }
};

// ==================== CLEANUP ON BOT SHUTDOWN ====================
export function cleanupTTS() {
    for (const [guildId, timeout] of leaveTimeouts.entries()) {
        clearTimeout(timeout);
    }

    leaveTimeouts.clear();
    ttsCooldowns.clear();
}