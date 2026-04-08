import { Hono } from "hono";
import type { Env } from "../types";

const PRODUCT = "image";

const image = new Hono<{ Bindings: Env }>();

// POST /api/image/generate — text-to-image via Cloudflare Workers AI
image.post("/generate", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be JSON with a 'prompt' field" }, 400);
  }

  const prompt = String(body?.prompt ?? "").trim();
  if (!prompt) return c.json({ error: "Missing 'prompt' field" }, 400);
  if (prompt.length > 1000) return c.json({ error: "Prompt too long (max 1000 characters)" }, 400);

  // Basic safety filtering
  const blocked = ["nude", "naked", "porn", "explicit", "nsfw", "child", "minor", "underage"];
  if (blocked.some((w) => prompt.toLowerCase().includes(w))) {
    return c.json({ error: "Prompt violates content policy" }, 400);
  }

  const model = (body?.model ?? "flux") === "stable-diffusion"
    ? "@cf/stabilityai/stable-diffusion-xl-base-1.0"
    : "@cf/black-forest-labs/flux-1-schnell";

  const steps = Math.min(Math.max(parseInt(body?.steps ?? "4"), 1), 8);

  try {
    const result = await (c.env.AI as any).run(model, {
      prompt,
      num_steps: steps,
    });

    // Workers AI returns a ReadableStream or Uint8Array for image models
    if (result instanceof ReadableStream) {
      const reader = result.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const buffer = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset = 0;
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }

      const format = body?.format ?? "png";
      if (format === "base64") {
        const base64 = btoa(String.fromCharCode(...buffer));
        return c.json({
          product: PRODUCT,
          data: {
            format: "base64",
            mime_type: "image/png",
            model: model.split("/").pop(),
            prompt,
            image: base64,
            data_url: `data:image/png;base64,${base64}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return new Response(buffer, {
        headers: {
          "Content-Type": "image/png",
          "X-Product": PRODUCT,
          "X-Model": model.split("/").pop() ?? model,
        },
      });
    }

    // If it returned an object with image
    if (result?.image) {
      const format = body?.format ?? "base64";
      if (format === "png") {
        const binary = atob(result.image);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
        return new Response(buffer, { headers: { "Content-Type": "image/png", "X-Product": PRODUCT } });
      }
      return c.json({
        product: PRODUCT,
        data: {
          format: "base64",
          mime_type: "image/png",
          model: model.split("/").pop(),
          prompt,
          image: result.image,
          data_url: `data:image/png;base64,${result.image}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({ error: "Image generation returned unexpected format" }, 502);
  } catch (e: any) {
    return c.json({ error: "Image generation failed" }, 503);
  }
});

image.get("/models", (c) => c.json({
  product: PRODUCT,
  data: {
    models: [
      { id: "flux", full_id: "@cf/black-forest-labs/flux-1-schnell", description: "Flux 1 Schnell — fast, high quality. Default." },
      { id: "stable-diffusion", full_id: "@cf/stabilityai/stable-diffusion-xl-base-1.0", description: "Stable Diffusion XL — detailed, versatile." },
    ],
    usage: {
      method: "POST",
      body: { prompt: "string (required)", model: "flux | stable-diffusion (optional)", steps: "1-8 (optional, default 4)", format: "png | base64 (optional, default png)" },
    },
    content_policy: "No explicit, adult, or illegal content. Prompts are filtered.",
  },
  timestamp: new Date().toISOString(),
}));

image.get("/", (c) => c.json({
  error: "POST to /api/image/generate with a JSON body",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    { endpoint: "POST /api/image/generate", body: { prompt: "A futuristic city at sunset, digital art" } },
    { endpoint: "POST /api/image/generate", body: { prompt: "A logo for a tech startup", model: "stable-diffusion", format: "base64" } },
  ],
}, 400));

export default image;
