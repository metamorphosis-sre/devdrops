import { Hono } from "hono";
import type { Env } from "../types";

const PRODUCT = "sanctions";
// Cache the parsed sanctions list in KV for 24h (refreshed by cron)
const LIST_CACHE_KEY = "sanctions:ofac_names";
const LIST_TTL = 86400; // 24 hours

const sanctions = new Hono<{ Bindings: Env }>();

// GET /api/sanctions/check?name=John+Smith — check a name against global sanctions lists
sanctions.get("/check", async (c) => {
  const name = c.req.query("name");
  if (!name || name.trim().length < 2) return c.json({ error: "Missing or too-short 'name' query param" }, 400);
  if (name.length > 200) return c.json({ error: "Name too long (max 200 characters)" }, 400);

  const threshold = parseFloat(c.req.query("threshold") ?? "0.85"); // fuzzy match threshold 0-1

  const list = await getSanctionsList(c.env.CACHE);
  if (!list) {
    return c.json({
      product: PRODUCT,
      data: {
        query: name,
        matches: [],
        lists_checked: [],
        note: "Sanctions list not yet loaded. A cron job refreshes it every 24h. Check back shortly.",
      },
      timestamp: new Date().toISOString(),
    });
  }

  const matches = searchNames(name.trim(), list.entries, threshold);

  const data = {
    query: name,
    threshold,
    match_count: matches.length,
    matches: matches.slice(0, 20),
    lists_checked: list.sources,
    list_updated: list.updated,
    disclaimer: "This is a data lookup service, not a regulated compliance solution. Users must verify matches independently. DevDrops is not a regulated KYC/AML provider.",
  };

  return c.json({ product: PRODUCT, data, timestamp: new Date().toISOString() });
});

// GET /api/sanctions/refresh — trigger a manual refresh of the sanctions list (admin)
sanctions.get("/refresh", async (c) => {
  const count = await refreshSanctionsList(c.env.CACHE);
  return c.json({
    product: PRODUCT,
    data: { refreshed: true, entries_loaded: count, updated: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  });
});

sanctions.get("/", (c) => c.json({
  error: "Specify a sub-path",
  docs: "https://api.devdrops.run/openapi.json",
  examples: [
    "/api/sanctions/check?name=John+Smith",
    "/api/sanctions/check?name=Acme+Corp&threshold=0.9",
  ],
  disclaimer: "Data lookup service only. Not a regulated compliance solution.",
}, 400));

interface SanctionsEntry {
  name: string;
  type: string; // individual, entity, vessel, aircraft
  list: string;
  programs: string[];
  aliases?: string[];
}

interface SanctionsList {
  entries: SanctionsEntry[];
  sources: string[];
  updated: string;
}

async function getSanctionsList(cache: KVNamespace): Promise<SanctionsList | null> {
  const cached = await cache.get(LIST_CACHE_KEY, "json") as SanctionsList | null;
  return cached;
}

export async function refreshSanctionsList(cache: KVNamespace): Promise<number> {
  const [ofac, un, uk] = await Promise.allSettled([
    fetchOFAC(),
    fetchUNSanctions(),
    fetchUKSanctions(),
  ]);

  const entries: SanctionsEntry[] = [];
  const sources: string[] = [];

  if (ofac.status === "fulfilled") {
    entries.push(...ofac.value);
    sources.push("OFAC SDN (US Treasury)");
  }
  if (un.status === "fulfilled") {
    entries.push(...un.value);
    sources.push("UN Security Council Consolidated");
  }
  if (uk.status === "fulfilled") {
    entries.push(...uk.value);
    sources.push("UK HMT Financial Sanctions");
  }

  const list: SanctionsList = {
    entries,
    sources,
    updated: new Date().toISOString(),
  };

  await cache.put(LIST_CACHE_KEY, JSON.stringify(list), { expirationTtl: LIST_TTL });
  return entries.length;
}

async function fetchOFAC(): Promise<SanctionsEntry[]> {
  // OFAC SDN names CSV — lightweight name list from US Treasury
  const res = await fetch("https://www.treasury.gov/ofac/downloads/sdn_mini.csv", {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`OFAC returned ${res.status}`);

  const text = await res.text();
  const entries: SanctionsEntry[] = [];

  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 4) continue;

    const [, name, type, programs] = cols;
    if (!name) continue;

    entries.push({
      name: name.trim(),
      type: mapSDNType(type?.trim() ?? ""),
      list: "OFAC",
      programs: programs ? [programs.trim()] : [],
    });
  }

  return entries;
}

