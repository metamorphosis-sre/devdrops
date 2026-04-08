// Fetch wrapper with timeout and structured error handling

export async function fetchUpstream(url: string, options?: {
  headers?: Record<string, string>;
  timeout?: number;
  method?: string;
  body?: string;
}): Promise<Response> {
  const { headers = {}, timeout = 10000, method = "GET", body } = options ?? {};

  const res = await fetch(url, {
    method,
    headers: { "User-Agent": "DevDrops/1.0 (api.devdrops.run)", ...headers },
    body,
    signal: AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    throw new UpstreamError(url, res.status, await res.text().catch(() => ""));
  }

  return res;
}

// Strip API keys from URLs before including in error messages
function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of u.searchParams.keys()) {
      if (/key|token|secret|password|auth/i.test(key)) {
        u.searchParams.set(key, "[REDACTED]");
      }
    }
    return u.toString();
  } catch {
    return url.replace(/([?&])(api[_-]?key|apiKey|token|secret|auth)=[^&]+/gi, "$1$2=[REDACTED]");
  }
}

export class UpstreamError extends Error {
  constructor(public url: string, public status: number, public body: string) {
    super(`Upstream ${sanitizeUrl(url)} returned ${status}`);
    this.name = "UpstreamError";
    this.url = sanitizeUrl(url);
  }
}

export function missingKeyResponse(keyName: string) {
  return {
    error: "Service not configured",
    message: `This product requires the ${keyName} environment variable. Contact the operator.`,
  };
}
