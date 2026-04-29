/**
 * İstemci tarafında /api isteklerini her zaman geçerli köke (ör. http://192.168.x.x:3000)
 * bağlar. Bazı cihazlarda göreli URL’nin yanlış çözülmesini önler.
 */
export function clientApiUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${p}`;
}
