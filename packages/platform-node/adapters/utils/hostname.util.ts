/**
 * Host name of a `Host` (or `X-Forwarded-Host`) header value, without the
 * port. An IPv6 literal keeps its brackets ("[::1]:3000" gives "[::1]").
 */
export function getHostname(host: string | undefined): string | undefined {
  if (!host) {
    return undefined;
  }
  // IPv6 literal, e.g. "[::1]:3000"
  const offset = host.charCodeAt(0) === 91 /* [ */ ? host.indexOf(']') + 1 : 0;
  const index = host.indexOf(':', offset);
  return index === -1 ? host : host.slice(0, index);
}
