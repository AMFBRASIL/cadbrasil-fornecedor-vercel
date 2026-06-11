import { getEnv } from "@/lib/config/env";

export const CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
export const CORS_HEADERS = "Content-Type, Authorization, X-Request-Id, X-Api-Key";

/** Origens permitidas: FRONTEND_URL + ALLOWED_ORIGINS + previews *.vercel.app */
export function getAllowedOrigins(): string[] {
  const env = getEnv();
  const origins = new Set<string>([env.FRONTEND_URL]);

  for (const raw of env.ALLOWED_ORIGINS.split(",")) {
    const trimmed = raw.trim();
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const env = getEnv();
  if (env.NODE_ENV === "development") return true;

  if (getAllowedOrigins().includes(origin)) return true;

  // Previews do Vercel (frontend e backend)
  if (/^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

export function applyCorsHeaders(
  headers: Headers,
  origin: string | null,
  options: { credentials?: boolean } = {},
): void {
  if (!isAllowedOrigin(origin)) return;

  headers.set("Access-Control-Allow-Origin", origin ?? getEnv().FRONTEND_URL);
  headers.set("Access-Control-Allow-Methods", CORS_METHODS);
  headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
  if (options.credentials !== false) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
}
