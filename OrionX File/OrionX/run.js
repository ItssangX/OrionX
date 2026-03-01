import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CONFIGURATION ====================
const BOT_FILE = './shard.js';
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1431240781397491883/ZXFFISKqH0Dp-ZFEPfztoROlpihCdCj7gWr44f5lYdiV_2XV85OuA_ocZ2ZkCOmn2PEg';
const CRASH_LOG_FILE = path.join(__dirname, 'logs', 'crash.log');

// ==================== VARIABLES ====================
let botProcess = null;
let isRestarting = false;
let startTime = Date.now();
let restartCount = 0;
let forceKillTimeout = null;

// ==================== COLORS ====================
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
};

// ==================== UTILITIES ====================
function getUptime() {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    return `${h}h ${m}m ${s}s`;
}

function getTimestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function ensureLogDir() {
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
}

function logCrashToFile(error, type = 'CRASH') {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const logEntry = `\n[${timestamp}] [${type}]\n${error}\n${'='.repeat(60)}\n`;

    fs.appendFileSync(CRASH_LOG_FILE, logEntry);
}

// ==================== DISPLAY ====================
function clearLine() {
    process.stdout.write('\r\x1b[K');
}

function printHeader() {
    console.clear();
    console.log();
    console.log(`${c.cyan}  ╔══════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}  ║${c.reset}  ${c.bold}${c.magenta}ORIONX BOT MANAGER${c.reset}                                      ${c.cyan}║${c.reset}`);
    console.log(`${c.cyan}  ╠══════════════════════════════════════════════════════════╣${c.reset}`);
    console.log(`${c.cyan}  ║${c.reset}  ${c.dim}Sharding Mode - Production Ready${c.reset}                        ${c.cyan}║${c.reset}`);
    console.log(`${c.cyan}  ╚══════════════════════════════════════════════════════════╝${c.reset}`);
    console.log();
}

function printStatus() {
    const status = botProcess ? `${c.bgGreen}${c.white} ONLINE ${c.reset}` : `${c.bgRed}${c.white} OFFLINE ${c.reset}`;
    const activity = `${c.blue}xhelp${c.reset} ${c.dim}|${c.reset} ${c.magenta}OrionX Bot${c.reset}`;
    console.log(`  ${c.dim}[${getTimestamp()}]${c.reset} ${status} ${activity}  Uptime: ${c.cyan}${getUptime()}${c.reset}  Restarts: ${c.yellow}${restartCount}${c.reset}`);
}

function printControls() {
    console.log();
    console.log(`  ${c.dim}────────────────────────────────────────────────────────────${c.reset}`);
    console.log(`  ${c.bold}ĐIỀU KHIỂN:${c.reset}`);
    console.log(`    ${c.bgBlue}${c.white} Ctrl+R ${c.reset}  Khởi động lại bot thủ công`);
    console.log(`    ${c.bgRed}${c.white} Ctrl+C ${c.reset}  Dừng bot và thoát`);
    console.log(`  ${c.dim}────────────────────────────────────────────────────────────${c.reset}`);
    console.log();
}

function printLog(type, msg) {
    const time = `${c.dim}[${getTimestamp()}]${c.reset}`;
    switch (type) {
        case 'info':
            console.log(`  ${time} ${c.cyan}ℹ${c.reset}  ${msg}`);
            break;
        case 'success':
            console.log(`  ${time} ${c.green}✔${c.reset}  ${msg}`);
            break;
        case 'warn':
            console.log(`  ${time} ${c.yellow}⚠${c.reset}  ${msg}`);
            break;
        case 'error':
            console.log(`  ${time} ${c.red}✖${c.reset}  ${msg}`);
            break;
        case 'restart':
            console.log(`  ${time} ${c.magenta}🔄${c.reset} ${msg}`);
            break;
    }
}

// ==================== WEBHOOK ====================
async function sendWebhook(title, description, color = 0x5865F2, status = '') {
    if (!WEBHOOK_URL) return;

    const embed = {
        title: `[BOT] ${title}`,
        description: description,
        color: color,
        fields: [
            { name: 'Uptime', value: getUptime(), inline: true },
            { name: 'Restarts', value: `${restartCount}`, inline: true }
        ],
        footer: { text: `OrionX Manager${status ? ' - ' + status : ''}` },
        timestamp: new Date().toISOString()
    };

    try {
        const url = new URL(WEBHOOK_URL);
        const payload = JSON.stringify({ embeds: [embed] });

        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        });

        req.on('error', () => { }); // Silent fail
        req.write(payload);
        req.end();
    } catch (err) {
        // Silent fail
    }
}

