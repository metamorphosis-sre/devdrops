import { SignJWT, importJWK } from "jose";

// Coinbase CDP JWT auth for x402 facilitator (EdDSA / Ed25519).
// CDP API keys from portal.cdp.coinbase.com are 64 raw bytes:
//   [0..31] = Ed25519 seed (private), [32..63] = public key
// Docs: https://docs.cdp.coinbase.com/get-started/authentication/jwt-authentication

const CDP_HOST = "api.cdp.coinbase.com";

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Cache the imported key within a Worker instance
let _cachedKey: CryptoKey | null = null;
let _cachedSecret: string | null = null;

async function getKey(rawBase64: string): Promise<CryptoKey> {
  if (_cachedKey && _cachedSecret === rawBase64) return _cachedKey;

  const raw = Uint8Array.from(
    atob(rawBase64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  // 64-byte CDP key: [0..31] = Ed25519 seed, [32..63] = public key
  const d = raw.slice(0, 32);
  const x = raw.slice(32, 64);

  _cachedKey = await importJWK(
    { kty: "OKP", crv: "Ed25519", d: toBase64Url(d), x: toBase64Url(x) },
    "EdDSA"
  ) as CryptoKey;
  _cachedSecret = rawBase64;
  return _cachedKey;
}

async function makeJwt(keyId: string, rawBase64: string, method: string, path: string): Promise<string> {
  const key = await getKey(rawBase64);
  const now = Math.floor(Date.now() / 1000);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return new SignJWT({
    sub: keyId,
    iss: "cdp",
    aud: ["cdp_service"],
    nbf: now,
    uri: `${method.toUpperCase()} ${CDP_HOST}${path}`,
  })
    .setProtectedHeader({ alg: "EdDSA", kid: keyId, nonce })
    .setExpirationTime("2m")
    .sign(key);
}

// Returns a createAuthHeaders callback compatible with HTTPFacilitatorClient
export function cdpAuthHeaders(keyId: string, rawBase64: string) {
  return async () => ({
    verify:    { Authorization: `Bearer ${await makeJwt(keyId, rawBase64, "POST", "/platform/v2/x402/verify")}` },
    settle:    { Authorization: `Bearer ${await makeJwt(keyId, rawBase64, "POST", "/platform/v2/x402/settle")}` },
    supported: { Authorization: `Bearer ${await makeJwt(keyId, rawBase64, "GET",  "/platform/v2/x402/supported")}` },
  });
}
