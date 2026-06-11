import { execSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function isServerlessEnvironment(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function isAssistantAvailableOnPlatform(): boolean {
  return !isServerlessEnvironment();
}

let assistantProcess: ChildProcess | null = null;
let assistantRunning = false;
let assistantPid: number | null = null;
const assistantLogs: string[] = [];
const MAX_LOGS = 100;

const PID_FILE = path.join(process.cwd(), "data", ".assistant-pid");

function addLog(msg: string): void {
  const entry = `[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`;
  assistantLogs.push(entry);
  if (assistantLogs.length > MAX_LOGS) assistantLogs.shift();
  console.log(entry);
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function checkExistingAssistant(): boolean {
  try {
    if (fs.existsSync(PID_FILE)) {
      const savedPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
      if (savedPid && isProcessAlive(savedPid)) {
        assistantPid = savedPid;
        assistantRunning = true;
        addLog(`Assistente SICAF já rodando (PID: ${savedPid}) — reconectando`);
        return true;
      }
      fs.unlinkSync(PID_FILE);
    }
  } catch {
    /* ignore */
  }
  return false;
}

checkExistingAssistant();

export function launchAssistant(): {
  ok: boolean;
  message: string;
  pid?: number;
  serverless?: boolean;
} {
  if (isServerlessEnvironment()) {
    return {
      ok: false,
      serverless: true,
      message:
        "Assistente local (Puppeteer) indisponível na Vercel. Use a extensão Chrome com o chat IA em /sicaf-assistant-chat.",
    };
  }

  if (assistantRunning && assistantPid && isProcessAlive(assistantPid)) {
    return {
      ok: false,
      message: "Assistente SICAF já está rodando",
      pid: assistantPid,
    };
  }

  const scriptPath = path.join(
    process.cwd(),
    "sicaf-agent",
    "modules",
    "sicaf-assistant",
    "index.js",
  );
  addLog("Iniciando Assistente SICAF...");
  assistantRunning = true;

  assistantProcess = spawn("node", [scriptPath], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    detached: true,
  });

  assistantPid = assistantProcess.pid ?? null;

  try {
    const pidDir = path.dirname(PID_FILE);
    if (!fs.existsSync(pidDir)) fs.mkdirSync(pidDir, { recursive: true });
    if (assistantPid) fs.writeFileSync(PID_FILE, String(assistantPid), "utf8");
  } catch {
    /* ignore */
  }

  assistantProcess.stdout?.on("data", (data: Buffer) => {
    data
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((line) => addLog(line.trim()));
  });

  assistantProcess.stderr?.on("data", (data: Buffer) => {
    data
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((line) => addLog(`[ERR] ${line.trim()}`));
  });

  assistantProcess.on("exit", (code) => {
    addLog(`Assistente encerrado (código: ${code})`);
    assistantRunning = false;
    assistantProcess = null;
    assistantPid = null;
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
  });

  assistantProcess.on("error", (err) => {
    addLog(`Erro ao iniciar: ${err.message}`);
    assistantRunning = false;
    assistantProcess = null;
    assistantPid = null;
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
  });

  assistantProcess.unref();

  return {
    ok: true,
    message: "Assistente SICAF iniciado",
    pid: assistantPid ?? undefined,
  };
}

export function stopAssistant(): { ok: boolean; message: string; serverless?: boolean } {
  if (isServerlessEnvironment()) {
    return {
      ok: false,
      serverless: true,
      message: "Assistente local não roda em ambiente serverless.",
    };
  }

  const pid = assistantPid ?? assistantProcess?.pid ?? null;
  if (!pid) {
    return { ok: false, message: "Assistente não está rodando" };
  }

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
    addLog("Assistente parado pelo usuário");
  } catch (e) {
    addLog(`Aviso ao parar: ${e instanceof Error ? e.message : String(e)}`);
  }

  assistantRunning = false;
  assistantProcess = null;
  assistantPid = null;
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    /* ignore */
  }

  return { ok: true, message: "Assistente parado" };
}

export function getAssistantStatus(): {
  running: boolean;
  pid: number | null;
  logs: string[];
  serverless: boolean;
  available: boolean;
} {
  if (isServerlessEnvironment()) {
    return {
      running: false,
      pid: null,
      logs: [
        "Ambiente serverless (Vercel): assistente Puppeteer desativado.",
        "Chat IA via extensão Chrome continua disponível.",
      ],
      serverless: true,
      available: false,
    };
  }

  if (assistantRunning && assistantPid && !isProcessAlive(assistantPid)) {
    assistantRunning = false;
    assistantPid = null;
    assistantProcess = null;
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
  }

  return {
    running: assistantRunning,
    pid: assistantPid,
    logs: assistantLogs.slice(-20),
    serverless: false,
    available: true,
  };
}

export function getAssistantLogs(): string[] {
  return [...assistantLogs];
}
