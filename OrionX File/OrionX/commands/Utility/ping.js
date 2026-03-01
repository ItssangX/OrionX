import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { update as safeUpdate } from "../../utils/commandHelper.js";

const execFileAsync = promisify(execFile);

export default {
  name: "ping",
  description: "Kiem tra do tre va trang thai he thong",
  async execute(message) {
    try {
      const start = Date.now();
      const msg = await message.reply({
        content: "> 🏓 **Pinging...**",
        fetchReply: true,
      });
      const end = Date.now();

      let currentRtt = end - start;
      let currentWs = Math.round(message.client.ws.ping);
      let showDetails = false;

      const generatePingUI = async () => {
        const stateColor =
          currentWs < 100 ? "🟢" : currentWs < 200 ? "🟡" : "🔴";
        const statusText =
          currentWs < 100 ? "Good" : currentWs < 200 ? "Fair" : "Laggy";

        let contentText =
          `## 🏓 Pong! (${statusText})\n` +
          `**📶 Bot Latency:** \`${currentRtt}ms\`\n` +
          `**📡 API Latency:** \`${currentWs}ms\` ${stateColor}`;

        if (showDetails) {
          const details = await collectSystemDetails(message.client);
          contentText +=
            `\n\n### 📊 System Info\n` +
            `**🧩 Shard:** \`${details.shardLabel}\`\n` +
            `**⏱️ Uptime:** \`${details.uptime}\`\n` +
            `**💾 RAM (Host):** \`${details.ramHost}\`\n` +
            `**🧠 RAM (Process):** \`${details.ramProcess}\`\n` +
            `**🖥️ CPU (Host):** \`${details.cpuHost}\`\n` +
            `**⚙️ CPU (Process):** \`${details.cpuProcess}\`\n` +
            `**🎮 GPU:** \`${details.gpu}\`\n` +
            `**🔩 Node.js:** \`${process.version}\`\n` +
            `**💻 OS:** \`${details.os}\`\n` +
            `**🏷️ Hostname:** \`${details.hostname}\``;
        }

        contentText += `\n\n> *Requested by @${message.author.username}*`;

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(contentText),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ping_refresh")
            .setLabel("Refresh")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(showDetails ? "ping_hide_details" : "ping_details")
            .setLabel(showDetails ? "Hide Info" : "System Info")
            .setEmoji(showDetails ? "🧾" : "🧪")
            .setStyle(ButtonStyle.Secondary),
        );

        container.addActionRowComponents(row);
        return { container };
      };

      await msg.edit({
        content: "",
        components: [(await generatePingUI()).container],
        flags: MessageFlags.IsComponentsV2,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      const v2Flags = { flags: MessageFlags.IsComponentsV2 };

      collector.on("collect", async (i) => {
        try {
          if (i.user.id !== message.author.id) {
            return i
              .reply({
                content: "> ❌ Khong phai lenh cua ban!",
                flags: MessageFlags.Ephemeral,
              })
              .catch(() => {});
          }

          if (i.customId === "ping_refresh") {
            await safeUpdate(i, {
              components: [createLoadingContainer("### 🔄 Refreshing...")],
              ...v2Flags,
            });

            currentRtt = Math.max(1, Date.now() - i.createdTimestamp);
            currentWs = Math.round(message.client.ws.ping);

            await msg.edit({
              components: [(await generatePingUI()).container],
              ...v2Flags,
            });
            return;
          }

          if (i.customId === "ping_details") {
            showDetails = true;
            await safeUpdate(i, {
              components: [
                createLoadingContainer("### 🧪 Collecting system metrics..."),
              ],
              ...v2Flags,
            });

            currentWs = Math.round(message.client.ws.ping);
            await msg.edit({
              components: [(await generatePingUI()).container],
              ...v2Flags,
            });
            return;
          }

          if (i.customId === "ping_hide_details") {
            showDetails = false;
            currentWs = Math.round(message.client.ws.ping);
            await safeUpdate(i, {
              components: [(await generatePingUI()).container],
              ...v2Flags,
            });
          }
        } catch (err) {
          if (err.code !== 10062) console.error("Ping Interaction Error:", err);
        }
      });
    } catch (error) {
      console.error(error);
      message.reply("> ❌ Co loi xay ra khi ping.");
    }
  },
};

function createLoadingContainer(text) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );
}

async function collectSystemDetails(client) {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const procMem = process.memoryUsage();

  const [cpuStats, gpuText] = await Promise.all([
    sampleCpuAndProcessUsage(350),
    getGpuUsageText(),
  ]);

  return {
    shardLabel: getShardLabel(client),
    uptime: formatUptime(process.uptime()),
    ramHost: `${toGb(usedMem)}/${toGb(totalMem)} GB (${toPercent(usedMem, totalMem)}%)`,
    ramProcess: `${toMb(procMem.rss)} MB RSS | Heap ${toMb(procMem.heapUsed)}/${toMb(procMem.heapTotal)} MB`,
    cpuHost: `${cpuStats.systemPercent.toFixed(1)}% | ${cpuStats.cpuModel} (${cpuStats.logicalCores} threads)`,
    cpuProcess: `${cpuStats.processPercent.toFixed(1)}% of 1 core`,
    gpu: gpuText,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    hostname: os.hostname(),
  };
}