// ==================== BOT MANAGEMENT ====================
function startBot() {
    if (botProcess) {
        printLog('warn', 'Bot đang chạy, không thể khởi động lại');
        return;
    }

    printLog('info', 'Đang khởi động bot...');

    botProcess = spawn(process.execPath, [BOT_FILE], {
        stdio: 'inherit',
        shell: false,
        env: { ...process.env, FORCE_COLOR: '1' }
    });

    const startMsg = restartCount === 0 ? 'Bot đã khởi động' : 'Bot đã restart';
    sendWebhook(startMsg, 'Bot đang chạy', 0x00FF00, 'Online');

    botProcess.on('close', (code) => {
        if (forceKillTimeout) {
            clearTimeout(forceKillTimeout);
            forceKillTimeout = null;
        }

        botProcess = null;

        if (code !== null && code !== 0) {
            // CRASH - Log to file and console
            const crashMsg = `Bot crash với exit code: ${code}`;
            printLog('error', crashMsg);
            logCrashToFile(`Exit code: ${code}`, 'BOT_CRASH');

            sendWebhook('Bot Crash!', `Exit code: ${code}`, 0xFF0000, 'Error');

            // Auto restart on crash
            if (!isRestarting) {
                printLog('restart', 'Tự động restart sau 3 giây...');
                setTimeout(() => {
                    restartCount++;
                    startBot();
                }, 3000);
            }
        } else if (code === 0) {
            printLog('success', 'Bot đã dừng bình thường');
        }
    });

    botProcess.on('error', (err) => {
        const errorMsg = `Lỗi khởi động bot: ${err.message}`;
        printLog('error', errorMsg);
        logCrashToFile(err.stack || err.message, 'START_ERROR');
        sendWebhook('Lỗi khởi động', err.message, 0xFF0000, 'Error');
        botProcess = null;
    });
}

function stopBot() {
    if (!botProcess) {
        printLog('warn', 'Bot chua chay');
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        printLog('info', 'Dang dung bot...');
        const pid = botProcess.pid;

        if (process.platform === 'win32') {
            try {
                const killProcess = spawn('taskkill', ['/pid', pid, '/f', '/t'], {
                    stdio: 'ignore'
                });

                killProcess.on('close', () => {
                    if (forceKillTimeout) {
                        clearTimeout(forceKillTimeout);
                        forceKillTimeout = null;
                    }
                    botProcess = null;
                    printLog('success', 'Bot da dung');
                    resolve();
                });

                forceKillTimeout = setTimeout(() => {
                    botProcess = null;
                    resolve();
                }, 5000);

            } catch (err) {
                botProcess = null;
                resolve();
            }
            return;
        }

        // Linux/Mac
        forceKillTimeout = setTimeout(() => {
            if (botProcess) {
                try {
                    botProcess.kill('SIGKILL');
                } catch (err) { }
                botProcess = null;
                resolve();
            }
        }, 10000);

        botProcess.once('close', () => {
            if (forceKillTimeout) {
                clearTimeout(forceKillTimeout);
                forceKillTimeout = null;
            }
            botProcess = null;
            printLog('success', 'Bot da dung');
            resolve();
        });

        try {
            botProcess.kill('SIGTERM');
            setTimeout(() => {
                if (botProcess) {
                    botProcess.kill('SIGKILL');
                }
            }, 3000);
        } catch (err) {
            botProcess = null;
            resolve();
        }
    });
}

async function restartBot(reason = 'Manual') {
    if (isRestarting) {
        printLog('warn', 'Dang trong qua trinh restart...');
        return;
    }

    isRestarting = true;
    restartCount++;
    printLog('restart', `Restart bot (Ly do: ${reason})`);
    sendWebhook('Restart Bot', `Ly do: ${reason}`, 0xFFA500, 'Restarting');

    await stopBot();

    setTimeout(() => {
        startBot();
        isRestarting = false;
    }, 3000);
}

// ==================== KEYBOARD HANDLER ====================
function setupKeyboard() {
    readline.emitKeypressEvents(process.stdin);

    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            handleExit();
            return;
        }

        if (key.ctrl && key.name === 'r') {
            console.log();
            printLog('restart', 'Nhấn Ctrl+R - Restart thủ công');
            restartBot('Ctrl+R');
            return;
        }
    });
}

// ==================== EXIT HANDLER ====================
function handleExit() {
    console.log();
    printLog('info', 'Dang thoat...');
    sendWebhook('Manager dung', 'Bot manager da thoat', 0xFF6B6B, 'Offline');

    if (botProcess) {
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', botProcess.pid, '/f', '/t']);
            } else {
                botProcess.kill('SIGKILL');
            }
        } catch (err) { }

        setTimeout(() => process.exit(0), 1000);
    } else {
        process.exit(0);
    }
}

// ==================== ERROR HANDLERS ====================
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

process.on('uncaughtException', (err) => {
    const errorMsg = `Uncaught Exception: ${err.message}`;
    printLog('error', errorMsg);
    console.log(`  ${c.red}${err.stack}${c.reset}`);
    logCrashToFile(err.stack || err.message, 'UNCAUGHT_EXCEPTION');
    sendWebhook('Uncaught Exception', err.message, 0xFF0000, 'Error');
});

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message ?? reason?.toString?.() ?? String(reason);
    const stack = reason?.stack ?? msg; // Get full stack trace

    // Skip Discord / sharding lightweight errors
    if (msg.includes('MESSAGE_REFERENCE_UNKNOWN_MESSAGE') ||
        msg.includes('Invalid Form Body') ||
        msg.includes('Unknown interaction') ||
        msg.includes('Invalid shard')) {
        return;
    }

    printLog('error', `Unhandled Rejection:\n\x1b[31m${stack}\x1b[0m`);
    logCrashToFile(stack, 'UNHANDLED_REJECTION');
    sendWebhook('Unhandled Rejection', msg, 0xFF0000, 'Error');
});

// ==================== STARTUP ====================
ensureLogDir();
printHeader();
printControls();
printLog('info', 'Khởi động Manager...');
setupKeyboard();
startBot();

printLog('success', 'Manager đã sẵn sàng');
printLog('info', `Log crash: ${c.dim}logs/crash.log${c.reset}`);
console.log();