// SSRF protection — block fetches to private/internal IP ranges

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "[::1]",
  "[::0]",
  "[0:0:0:0:0:0:0:0]",
  "[0:0:0:0:0:0:0:1]",
  "metadata.google.internal",
  "instance-data",
]);

// Check if an IPv4 address is in a private/reserved range
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true; // malformed = block

  const [a, b] = parts;
  return (
    a === 0 ||            // 0.0.0.0/8 — current network
    a === 10 ||           // 10.0.0.0/8 — private
    a === 127 ||          // 127.0.0.0/8 — loopback
    (a === 169 && b === 254) || // 169.254.0.0/16 — link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 — private
    (a === 192 && b === 168) || // 192.168.0.0/16 — private
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 — CGNAT
    a >= 224            // 224+ — multicast and reserved
  );
}

// Check if an IPv6 address is loopback, link-local, or private
function isPrivateIPv6(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, "").toLowerCase();
  if (clean === "::1" || clean === "::") return true;
  if (clean.startsWith("fe80:")) return true;  // link-local
  if (clean.startsWith("fc") || clean.startsWith("fd")) return true; // unique local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const v4mapped = clean.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return isPrivateIPv4(v4mapped[1]);
  return false;
}

/**
 * Validate a user-supplied URL is safe to fetch server-side.
 * Returns null if safe, or an error message if blocked.
 */
export function validateFetchUrl(urlString: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return "Invalid URL";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "Only http and https URLs are supported";
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known dangerous hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return "URL points to a blocked host";
  }

  // Block bare IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && isPrivateIPv4(hostname)) {
    return "URL points to a private IP address";
  }

  // Block bare IPv6
  if (hostname.startsWith("[") || /^[0-9a-f:]+$/i.test(hostname)) {
    if (isPrivateIPv6(hostname)) {
      return "URL points to a private IP address";
    }
  }

  // Block common cloud metadata patterns
  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    return "URL points to an internal host";
  }

  return null; // safe
}
