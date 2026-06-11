import { NextResponse } from "next/server";
import { runCronJob } from "@/crons/runner";
import { getCronJob, listCronJobs } from "@/crons/registry";
import { getEnv } from "@/lib/config/env";
import { unauthorized } from "@/lib/http/errors";
import { handleRouteError, jsonSuccess } from "@/lib/http/response";
import type { NextRequest } from "next/server";

function verifyCronSecret(request: NextRequest): void {
  const env = getEnv();
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!token || token !== env.CRON_SECRET) {
    throw unauthorized("CRON_SECRET inválido");
  }
}

/** Vercel Cron invoca GET com Authorization: Bearer CRON_SECRET */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobName: string }> },
) {
  try {
    const { jobName } = await context.params;
    const auth = request.headers.get("authorization");

    if (auth?.startsWith("Bearer ")) {
      verifyCronSecret(request);
      const result = await runCronJob(jobName);
      return NextResponse.json({ success: true, data: result });
    }

    const job = getCronJob(jobName);
    if (job) {
      return jsonSuccess({
        name: job.name,
        description: job.description,
        schedule: job.schedule,
      });
    }

    return jsonSuccess({ jobs: listCronJobs() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobName: string }> },
) {
  try {
    verifyCronSecret(request);
    const { jobName } = await context.params;
    const result = await runCronJob(jobName);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
