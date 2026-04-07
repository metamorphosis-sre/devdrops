import { Hono } from "hono";
import type { Env } from "../types";
import { getCached, setCache } from "../lib/cache";
import { fetchUpstream } from "../lib/fetch";

const PRODUCT = "time";
const CACHE_TTL = 3600; // 1 hour (holiday data is stable)

const time = new Hono<{ Bindings: Env }>();

// GET /api/time/now?timezone=Europe/London — current time in a timezone
time.get("/now", async (c) => {
  const tz = c.req.query("timezone") ?? c.req.query("tz") ?? "UTC";

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "longOffset",
    });

    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

    const offsetStr = get("timeZoneName"); // e.g. "GMT+01:00"
    const offsetMinutes = parseOffset(offsetStr);

    const data = {
      timezone: tz,
      utc: now.toISOString(),
      local: `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
      date: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}:${get("second")}`,
      utc_offset: offsetStr,
      utc_offset_minutes: offsetMinutes,
      unix_timestamp: Math.floor(now.getTime() / 1000),
    };

    return c.json({ product: PRODUCT, data, timestamp: now.toISOString() });
  } catch {
    return c.json({ error: `Unknown timezone: ${tz}. Use IANA format, e.g. Europe/London` }, 400);
  }
});

// GET /api/time/holidays?country=GB&year=2026 — public holidays for a country
time.get("/holidays", async (c) => {
  const country = (c.req.query("country") ?? "GB").toUpperCase();
  const year = c.req.query("year") ?? new Date().getFullYear().toString();
  const cacheKey = `holidays:${country}:${year}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    // Nager.Date API — free, open-source, 100+ countries' public holidays
    const res = await fetchUpstream(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);

    if (!res.ok) {
      return c.json({ error: `No holiday data for country: ${country}` }, 404);
    }

    const raw: any[] = await res.json();

    const data = {
      country,
      year: parseInt(year),
      count: raw.length,
      holidays: raw.map((h) => ({
        date: h.date,
        name: h.localName,
        name_en: h.name,
        public: h.public,
        types: h.types,
        counties: h.counties,
      })),
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL * 24); // 24 hours
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Holiday service unavailable" }, 503);
  }
});

// GET /api/time/business?date=2026-04-07&country=GB — is this a business day?
time.get("/business", async (c) => {
  const dateStr = c.req.query("date") ?? new Date().toISOString().split("T")[0];
  const country = (c.req.query("country") ?? "GB").toUpperCase();
  const timezone = c.req.query("timezone") ?? "UTC";
  const cacheKey = `business:${country}:${dateStr}`;

  const cached = await getCached(c.env.DB, PRODUCT, cacheKey);
  if (cached) return c.json({ product: PRODUCT, cached: true, data: cached });

  try {
    const date = new Date(dateStr + "T12:00:00Z");
    const dayOfWeek = new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "long" }).format(date);
    const isWeekend = dayOfWeek === "Saturday" || dayOfWeek === "Sunday";

    // Check holidays
    const year = dateStr.split("-")[0];
    const holidayRes = await fetchUpstream(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
    let isHoliday = false;
    let holidayName: string | null = null;

    if (holidayRes.ok) {
      const holidays: any[] = await holidayRes.json();
      const match = holidays.find((h) => h.date === dateStr);
      if (match) {
        isHoliday = true;
        holidayName = match.name;
      }
    }

    const isBusinessDay = !isWeekend && !isHoliday;

    // Find next business day
    const nextBusiness = findNextBusinessDay(date, isBusinessDay);

    const data = {
      date: dateStr,
      country,
      day_of_week: dayOfWeek,
      is_weekend: isWeekend,
      is_holiday: isHoliday,
      holiday_name: holidayName,
      is_business_day: isBusinessDay,
      next_business_day: nextBusiness,
    };

    await setCache(c.env.DB, PRODUCT, cacheKey, data, CACHE_TTL);
    return c.json({ product: PRODUCT, cached: false, data, timestamp: new Date().toISOString() });
  } catch {
    return c.json({ error: "Could not determine business day status" }, 500);
  }
});

// GET /api/time/convert?from=America/New_York&to=Asia/Tokyo&time=2026-04-07T14:30:00
time.get("/convert", async (c) => {
  const from = c.req.query("from") ?? "UTC";
  const to = c.req.query("to");
  const timeStr = c.req.query("time") ?? new Date().toISOString();

  if (!to) return c.json({ error: "Missing 'to' timezone parameter" }, 400);

  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return c.json({ error: "Invalid 'time' parameter. Use ISO 8601 format." }, 400);

    const formatInZone = (tz: string) => {
      const f = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false, timeZoneName: "longOffset",
      });
      const parts = f.formatToParts(date);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
      return {
        datetime: `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
        timezone: tz,
        offset: get("timeZoneName"),
      };
    };

    return c.json({
      product: PRODUCT,
      data: {
        utc: date.toISOString(),
        from: formatInZone(from),
        to: formatInZone(to),
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return c.json({ error: "Invalid timezone or time format" }, 400);
  }
});

time.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/time/now?timezone=Europe/London",
    "/api/time/holidays?country=GB&year=2026",
    "/api/time/business?date=2026-04-07&country=GB",
    "/api/time/convert?from=America/New_York&to=Asia/Tokyo&time=2026-04-07T14:30:00Z",
  ],
}, 400));

function parseOffset(offsetStr: string): number {
  // Parse "GMT+05:30" or "GMT-04:00" → minutes
  const match = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
}

function findNextBusinessDay(from: Date, isAlreadyBusiness: boolean): string {
  if (isAlreadyBusiness) return from.toISOString().split("T")[0];
  const d = new Date(from);
  for (let i = 1; i <= 10; i++) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) return d.toISOString().split("T")[0];
  }
  return from.toISOString().split("T")[0];
}

export default time;
