import { Hono } from "hono";
import { marked } from "marked";
import type { Env } from "../types";
import { SKILLS, SKILLS_BY_SLUG } from "../data/skills";

const skills = new Hono<{ Bindings: Env }>();

function serveRawMarkdown(skill: { slug: string; markdown: string }, c: any) {
  return c.text(skill.markdown, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="${skill.slug}.md"`,
    "Cache-Control": "public, max-age=3600",
  });
}

// GET /skills/{slug}/SKILL.md — canonical download path (expected by MCP/Skills tooling)
skills.get("/:slug/SKILL.md", (c) => {
  const skill = SKILLS_BY_SLUG.get(c.req.param("slug"));
  if (!skill) return c.json({ error: "Skill not found" }, 404);
  return serveRawMarkdown(skill, c);
});

// GET /skills/{slug}/raw — backward-compat alias
skills.get("/:slug/raw", (c) => {
  const skill = SKILLS_BY_SLUG.get(c.req.param("slug"));
  if (!skill) return c.json({ error: "Skill not found" }, 404);
  return serveRawMarkdown(skill, c);
});

// GET /skills/{slug} — per-skill rendered page
skills.get("/:slug", (c) => {
  const skill = SKILLS_BY_SLUG.get(c.req.param("slug"));
  if (!skill) return c.json({ error: "Skill not found", catalog: "/skills" }, 404);
  const body = marked.parse(skill.markdown) as string;
  return c.html(renderSkillPage(skill.slug, skill.name, skill.description, skill.price, body));
});

// GET /skills — catalog index
skills.get("/", (c) => c.html(renderCatalog()));

function renderCatalog(): string {
  const cards = SKILLS.map(s => `
<a class="card" href="/skills/${s.slug}">
  <div class="card-head">
    <span class="card-name">${esc(s.name)}</span>
    <span class="price-badge">${esc(s.price)}</span>
  </div>
  <p class="card-desc">${esc(s.description)}</p>
  <div class="card-foot">
    <span class="tier-badge">${esc(s.tier)}</span>
    <span class="read-link">Read skill →</span>
  </div>
</a>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DevDrops Skills — Agent-ready API skills</title>
<meta name="description" content="10 SKILL.md files teaching Claude and AI agents how to use DevDrops data APIs via x402 micropayments.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0b;--bg2:#111113;--bg3:#1a1a1e;--text:#e8e6e1;--text2:#9d9b95;--text3:#5c5b57;--accent:#22c55e;--border:#222224;--border2:#2a2a2e;--mono:'JetBrains Mono',monospace;--serif:'Instrument Serif',Georgia,serif;--radius:6px}
body{background:var(--bg);color:var(--text);font-family:var(--mono);font-size:14px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:900px;margin:0 auto;padding:0 24px}
header{padding:20px 0;border-bottom:1px solid var(--border)}
.header-inner{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;text-decoration:none}
.logo svg{height:28px;width:auto}
.header-links{display:flex;gap:16px;align-items:center}
.header-links a{font-size:12px;color:var(--text3)}
.header-links a:hover{color:var(--text)}
.header-tag{font-size:11px;color:var(--text3);border:1px solid var(--border);padding:3px 10px;border-radius:20px}
.hero{padding:60px 0 40px;border-bottom:1px solid var(--border)}
.hero h1{font-family:var(--serif);font-size:clamp(32px,5vw,52px);font-weight:400;line-height:1.1;margin-bottom:12px}
.hero h1 em{font-style:italic;color:var(--accent)}
.hero-sub{font-size:14px;color:var(--text2);max-width:540px;line-height:1.7}
.section{padding:48px 0}
.section-label{font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
.section-title{font-family:var(--serif);font-size:24px;font-weight:400;margin-bottom:24px}
.grid{display:grid;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
@media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
.card{background:var(--bg);padding:24px;display:block;text-decoration:none;transition:background .15s}
.card:hover{background:var(--bg2)}
.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}
.card-name{font-size:13px;font-weight:700;color:var(--text);line-height:1.3}
.price-badge{font-size:11px;color:var(--accent);white-space:nowrap;background:rgba(34,197,94,.08);padding:2px 8px;border-radius:3px;flex-shrink:0}
.card-desc{font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:12px}
.card-foot{display:flex;justify-content:space-between;align-items:center}
.tier-badge{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px}
.read-link{font-size:11px;color:var(--accent)}
footer{padding:24px 0;border-top:1px solid var(--border);font-size:12px;color:var(--text3)}
</style>
</head>
<body>
<header>
<div class="container header-inner">
<a class="logo" href="/">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 228 56" fill="none">
<defs><linearGradient id="dg" x1="22" y1="3" x2="22" y2="51" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>
<path d="M22 3C11 14 5 22 5 34A17 17 0 0 0 39 34C39 22 33 14 22 3Z" fill="url(#dg)"/>
<ellipse cx="15" cy="31" rx="3.5" ry="5.5" fill="white" fill-opacity="0.28" transform="rotate(-18 15 31)"/>
<text x="52" y="39" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" font-size="26" font-weight="800" letter-spacing="-0.5"><tspan fill="#6366f1">dev</tspan><tspan fill="#1e293b">drops</tspan></text>
</svg>
</a>
<div class="header-links">
<a href="/catalog">Catalog</a>
<a href="/buy" style="color:var(--accent);font-weight:700">Buy Credits</a>
<a href="/skills" style="color:var(--text)">Skills</a>
<a href="/openapi.json">OpenAPI</a>
<a href="/docs">Docs</a>
<a href="/status">Status</a>
</div>
<div class="header-tag">x402 · USDC on Base</div>
</div>
</header>

<section class="hero">
<div class="container">
<h1>DevDrops <em>Skills</em></h1>
<p class="hero-sub">10 SKILL.md files for Claude and AI agents. Each skill teaches an agent when to call a DevDrops API, how to authenticate via x402, and what to expect back. Copy, download, or install directly.</p>
</div>
</section>

<section class="section">
<div class="container">
<div class="section-label">Skills</div>
<div class="section-title">10 agent-ready skills — v1</div>
<div class="grid">
${cards}
</div>
</div>
</section>

<footer>
<div class="container">
<span>DevDrops · <a href="/">devdrops.run</a> · <a href="/openapi.json">OpenAPI</a> · <a href="https://api.devdrops.run/.well-known/x402">x402 manifest</a></span>
</div>
</footer>
</body>
</html>`;
}

function renderSkillPage(slug: string, name: string, description: string, price: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(name)} — DevDrops Skills</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0b;--bg2:#111113;--bg3:#1a1a1e;--text:#e8e6e1;--text2:#9d9b95;--text3:#5c5b57;--accent:#22c55e;--amber:#f59e0b;--border:#222224;--border2:#2a2a2e;--mono:'JetBrains Mono',monospace;--serif:'Instrument Serif',Georgia,serif;--radius:6px}
body{background:var(--bg);color:var(--text);font-family:var(--mono);font-size:14px;line-height:1.7;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:820px;margin:0 auto;padding:0 24px}
header{padding:20px 0;border-bottom:1px solid var(--border)}
.header-inner{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;text-decoration:none}
.logo svg{height:28px;width:auto}
.header-links{display:flex;gap:16px;align-items:center}
.header-links a{font-size:12px;color:var(--text3)}
.header-links a:hover{color:var(--text)}
.breadcrumb{padding:16px 0;font-size:12px;color:var(--text3);border-bottom:1px solid var(--border)}
.breadcrumb a{color:var(--text3)}
.skill-header{padding:40px 0 32px;border-bottom:1px solid var(--border)}
.skill-header h1{font-family:var(--serif);font-size:clamp(24px,4vw,40px);font-weight:400;margin-bottom:8px}
.skill-meta{display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.price-tag{font-size:12px;color:var(--accent);background:rgba(34,197,94,.08);padding:3px 10px;border-radius:3px}
.skill-desc{font-size:14px;color:var(--text2);max-width:600px}
.actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--radius);font-family:var(--mono);font-size:12px;cursor:pointer;border:none}
.btn-primary{background:var(--accent);color:#0a0a0b;font-weight:700}
.btn-secondary{background:var(--bg3);color:var(--text2);border:1px solid var(--border2)}
.btn-secondary:hover{border-color:var(--text3);color:var(--text)}
.content{padding:40px 0 60px}
/* Markdown styles */
.md h2{font-family:var(--serif);font-size:22px;font-weight:400;margin:40px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.md h3{font-size:14px;font-weight:700;margin:24px 0 8px;color:var(--text)}
.md p{color:var(--text2);margin-bottom:14px;line-height:1.7}
.md ul,.md ol{color:var(--text2);padding-left:20px;margin-bottom:14px}
.md li{margin-bottom:4px;line-height:1.6}
.md code{background:var(--bg2);border:1px solid var(--border);padding:1px 5px;border-radius:3px;font-size:12px;color:var(--amber)}
.md pre{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;overflow-x:auto;margin-bottom:16px}
.md pre code{background:none;border:none;padding:0;color:var(--text2);font-size:12px}
.md table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
.md th{text-align:left;padding:8px 12px;background:var(--bg2);border-bottom:2px solid var(--border);color:var(--text);font-weight:600}
.md td{padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text2);vertical-align:top}
.md tr:hover td{background:var(--bg2)}
.md blockquote{border-left:3px solid var(--border2);padding-left:16px;color:var(--text3);margin-bottom:14px}
.md strong{color:var(--text)}
.md hr{border:none;border-top:1px solid var(--border);margin:32px 0}
/* hide frontmatter rendered as paragraph */
.md p:first-child > code:first-child{display:none}
footer{padding:24px 0;border-top:1px solid var(--border);font-size:12px;color:var(--text3)}
</style>
</head>
<body>
<header>
<div class="container header-inner">
<a class="logo" href="/">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 228 56" fill="none">
<defs><linearGradient id="dg" x1="22" y1="3" x2="22" y2="51" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>
<path d="M22 3C11 14 5 22 5 34A17 17 0 0 0 39 34C39 22 33 14 22 3Z" fill="url(#dg)"/>
<ellipse cx="15" cy="31" rx="3.5" ry="5.5" fill="white" fill-opacity="0.28" transform="rotate(-18 15 31)"/>
<text x="52" y="39" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" font-size="26" font-weight="800" letter-spacing="-0.5"><tspan fill="#6366f1">dev</tspan><tspan fill="#1e293b">drops</tspan></text>
</svg>
</a>
<div class="header-links">
<a href="/catalog">Catalog</a>
<a href="/buy" style="color:var(--accent);font-weight:700">Buy Credits</a>
<a href="/skills">Skills</a>
<a href="/openapi.json">OpenAPI</a>
<a href="/docs">Docs</a>
<a href="/status">Status</a>
</div>
</div>
</header>

<div class="breadcrumb">
<div class="container"><a href="/skills">← Skills</a> / ${esc(slug)}</div>
</div>

<div class="skill-header">
<div class="container">
<h1>${esc(name)}</h1>
<div class="skill-meta">
<span class="price-tag">${esc(price)}</span>
</div>
<p class="skill-desc">${esc(description)}</p>
<div class="actions">
<a class="btn btn-primary" href="/skills/${esc(slug)}/raw" download="${esc(slug)}.md">Download SKILL.md</a>
<button class="btn btn-secondary" onclick="navigator.clipboard.writeText('npx @anthropic-ai/install-skill ${esc(slug)}').then(()=>{this.textContent='Copied!';setTimeout(()=>{this.textContent='Copy install command'},2000)})">Copy install command</button>
</div>
</div>
</div>

<div class="content">
<div class="container">
<div class="md">${body}</div>
</div>
</div>

<footer>
<div class="container">
<span>DevDrops · <a href="/skills">All skills</a> · <a href="/">devdrops.run</a></span>
</div>
</footer>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default skills;
