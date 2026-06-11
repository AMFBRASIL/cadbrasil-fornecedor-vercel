/** URL base da API (backend Next.js). */
export function getApiBaseUrl(): string {
  const fromVite = import.meta.env.VITE_API_URL as string | undefined;
  if (fromVite) return fromVite.replace(/\/$/, "");

  // SSR na Vercel: variável disponível em process.env no build/runtime
  if (typeof process !== "undefined" && process.env.VITE_API_URL) {
    return process.env.VITE_API_URL.replace(/\/$/, "");
  }

  // Dev local: proxy Vite encaminha /api → localhost:3001
  return "";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** URL absoluta para assets servidos pelo backend (/uploads, etc.) */
export function assetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}