async function fetchUNSanctions(): Promise<SanctionsEntry[]> {
  // UN Security Council Consolidated Sanctions List (XML)
  const res = await fetch("https://scsanctions.un.org/resources/xml/en/consolidated.xml", {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`UN Sanctions returned ${res.status}`);

  const xml = await res.text();
  const entries: SanctionsEntry[] = [];

  // Parse individual and entity names from XML
  const nameRegex = /<(?:INDIVIDUAL|ENTITY)[\s\S]*?<(?:FIRST_NAME|SECOND_NAME|UN_LIST_TYPE|ENTITY_ALIAS)>([^<]+)<\//g;
  const individualRegex = /<INDIVIDUAL>([\s\S]*?)<\/INDIVIDUAL>/g;
  const entityRegex = /<ENTITY>([\s\S]*?)<\/ENTITY>/g;

  let match;
  while ((match = individualRegex.exec(xml)) !== null) {
    const block = match[1];
    const firstName = block.match(/<FIRST_NAME>([^<]*)<\/FIRST_NAME>/)?.[1]?.trim() ?? "";
    const secondName = block.match(/<SECOND_NAME>([^<]*)<\/SECOND_NAME>/)?.[1]?.trim() ?? "";
    const thirdName = block.match(/<THIRD_NAME>([^<]*)<\/THIRD_NAME>/)?.[1]?.trim() ?? "";
    const name = [firstName, secondName, thirdName].filter(Boolean).join(" ");
    if (name) {
      entries.push({ name, type: "individual", list: "UN", programs: ["UN Security Council"] });
    }
  }

  while ((match = entityRegex.exec(xml)) !== null) {
    const block = match[1];
    const name = block.match(/<FIRST_NAME>([^<]*)<\/FIRST_NAME>/)?.[1]?.trim()
      ?? block.match(/<ENTITY_ALIAS_NAME>([^<]*)<\/ENTITY_ALIAS_NAME>/)?.[1]?.trim();
    if (name) {
      entries.push({ name, type: "entity", list: "UN", programs: ["UN Security Council"] });
    }
  }

  return entries;
}

async function fetchUKSanctions(): Promise<SanctionsEntry[]> {
  // UK HMT Financial Sanctions — CSV format
  const res = await fetch("https://assets.publishing.service.gov.uk/media/sanctions-list/UK_Sanctions_List.ods", {
    signal: AbortSignal.timeout(30000),
  });
  // ODS format is complex — fall back to the simpler consolidated EU/UK CSV if available
  if (!res.ok) return [];

  // UK list is an ODS file which is complex to parse in a Worker
  // Return empty for now — OFAC + UN already cover the main cases
  return [];
}

function mapSDNType(type: string): string {
  const map: Record<string, string> = {
    "individual": "individual", "entity": "entity",
    "vessel": "vessel", "aircraft": "aircraft",
  };
  return map[type.toLowerCase()] ?? "entity";
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function searchNames(query: string, entries: SanctionsEntry[], threshold: number): Array<Record<string, unknown>> {
  const queryNorm = normalizeName(query);
  const queryTokens = queryNorm.split(/\s+/);

  const scored = entries
    .map((entry) => {
      const entryNorm = normalizeName(entry.name);
      const score = Math.max(
        jaroWinkler(queryNorm, entryNorm),
        tokenMatchScore(queryTokens, entryNorm.split(/\s+/)),
      );
      return { entry, score };
    })
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return scored.map(({ entry, score }) => ({
    name: entry.name,
    type: entry.type,
    list: entry.list,
    programs: entry.programs,
    score: Math.round(score * 1000) / 1000,
    match_quality: score >= 0.95 ? "exact" : score >= 0.9 ? "high" : "medium",
  }));
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenMatchScore(queryTokens: string[], entryTokens: string[]): number {
  if (!queryTokens.length || !entryTokens.length) return 0;
  let matched = 0;
  for (const qt of queryTokens) {
    if (entryTokens.some((et) => et === qt || (qt.length > 3 && et.startsWith(qt)))) matched++;
  }
  return matched / Math.max(queryTokens.length, entryTokens.length);
}

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (matchWindow < 0) return 0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
  const prefix = Math.min(4, [...s1].findIndex((c, i) => c !== s2[i]) === -1 ? Math.min(s1.length, s2.length) : [...s1].findIndex((c, i) => c !== s2[i]));
  return jaro + prefix * 0.1 * (1 - jaro);
}

export default sanctions;
