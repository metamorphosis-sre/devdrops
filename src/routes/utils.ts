import { Hono } from "hono";
import type { Env } from "../types";

const PRODUCT = "utils";

const utils = new Hono<{ Bindings: Env }>();

// GET /api/utils/hash?text=hello&algorithm=sha256
utils.get("/hash", async (c) => {
  const text = c.req.query("text");
  const algorithm = (c.req.query("algorithm") ?? "sha256").toLowerCase();

  if (!text) return c.json({ error: "Missing 'text' query param" }, 400);
  if (text.length > 100000) return c.json({ error: "Text too long (max 100KB)" }, 400);

  const supported = ["sha256", "sha384", "sha512", "sha1", "md5"];
  if (!supported.includes(algorithm)) {
    return c.json({ error: `Unsupported algorithm. Use: ${supported.join(", ")}` }, 400);
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // MD5 not natively supported in SubtleCrypto — use sha256 instead and note it
    const algo = algorithm === "md5" ? "SHA-1" : algorithm.toUpperCase().replace("SHA", "SHA-");
    const hashBuffer = await crypto.subtle.digest(algo === "SHA-1" && algorithm === "md5" ? "SHA-1" : algo, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const base64 = btoa(String.fromCharCode(...hashArray));

    return c.json({
      product: PRODUCT,
      data: {
        input: text.length > 100 ? text.slice(0, 100) + "..." : text,
        algorithm: algorithm === "md5" ? "sha1" : algorithm,
        hex,
        base64,
        length_bytes: hashArray.length,
        note: algorithm === "md5" ? "MD5 is not available in Workers crypto — SHA-1 returned instead" : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return c.json({ error: "Hash computation failed" }, 500);
  }
});

// GET /api/utils/iban?number=GB29NWBK60161331926819
utils.get("/iban", (c) => {
  const number = (c.req.query("number") ?? "").replace(/\s+/g, "").toUpperCase();
  if (!number) return c.json({ error: "Missing 'number' query param" }, 400);
  if (number.length > 34) return c.json({ error: "IBAN too long (max 34 characters)" }, 400);

  const countryCode = number.slice(0, 2);
  const checkDigits = number.slice(2, 4);
  const bban = number.slice(4);

  const IBAN_LENGTHS: Record<string, number> = {
    AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BE: 16, BA: 20, BR: 29, BG: 22,
    CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28, EE: 20, FI: 18, FR: 27,
    GE: 22, DE: 22, GI: 23, GR: 27, GT: 28, HU: 28, IS: 26, IE: 22, IL: 23,
    IT: 27, JO: 30, KZ: 20, KW: 30, LV: 21, LB: 28, LI: 21, LT: 20, LU: 20,
    MK: 19, MT: 31, MR: 27, MU: 30, MD: 24, MC: 27, ME: 22, NL: 18, NO: 15,
    PK: 24, PS: 29, PL: 28, PT: 25, QA: 29, RO: 24, SM: 27, SA: 24, RS: 22,
    SK: 24, SI: 19, ES: 24, SE: 24, CH: 21, TN: 24, TR: 26, AE: 23, GB: 22,
    VG: 24, XK: 20,
  };

  const COUNTRY_NAMES: Record<string, string> = {
    GB: "United Kingdom", DE: "Germany", FR: "France", NL: "Netherlands", BE: "Belgium",
    ES: "Spain", IT: "Italy", PT: "Portugal", CH: "Switzerland", AT: "Austria",
    SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", IE: "Ireland",
    PL: "Poland", CZ: "Czech Republic", SK: "Slovakia", HU: "Hungary", RO: "Romania",
  };

  const expectedLength = IBAN_LENGTHS[countryCode];
  const valid_format = /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(number);

  let mod97Valid = false;
  if (valid_format && number.length >= 5) {
    const rearranged = bban + countryCode + checkDigits;
    const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
    let remainder = 0;
    for (const ch of digits) {
      remainder = (remainder * 10 + parseInt(ch)) % 97;
    }
    mod97Valid = remainder === 97;
  }

  const length_valid = expectedLength ? number.length === expectedLength : null;

  return c.json({
    product: PRODUCT,
    data: {
      iban: number,
      country_code: countryCode,
      country: COUNTRY_NAMES[countryCode] ?? null,
      check_digits: checkDigits,
      bban,
      valid: valid_format && mod97Valid && (length_valid !== false),
      checks: {
        format: valid_format,
        length: length_valid,
        mod97: mod97Valid,
        expected_length: expectedLength ?? null,
        actual_length: number.length,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// GET /api/utils/encode?text=hello&method=base64
utils.get("/encode", async (c) => {
  const text = c.req.query("text");
  const method = (c.req.query("method") ?? "base64").toLowerCase();

  if (!text) return c.json({ error: "Missing 'text' query param" }, 400);
  if (text.length > 50000) return c.json({ error: "Text too long (max 50KB)" }, 400);

  const results: Record<string, string | null> = {};

  if (method === "all" || method === "base64") {
    results.base64 = btoa(unescape(encodeURIComponent(text)));
  }
  if (method === "all" || method === "base64url") {
    results.base64url = btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  if (method === "all" || method === "url") {
    results.url_encoded = encodeURIComponent(text);
  }
  if (method === "all" || method === "hex") {
    results.hex = Array.from(new TextEncoder().encode(text)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  if (method === "all" || method === "html") {
    results.html_entities = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  if (Object.keys(results).length === 0) {
    return c.json({ error: `Unknown method '${method}'. Use: base64, base64url, url, hex, html, all` }, 400);
  }

  return c.json({
    product: PRODUCT,
    data: { input: text, method, ...results },
    timestamp: new Date().toISOString(),
  });
});

// GET /api/utils/decode?text=aGVsbG8=&method=base64
utils.get("/decode", (c) => {
  const text = c.req.query("text");
  const method = (c.req.query("method") ?? "base64").toLowerCase();

  if (!text) return c.json({ error: "Missing 'text' query param" }, 400);

  try {
    let decoded: string;
    if (method === "base64" || method === "base64url") {
      const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
      decoded = decodeURIComponent(escape(atob(padded)));
    } else if (method === "url") {
      decoded = decodeURIComponent(text);
    } else if (method === "hex") {
      decoded = new TextDecoder().decode(new Uint8Array(text.match(/.{2}/g)?.map((b) => parseInt(b, 16)) ?? []));
    } else {
      return c.json({ error: `Unknown method '${method}'. Use: base64, base64url, url, hex` }, 400);
    }

    return c.json({ product: PRODUCT, data: { input: text, method, decoded }, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Decoding failed — check input is valid for the chosen method" }, 400);
  }
});

// GET /api/utils/uuid — generate UUIDs
utils.get("/uuid", (c) => {
  const count = Math.min(parseInt(c.req.query("count") ?? "1"), 100);
  const version = c.req.query("version") ?? "v4";

  if (version !== "v4") return c.json({ error: "Only UUID v4 is supported" }, 400);

  const uuids = Array.from({ length: count }, () => crypto.randomUUID());

  return c.json({
    product: PRODUCT,
    data: { version, count, uuids: count === 1 ? uuids[0] : uuids },
    timestamp: new Date().toISOString(),
  });
});

utils.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/utils/hash?text=hello+world&algorithm=sha256",
    "/api/utils/iban?number=GB29NWBK60161331926819",
    "/api/utils/encode?text=hello+world&method=all",
    "/api/utils/decode?text=aGVsbG8gd29ybGQ=&method=base64",
    "/api/utils/uuid",
    "/api/utils/uuid?count=5",
  ],
}, 400));

export default utils;
