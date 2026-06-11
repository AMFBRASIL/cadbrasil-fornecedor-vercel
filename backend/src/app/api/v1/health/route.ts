import { createApiHandler } from "@/lib/http/api-handler";
import { pingPool, getLegacyPool, getWritePool } from "@/lib/db/mysql";
import { getEnv } from "@/lib/config/env";
import { getSicafAgentModule } from "@/modules/sicaf-assistant/legacy-bridge";

type SicafConnectionModule = {
  getDb: () => unknown;
  initDatabase: () => boolean;
};

export const GET = createApiHandler(async () => {
  const env = getEnv();
  const [legacyOk, writeOk, sicafOk] = await Promise.all([
    pingPool(getLegacyPool()).catch(() => false),
    pingPool(getWritePool()).catch(() => false),
    (async () => {
      try {
        const conn = await getSicafAgentModule<SicafConnectionModule>("database/connection");
        if (!conn.getDb()) conn.initDatabase();
        const knexDb = conn.getDb() as { raw?: (sql: string) => Promise<unknown> } | null;
        if (!knexDb?.raw) return false;
        await knexDb.raw("SELECT 1");
        return true;
      } catch {
        return false;
      }
    })(),
  ]);

  const allOk = legacyOk && writeOk && sicafOk;

  return {
    status: allOk ? "ok" : "degraded",
    version: "2.0.0",
    environment: env.NODE_ENV,
    databases: {
      legacy: { name: env.DB_LEGACY_NAME, connected: legacyOk },
      write: { name: env.DB_WRITE_NAME, connected: writeOk },
      sicafAgent: { name: env.DB_WRITE_NAME, connected: sicafOk },
    },
    timestamp: new Date().toISOString(),
  };
});
