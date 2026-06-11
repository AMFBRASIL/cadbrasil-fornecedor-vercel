function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "").replace(/^\/+/, "");
  if (!trimmed) return "";
  // Sem protocolo o browser trata como path relativo:
  // /admin/ + cadbrasil-back.vercel.app/api → front.../admin/cadbrasil-back.../api (404)
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** URL base da API (backend Next.js). */
export function getApiBaseUrl(): string {
  const fromVite = import.meta.env.VITE_API_URL as string | undefined;
  if (fromVite?.trim()) return normalizeApiBaseUrl(fromVite);

  // SSR na Vercel: variável disponível em process.env no build/runtime
  if (typeof process !== "undefined" && process.env.VITE_API_URL?.trim()) {
    return normalizeApiBaseUrl(process.env.VITE_API_URL);
  }

  // Dev local: proxy Vite encaminha /api → localhost:3001
  return "";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  // URL() garante endereço absoluto (nunca relativo à rota /admin/...)
  return new URL(normalized, `${base}/`).href;
}

/** Corrige URLs sem protocolo antes do fetch (defesa extra no browser). */
export function ensureAbsoluteApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const trimmed = url.replace(/^\/+/, "");
  if (/^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(:\d+)?(\/|$)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return url;
}

/** URL absoluta para assets servidos pelo backend (/uploads, etc.) */
export function assetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}
