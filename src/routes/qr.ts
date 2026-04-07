import { Hono } from "hono";
import type { Env } from "../types";

const PRODUCT = "qr";

const qr = new Hono<{ Bindings: Env }>();

// GET /api/qr/generate?data=https://example.com&size=200&format=svg
// Proxies to qrserver.com — free, no key, proven QR generation
qr.get("/generate", async (c) => {
  const data = c.req.query("data");
  if (!data) return c.json({ error: "Missing 'data' query param (the content to encode)" }, 400);
  if (data.length > 2048) return c.json({ error: "Data too long (maximum 2048 characters)" }, 400);

  const size = Math.min(Math.max(parseInt(c.req.query("size") ?? "200"), 50), 1000);
  const format = (c.req.query("format") ?? "svg").toLowerCase();
  const errorLevel = (c.req.query("error") ?? "M").toUpperCase();

  if (!["svg", "png", "json"].includes(format)) {
    return c.json({ error: "Invalid 'format'. Use: svg, png, or json" }, 400);
  }

  const fetchFormat = format === "json" ? "svg" : format;
  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&format=${fetchFormat}&ecc=${errorLevel}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return c.json({ error: "QR generation failed" }, 502);

    if (format === "json") {
      const svg = await res.text();
      const base64 = btoa(svg);
      return c.json({
        product: PRODUCT,
        data: {
          content: data,
          format: "svg",
          size,
          base64,
          data_url: `data:image/svg+xml;base64,${base64}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": format === "svg" ? "image/svg+xml" : "image/png",
        "Cache-Control": "public, max-age=86400",
        "X-Product": PRODUCT,
      },
    });
  } catch {
    return c.json({ error: "QR service unavailable" }, 503);
  }
});

qr.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/qr/generate?data=https://example.com",
    "/api/qr/generate?data=Hello+World&format=png&size=300",
    "/api/qr/generate?data=https://devdrops.run&format=json",
  ],
}, 400));

export default qr;
