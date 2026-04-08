import { Hono } from "hono";
import Stripe from "stripe";
import type { Env } from "../types";
import { BUNDLES, type BundleName, addCredits } from "../lib/credits";

const checkout = new Hono<{ Bindings: Env }>();

function getStripe(env: Env) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
}

// POST /checkout/session — create Stripe Checkout session for a credit bundle
checkout.post("/session", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be JSON" }, 400);
  }

  const { bundle, email } = body ?? {};
  if (!bundle || !BUNDLES[bundle as BundleName]) {
    return c.json({ error: "Invalid bundle", valid: Object.keys(BUNDLES) }, 400);
  }

  const b = BUNDLES[bundle as BundleName];
  const stripe = getStripe(c.env);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      metadata: { bundle, credits: String(b.credits) },
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: b.price * 100, // cents
            product_data: {
              name: `DevDrops ${b.label} Bundle`,
              description: `${b.queries.toLocaleString()} API queries ($${b.credits.toFixed(2)} credit)${b.bonus !== "0%" ? ` — ${b.bonus} bonus` : ""}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: "https://devdrops.run/buy?success=true&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://devdrops.run/buy?canceled=true",
    });

    return c.json({ url: session.url, session_id: session.id });
  } catch (e: any) {
    return c.json({ error: "Stripe error", detail: e?.message || String(e) }, 500);
  }
});

// POST /checkout/webhook — Stripe webhook handler
checkout.post("/webhook", async (c) => {
  const stripe = getStripe(c.env);
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");

  if (!sig) return c.json({ error: "Missing stripe-signature header" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return c.json({ error: "Webhook signature verification failed" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return c.json({ received: true });

    const bundle = session.metadata?.bundle as BundleName;
    if (!bundle || !BUNDLES[bundle]) return c.json({ error: "Unknown bundle in metadata" }, 400);

    // Use session ID as the wallet identifier for Stripe purchases
    // Customers can later link this to a real wallet if they want
    const walletId = `stripe:${session.customer_email || session.id}`;

    // Idempotency: check if we already processed this session
    const existing = await c.env.DB.prepare(
      "SELECT id FROM credit_transactions WHERE bundle = ? AND wallet = ? AND amount = ? AND created_at > datetime('now', '-1 hour')"
    ).bind(bundle, walletId.toLowerCase(), BUNDLES[bundle].credits).first();

    if (!existing) {
      await addCredits(c.env.DB, walletId, bundle);
    }
  }

  return c.json({ received: true });
});

// GET /checkout/status/:session_id — check session status
checkout.get("/status/:session_id", async (c) => {
  const sessionId = c.req.param("session_id");
  const stripe = getStripe(c.env);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const bundle = session.metadata?.bundle as BundleName;
    const walletId = `stripe:${session.customer_email || session.id}`;

    return c.json({
      status: session.payment_status,
      bundle: bundle,
      email: session.customer_email,
      wallet_id: walletId,
      amount: session.amount_total ? session.amount_total / 100 : null,
    });
  } catch {
    return c.json({ error: "Session not found" }, 404);
  }
});

export default checkout;