function getShardLabel(client) {
  const localGuilds = client.guilds?.cache?.size ?? 0;
  if (!client.shard) {
    return `Standalone | Local guilds ${localGuilds}`;
  }

  const shardId =
    Array.isArray(client.shard.ids) && client.shard.ids.length > 0
      ? client.shard.ids[0]
      : 0;
  const totalShards = client.shard.count || 1;

  return `#${shardId}/${totalShards - 1} | Total ${totalShards} | Local guilds ${localGuilds}`;
}

async function sampleCpuAndProcessUsage(sampleMs = 350) {
  const startCpus = os.cpus();
  const startProc = process.cpuUsage();
  const startHr = process.hrtime.bigint();

  await delay(sampleMs);

  const endCpus = os.cpus();
  const procDiff = process.cpuUsage(startProc);
  const endHr = process.hrtime.bigint();

  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < startCpus.length; i += 1) {
    const startTimes = startCpus[i].times;
    const endTimes = endCpus[i]?.times || startTimes;

    const coreIdle = endTimes.idle - startTimes.idle;
    const coreTotal =
      endTimes.user -
      startTimes.user +
      (endTimes.nice - startTimes.nice) +
      (endTimes.sys - startTimes.sys) +
      (endTimes.irq - startTimes.irq) +
      coreIdle;

    idleDiff += coreIdle;
    totalDiff += coreTotal;
  }

  const systemPercent =
    totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
  const elapsedMicros = Number(endHr - startHr) / 1000;
  const procMicros = procDiff.user + procDiff.system;
  const processPercent =
    elapsedMicros > 0 ? (procMicros / elapsedMicros) * 100 : 0;
  const logicalCores = startCpus.length || 1;
  const cpuModel = formatCpuModel(startCpus[0]?.model);

  return {
    systemPercent: clamp(systemPercent, 0, 100),
    processPercent: clamp(processPercent, 0, 100),
    logicalCores,
    cpuModel,
  };
}

async function getGpuUsageText() {
  const nvidiaText = await getNvidiaGpuUsageText();
  if (nvidiaText) return nvidiaText;

  if (process.platform === "win32") {
    const windowsText = await getWindowsGpuUsageText();
    if (windowsText) return windowsText;
  }

  return "N/A";
}

async function getNvidiaGpuUsageText() {
  try {
    const { stdout } = await execFileAsync(
      "nvidia-smi",
      [
        "--query-gpu=name,utilization.gpu,memory.used,memory.total",
        "--format=csv,noheader,nounits",
      ],
      { timeout: 1500, windowsHide: true },
    );

    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return null;

    const gpus = lines
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim());
        if (parts.length < 2) return null;

        const usage = Number(parts[1]);
        const memoryUsed = Number(parts[2]);
        const memoryTotal = Number(parts[3]);

        return {
          name: parts[0],
          usage: Number.isFinite(usage) ? usage : null,
          memoryUsed: Number.isFinite(memoryUsed) ? memoryUsed : null,
          memoryTotal: Number.isFinite(memoryTotal) ? memoryTotal : null,
        };
      })
      .filter(Boolean);

    if (!gpus.length) return null;

    if (gpus.length === 1) {
      const gpu = gpus[0];
      const usageText = Number.isFinite(gpu.usage)
        ? `${clamp(gpu.usage, 0, 100).toFixed(1)}%`
        : "N/A";
      let text = `${usageText} (${gpu.name})`;

      if (
        Number.isFinite(gpu.memoryUsed) &&
        Number.isFinite(gpu.memoryTotal) &&
        gpu.memoryTotal > 0
      ) {
        text += ` | VRAM ${Math.round(gpu.memoryUsed)}/${Math.round(gpu.memoryTotal)} MB`;
      }

      return text;
    }

    const usageValues = gpus
      .map((gpu) => gpu.usage)
      .filter((value) => Number.isFinite(value));
    const avgUsage =
      usageValues.length > 0
        ? usageValues.reduce((sum, value) => sum + value, 0) /
          usageValues.length
        : 0;

    return `${clamp(avgUsage, 0, 100).toFixed(1)}% avg (${gpus.length} NVIDIA GPUs)`;
  } catch {
    return null;
  }
}

async function getWindowsGpuUsageText() {
  const script =
    "$samples=(Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction SilentlyContinue).CounterSamples; " +
    "if(-not $samples){''; exit 0}; " +
    "$active=$samples | Where-Object { $_.InstanceName -match 'engtype_3D|engtype_Compute' }; " +
    "if(-not $active){$active=$samples}; " +
    "$avg=($active | Measure-Object -Property CookedValue -Average).Average; " +
    "if($null -eq $avg){''} else {[Math]::Round($avg,2)}";

  try {
    const { stdout } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-Command", script],
      { timeout: 1800, windowsHide: true },
    );

    const lastLine = stdout.trim().split(/\r?\n/).pop()?.trim();
    const value = Number(lastLine);
    if (!Number.isFinite(value)) return null;

    return `${clamp(value, 0, 100).toFixed(1)}% (Windows GPU Engine)`;
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return `${d}d ${h}h ${m}m ${s}s`.replace(/^0d /, "").replace(/^0h /, "");
}

function formatCpuModel(model) {
  const normalized = (model || "Unknown CPU").replace(/\s+/g, " ").trim();
  return normalized.length > 56 ? `${normalized.slice(0, 53)}...` : normalized;
}

function toGb(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

function toMb(bytes) {
  return (bytes / 1024 / 1024).toFixed(0);
}

function toPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
