// SSRF protection for analyze-site.
//
// analyze-site fetches a URL supplied by an unauthenticated caller. The guard
// below refuses any URL that resolves to an internal, private, or
// cloud-metadata address, and re-validates every HTTP redirect hop so a public
// URL cannot bounce the fetch into a blocked range.

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

const BLOCKED_MESSAGE = 'Cannot audit internal/private URLs';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
]);

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa'];

/** Strip the brackets the URL parser keeps around an IPv6 literal. */
function stripBrackets(host: string): string {
  return host.replace(/^\[/, '').replace(/\]$/, '');
}

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

/** Expand an IPv6 address into its eight 16-bit groups, or null when malformed. */
function expandIpv6(address: string): number[] | null {
  let text = address;
  const v4 = text.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4 && v4.index !== undefined) {
    const octets = parseIpv4(v4[1]);
    if (!octets) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    text = text.slice(0, v4.index) + high + ':' + low;
  }
  if (text.includes(':::')) return null;
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const hasGap = halves.length === 2;
  const tail = hasGap ? (halves[1] ? halves[1].split(':') : []) : [];
  let groups: string[];
  if (hasGap) {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...Array.from({ length: fill }, () => '0'), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  const numbers: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    numbers.push(parseInt(group, 16));
  }
  return numbers;
}

function ipv4FromGroups(high: number, low: number): string {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

/** True for IPv4 addresses in a private, loopback, link-local, or reserved range. */
export function isPrivateIpv4(ip: string): boolean {
  const octets = parseIpv4(ip);
  if (!octets) return false;
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

/** True for IPv6 addresses in a loopback, unique-local, link-local, or reserved range. */
export function isPrivateIpv6(ip: string): boolean {
  const zone = ip.split('%')[0].toLowerCase();
  if (zone === '::1' || zone === '::') return true;
  const groups = expandIpv6(zone);
  if (!groups) return false;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // 2001:db8::/32 documentation
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-translated (::ffff:0:a.b.c.d)
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && (g4 === 0 || g4 === 0xffff) && g5 === 0xffff) {
    return isPrivateIpv4(ipv4FromGroups(g6, g7));
  }
  // NAT64 well-known prefix 64:ff9b::/96
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPrivateIpv4(ipv4FromGroups(g6, g7));
  }
  return false;
}

/** True for any IP literal in a blocked range. Non-IP strings return false. */
export function isPrivateIp(ip: string): boolean {
  const host = stripBrackets(ip);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isPrivateIpv4(host);
  if (host.includes(':')) return isPrivateIpv6(host);
  return false;
}

/** True when the host is an IP literal (IPv4 or IPv6). */
export function isIpLiteral(host: string): boolean {
  const value = stripBrackets(host);
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(':');
}

/** True when a hostname is a blocked literal name, an internal suffix, or a private IP. */
export function isBlockedHostname(hostname: string): boolean {
  const host = stripBrackets(hostname).replace(/\.$/, '').toLowerCase();
  if (host === '') return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host.endsWith(suffix)) return true;
  }
  if (isIpLiteral(host)) return isPrivateIp(host);
  return false;
}

/** Resolve a hostname to its address list. An empty list means "could not resolve". */
export type ResolveHost = (hostname: string) => Promise<string[]>;

/**
 * Validate that a URL targets a public http(s) address.
 *
 * Resolves a DNS name and refuses the URL when any resolved address is private
 * or reserved. IP literals are checked directly without a lookup. `base` lets a
 * redirect `Location` be resolved relative to the URL it came from.
 */
export async function assertPublicUrl(
  url: string,
  base: string | undefined,
  resolveHost: ResolveHost,
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url, base);
  } catch {
    throw new BlockedUrlError('Invalid URL. Please provide a valid http or https URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BlockedUrlError('Invalid URL. Please provide a valid http or https URL.');
  }
  if (parsed.username || parsed.password) {
    throw new BlockedUrlError(BLOCKED_MESSAGE);
  }
  const host = stripBrackets(parsed.hostname);
  if (isBlockedHostname(host)) {
    throw new BlockedUrlError(BLOCKED_MESSAGE);
  }
  if (!isIpLiteral(host)) {
    const addresses = await resolveHost(host);
    for (const address of addresses) {
      if (isPrivateIp(address)) {
        throw new BlockedUrlError(BLOCKED_MESSAGE);
      }
    }
  }
  return parsed;
}

const MAX_REDIRECTS = 5;
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

export interface SafeFetchOptions {
  resolveHost: ResolveHost;
  timeoutMs?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

/**
 * Fetch a URL, refusing internal targets.
 *
 * Redirects are followed with `redirect: 'manual'` and each hop is validated by
 * `assertPublicUrl` before it is fetched, so an internal `Location` is never
 * requested.
 */
export async function safeFetch(url: string, options: SafeFetchOptions): Promise<Response> {
  const { resolveHost, timeoutMs = 15000, maxRedirects = MAX_REDIRECTS, headers } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = await assertPublicUrl(url, undefined, resolveHost);
    for (let hop = 0; ; hop++) {
      const response = await doFetch(current.toString(), {
        headers,
        redirect: 'manual',
        signal: controller.signal,
      });
      const location = response.headers.get('location');
      if (!REDIRECT_STATUS.has(response.status) || !location) {
        return response;
      }
      if (hop >= maxRedirects) {
        throw new BlockedUrlError('Too many redirects');
      }
      current = await assertPublicUrl(location, current.toString(), resolveHost);
    }
  } finally {
    clearTimeout(timer);
  }
}
