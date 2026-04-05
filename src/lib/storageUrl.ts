/**
 * URL base do bucket público `box` no Supabase.
 * Caminhos no banco: `${folder}/${id}.webp` (ex: users/abc.webp).
 * Sobrescreva com VITE_SUPABASE_PUBLIC_BOX_URL no .env se necessário.
 */
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_PUBLIC_BOX_URL as string | undefined)?.replace(/\/?$/, "/") ||
  "https://zhxxmupazsevhueovuzi.supabase.co/storage/v1/object/public/box/";

function appendCacheBuster(url: string, cacheKey?: string | number): string {
  const version = cacheKey === undefined || cacheKey === null ? Math.floor(Date.now() / 60000) : cacheKey;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(String(version))}`;
}

/**
 * Monta a URL pública completa. Se já for http(s), retorna sem alterar.
 */
export function resolveBoxPublicUrl(relativePath: string | null | undefined, cacheKey?: string | number): string | undefined {
  if (relativePath == null) return undefined;
  const p = String(relativePath).trim();
  if (!p) return undefined;
  if (/^(https?:\/\/|blob:|data:)/i.test(p)) {
    return appendCacheBuster(p, cacheKey);
  }
  const base = SUPABASE_URL.endsWith("/") ? SUPABASE_URL : `${SUPABASE_URL}/`;
  return appendCacheBuster(`${base}${p.replace(/^\//, "")}`, cacheKey);
}

/**
 * Caminho relativo no bucket (ex: `users/abc.webp`) a partir da URL pública ou do valor já relativo.
 * Útil para o backend remover o objeto no Storage ao excluir a conta.
 */
export function getBoxRelativePath(absoluteOrRelative: string | null | undefined): string | undefined {
  if (absoluteOrRelative == null) return undefined;
  const p = String(absoluteOrRelative).trim();
  if (!p || p.startsWith("blob:") || p.startsWith("data:")) return undefined;
  const stripped = p.split(/[?#]/, 1)[0];
  if (/^https?:\/\//i.test(stripped)) {
    const base = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
    if (stripped.startsWith(base)) {
      return stripped.slice(base.length).replace(/^\//, "");
    }
    return undefined;
  }
  return stripped.replace(/^\//, "");
}
