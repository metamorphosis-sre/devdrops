import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-402-Payment"],
  exposeHeaders: ["X-Request-Id"],
  maxAge: 86400,
});
