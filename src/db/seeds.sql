-- DevDrops data_sources seed
-- Registers upstream API health-check URLs for all 25 products.
-- Run: npx wrangler d1 execute devdrops --remote --file=src/db/seeds.sql

INSERT OR IGNORE INTO data_sources (product, source_name, source_url, is_primary, is_active) VALUES

-- Weather (OpenWeatherMap)
('weather', 'openweathermap', 'https://api.openweathermap.org', 1, 1),

-- FX (Frankfurter)
('fx', 'frankfurter', 'https://api.frankfurter.dev/v1/latest', 1, 1),

-- History (Wikipedia)
('history', 'wikipedia-onthisday', 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/01/01', 1, 1),

-- Predictions (Polymarket Gamma + Manifold)
('predictions', 'polymarket-gamma', 'https://gamma-api.polymarket.com/markets?limit=1', 1, 1),
('predictions', 'manifold', 'https://api.manifold.markets/v0/markets?limit=1', 0, 1),

-- Odds (The Odds API)
('odds', 'the-odds-api', 'https://api.the-odds-api.com/v4/sports', 1, 1),

-- Filings (SEC EDGAR + Companies House)
('filings', 'sec-edgar', 'https://efts.sec.gov/LATEST/search-index?q=test&dateRange=custom&startdt=2025-01-01&enddt=2025-01-02', 1, 1),
('filings', 'companies-house', 'https://api.company-information.service.gov.uk', 0, 1),

-- Regulatory (Companies House streaming + EUR-Lex)
('regulatory', 'companies-house-stream', 'https://api.company-information.service.gov.uk', 1, 1),
('regulatory', 'eur-lex', 'https://eur-lex.europa.eu/homepage.html', 0, 1),

-- Calendar (Trading Economics public)
('calendar', 'trading-economics', 'https://tradingeconomics.com/calendar', 1, 1),

-- Domain (RDAP IANA)
('domain', 'rdap-iana', 'https://rdap.org', 1, 1),

-- IP (IPinfo)
('ip', 'ipinfo', 'https://ipinfo.io/8.8.8.8/json', 1, 1),

-- Property (UK Land Registry)
('property', 'land-registry', 'https://landregistry.data.gov.uk', 1, 1),

-- Location (Environment Agency flood API)
('location', 'environment-agency-flood', 'https://environment.data.gov.uk/flood-monitoring/id/floodAreas?_limit=1', 1, 1),

-- Sentiment (Google News RSS)
('sentiment', 'google-news-rss', 'https://news.google.com/rss', 1, 1),

-- Documents (Anthropic — checked via env key presence, not HTTP)
('documents', 'anthropic-api', 'https://api.anthropic.com', 1, 1),

-- Research (Anthropic)
('research', 'anthropic-api', 'https://api.anthropic.com', 1, 1),

-- Signals (Anthropic)
('signals', 'anthropic-api', 'https://api.anthropic.com', 1, 1),

-- Translate (MyMemory)
('translate', 'mymemory', 'https://api.mymemory.translated.net/get?q=hello&langpair=en|fr', 1, 1),

-- Email verify (DNS-based — self-contained, no upstream dependency)
('email-verify', 'dns-mx', 'https://cloudflare-dns.com/dns-query', 1, 1),

-- Papers (OpenAlex + Semantic Scholar)
('papers', 'openalex', 'https://api.openalex.org/works?filter=title.search:test&per_page=1', 1, 1),
('papers', 'semantic-scholar', 'https://api.semanticscholar.org/graph/v1/paper/search?query=test&limit=1', 0, 1),

-- Food (Open Food Facts)
('food', 'open-food-facts', 'https://world.openfoodfacts.org/api/v2/product/737628064502.json', 1, 1),

-- Tenders (UK Contracts Finder + SAM.gov)
('tenders', 'contracts-finder', 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search', 1, 1),
('tenders', 'sam-gov', 'https://api.sam.gov', 0, 1),

-- VAT verification (EU VIES + UK HMRC)
('vat', 'eu-vies', 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms', 1, 1),
('vat', 'uk-hmrc-vat', 'https://api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup/GB123456789', 0, 1),

-- Stocks (Yahoo Finance)
('stocks', 'yahoo-finance', 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d', 1, 1),

-- Extract (self-contained, no upstream dependency)
('extract', 'self', 'https://api.devdrops.run/health', 1, 1),

-- Sanctions (OFAC US Treasury)
('sanctions', 'ofac-treasury', 'https://www.treasury.gov/ofac/downloads/sdn_mini.csv', 1, 1),
('sanctions', 'un-sanctions', 'https://scsanctions.un.org/resources/xml/en/consolidated.xml', 0, 1),

-- Company enrichment (Companies House)
('company', 'companies-house', 'https://api.company-information.service.gov.uk', 1, 1),
('company', 'opencorporates', 'https://api.opencorporates.com/v0.4/companies/search?q=test', 0, 1),

-- QR code generator (qrserver.com)
('qr', 'qrserver', 'https://api.qrserver.com/v1/create-qr-code/?data=test&size=50x50', 1, 1),

-- Crypto (CoinCap)
('crypto', 'coincap', 'https://api.coincap.io/v2/assets?limit=1', 1, 1),

-- Time/holidays (Nager.Date)
('time', 'nager-date', 'https://date.nager.at/api/v3/PublicHolidays/2026/GB', 1, 1);
