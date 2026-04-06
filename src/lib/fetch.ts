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

export class UpstreamError extends Error {
  constructor(public url: string, public status: number, public body: string) {
    super(`Upstream ${url} returned ${status}`);
    this.name = "UpstreamError";
  }
}

export function missingKeyResponse(keyName: string) {
  return {
    error: "Service not configured",
    message: `This product requires the ${keyName} environment variable. Contact the operator.`,
  };
}
