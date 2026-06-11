import pino, { type Logger } from "pino";
import { getEnv } from "@/lib/config/env";

let cachedLogger: Logger | null = null;

function createLogger(): Logger {
  const isProd = process.env.NODE_ENV === "production";
  return pino({
    level: isProd ? "info" : "debug",
    base: { service: "cadbrasil-backend" },
    transport: isProd
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/** Lazy init — evita validar .env durante `next build` (Collecting page data). */
function getLogger(): Logger {
  if (!cachedLogger) cachedLogger = createLogger();
  return cachedLogger;
}

export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop) {
    const instance = getLogger();
    const value = instance[prop as keyof Logger];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function createModuleLogger(module: string) {
  return logger.child({ module });
}

export function logCronStart(jobName: string) {
  logger.info({ job: jobName, tz: getEnv().TZ }, "Cron job iniciado");
}

export function logCronEnd(jobName: string, durationMs: number, ok: boolean) {
  logger.info({ job: jobName, durationMs, ok }, "Cron job finalizado");
}
