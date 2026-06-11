import { NextResponse } from "next/server";
import { requireStaffAccess } from "@/lib/auth/legacy-auth";
import { getSicafAgentModule } from "@/modules/sicaf-assistant/legacy-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AdminDashboardService = {
  getAdminDashboard: () => Promise<Record<string, unknown>>;
};

type SicafConnectionModule = {
  getDb: () => unknown;
  initDatabase: () => boolean;
};

function jsonSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? Number(value) : value)),
  ) as T;
}

export async function GET(request: Request) {
  try {
    await requireStaffAccess(request);

    const conn = await getSicafAgentModule<SicafConnectionModule>("database/connection");
    if (!conn.getDb()) conn.initDatabase();
    if (!conn.getDb()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Banco sicaf-agent não inicializado. Verifique DB_WRITE_HOST, DB_WRITE_USER e DB_WRITE_PASSWORD no projeto backend na Vercel.",
        },
        { status: 503 },
      );
    }

    const svc = await getSicafAgentModule<AdminDashboardService>("services/admin-dashboard.service");
    const result = await svc.getAdminDashboard();

    if (!result.ok) {
      return NextResponse.json(result, { status: 503 });
    }

    return NextResponse.json(jsonSafe(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar dashboard";
    const status =
      message.includes("Token") || message.includes("Sessão")
        ? 401
        : message.includes("restrito")
          ? 403
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
