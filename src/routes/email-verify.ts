import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "email-verify";
const CACHE_TTL = 3600;

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "10minutemail.com", "trashmail.com", "yopmail.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "dispostable.com", "mailnesia.com",
  "maildrop.cc", "discard.email", "temp-mail.org", "fakeinbox.com",
  "mailcatch.com", "tempr.email", "tempail.com", "mohmal.com",
  "burner.kiwi", "getnada.com", "emailondeck.com", "mintemail.com",
]);

const emailVerify = new Hono<{ Bindings: Env }>();

// GET /api/email-verify/check/:email
emailVerify.get("/check/:email", async (c) => {
  const email = c.req.param("email").toLowerCase();
  const cacheKey = `check:${email}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  // 1. Syntax validation
  const syntaxValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!syntaxValid) {
    return c.json({
      product: PRODUCT,
      data: { email, valid: false, reason: "Invalid syntax", checks: { syntax: false } },
    });
  }

  const [, domainPart] = email.split("@");

  // 2. Disposable email check
  const isDisposable = DISPOSABLE_DOMAINS.has(domainPart);

  // 3. MX record check via DNS-over-HTTPS
  let hasMx = false;
  let mxRecords: string[] = [];
  try {
    const res = await fetchUpstream(
      `https://dns.google/resolve?name=${domainPart}&type=MX`,
      { headers: { Accept: "application/dns-json" } }
    );
    const dns: any = await res.json();
    if (dns.Answer && dns.Answer.length > 0) {
      hasMx = true;
      mxRecords = dns.Answer.map((r: any) => r.data).slice(0, 5);
    }
  } catch {
    // DNS lookup failed — treat as unknown
  }

  // 4. Domain has A record (fallback if no MX)
  let hasA = false;
  if (!hasMx) {
    try {
      const res = await fetchUpstream(
        `https://dns.google/resolve?name=${domainPart}&type=A`,
        { headers: { Accept: "application/dns-json" } }
      );
      const dns: any = await res.json();
      hasA = dns.Answer && dns.Answer.length > 0;
    } catch {}
  }

  const deliverable = hasMx || hasA;

  const data = {
    email,
    valid: syntaxValid && deliverable && !isDisposable,
    deliverable,
    disposable: isDisposable,
    checks: {
      syntax: syntaxValid,
      mx_records: hasMx,
      has_a_record: hasA,
      disposable: isDisposable,
    },
    mx_records: mxRecords,
    domain: domainPart,
  };

  await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
  return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
});

export default emailVerify;
