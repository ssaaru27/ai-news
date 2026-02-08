import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import Parser from "rss-parser";

const SOURCES_PATH = path.join(process.cwd(), "sources.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const FEED_PATH = path.join(PUBLIC_DIR, "feed.json");
const TRENDING_PATH = path.join(PUBLIC_DIR, "trending.json");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt");
const MAX_FEED_ITEMS = 500;
const MAX_TRENDING_ITEMS = 30;
const TRENDING_WINDOW_HOURS = 48;
const REQUEST_TIMEOUT_MS = 12000;
const USER_AGENT = "ai-news-aggregator/1.0 (+https://example.com; contact: admin@example.com)";

interface SourceConfig {
  name: string;
  rssUrl: string;
  siteUrl?: string;
  category: string;
  weight?: number;
}

interface AggregatedItem {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  publishedAt: string;
  excerpt: string;
  score: number;
  trendingScore: number;
}

interface IntermediateItem extends Omit<AggregatedItem, "id" | "score" | "trendingScore"> {
  guid: string;
  canonicalUrl: string;
  normalizedTitle: string;
}

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  guid?: string;
  id?: string;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    const removableParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "ref_src",
      "source"
    ];
    for (const key of removableParams) {
      parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    parsed.pathname = pathname;
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

function getPublishedAt(item: RssItem): Date | null {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function buildClusterSignature(title: string): string {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "about",
    "your",
    "this",
    "that",
    "will",
    "what",
    "how",
    "why",
    "new",
    "latest",
    "after",
    "over",
    "under",
    "just",
    "into",
    "when",
    "where",
    "have",
    "has",
    "are"
  ]);

  const terms = normalizeText(title)
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 6)
    .sort();

  return terms.slice(0, 3).join("|");
}

function makeId(item: IntermediateItem): string {
  return crypto
    .createHash("sha1")
    .update(`${item.canonicalUrl}|${item.sourceName}|${item.publishedAt}|${item.title}`)
    .digest("hex");
}

async function loadSources(): Promise<SourceConfig[]> {
  const raw = await fs.readFile(SOURCES_PATH, "utf8");
  const parsed = JSON.parse(raw) as SourceConfig[];
  return parsed.filter((source) => source.name && source.rssUrl && source.category);
}

async function fetchFeed(parser: Parser, source: SourceConfig): Promise<IntermediateItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(source.rssUrl, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const parsed = await parser.parseString(xml);
    const sourceUrl = source.siteUrl ?? parsed.link ?? source.rssUrl;

    return (parsed.items ?? [])
      .map((rawItem) => {
        const item = rawItem as RssItem;
        const title = item.title?.trim() ?? "";
        const url = item.link?.trim() ?? "";
        if (!title || !url) {
          return null;
        }
        const publishedAtDate = getPublishedAt(item);
        if (!publishedAtDate) {
          return null;
        }

        const excerpt = truncate(
          stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? ""),
          220
        );

        const canonicalUrl = canonicalizeUrl(url);
        const normalizedTitle = normalizeText(title);

        return {
          title,
          url,
          sourceName: source.name,
          sourceUrl,
          category: source.category,
          publishedAt: publishedAtDate.toISOString(),
          excerpt,
          guid: (item.guid ?? item.id ?? canonicalUrl).trim(),
          canonicalUrl,
          normalizedTitle
        } satisfies IntermediateItem;
      })
      .filter((entry): entry is IntermediateItem => entry !== null);
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeItems(items: IntermediateItem[]): IntermediateItem[] {
  const byCanonical = new Set<string>();
  const byGuid = new Set<string>();
  const byTitle = new Set<string>();
  const deduped: IntermediateItem[] = [];

  for (const item of items) {
    if (byCanonical.has(item.canonicalUrl) || byGuid.has(item.guid) || byTitle.has(item.normalizedTitle)) {
      continue;
    }
    byCanonical.add(item.canonicalUrl);
    byGuid.add(item.guid);
    byTitle.add(item.normalizedTitle);
    deduped.push(item);
  }
  return deduped;
}

function scoreItems(items: IntermediateItem[], sourceWeights: Map<string, number>): AggregatedItem[] {
  const now = Date.now();
  const clusterCounts = new Map<string, number>();

  for (const item of items) {
    const signature = buildClusterSignature(item.title);
    if (!signature) {
      continue;
    }
    clusterCounts.set(signature, (clusterCounts.get(signature) ?? 0) + 1);
  }

  return items.map((item) => {
    const ageHours = Math.max((now - new Date(item.publishedAt).getTime()) / 36e5, 0);
    const recencyScore = Math.exp(-ageHours / 30);
    const sourceWeight = sourceWeights.get(item.sourceName) ?? 1;
    const signature = buildClusterSignature(item.title);
    const clusterCount = signature ? clusterCounts.get(signature) ?? 1 : 1;
    const clusterBoost = 1 + Math.log2(clusterCount) * 0.25;
    const score = recencyScore * sourceWeight * clusterBoost;
    const trendingMultiplier = ageHours <= TRENDING_WINDOW_HOURS ? 1.15 : 0.4;
    const trendingScore = score * trendingMultiplier;

    return {
      id: makeId(item),
      title: item.title,
      url: item.url,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      category: item.category,
      publishedAt: item.publishedAt,
      excerpt: item.excerpt,
      score: Number(score.toFixed(6)),
      trendingScore: Number(trendingScore.toFixed(6))
    };
  });
}

function buildSitemapXml(siteUrl: string): string {
  const cleanSite = siteUrl.replace(/\/+$/, "");
  const now = new Date().toISOString();
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    "  <url>",
    `    <loc>${cleanSite}/</loc>`,
    `    <lastmod>${now}</lastmod>`,
    "    <changefreq>hourly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>"
  ].join("\n");
}

function buildRobots(siteUrl: string): string {
  const cleanSite = siteUrl.replace(/\/+$/, "");
  return [`User-agent: *`, `Allow: /`, `Sitemap: ${cleanSite}/sitemap.xml`].join("\n");
}

async function main(): Promise<void> {
  const sources = await loadSources();
  const parser = new Parser();
  const sourceWeights = new Map<string, number>();
  for (const source of sources) {
    sourceWeights.set(source.name, source.weight ?? 1);
  }

  const allItems: IntermediateItem[] = [];

  for (const source of sources) {
    try {
      const parsedItems = await fetchFeed(parser, source);
      allItems.push(...parsedItems);
      console.log(`Fetched ${parsedItems.length} items from ${source.name}`);
    } catch (error) {
      console.warn(`Failed to fetch ${source.name}:`, error instanceof Error ? error.message : error);
    }
  }

  const deduped = dedupeItems(
    allItems.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
  );
  const scored = scoreItems(deduped, sourceWeights).sort((a, b) => b.score - a.score);
  const feed = scored.slice(0, MAX_FEED_ITEMS);

  const now = Date.now();
  const trending = scored
    .filter((item) => now - new Date(item.publishedAt).getTime() <= TRENDING_WINDOW_HOURS * 36e5)
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, MAX_TRENDING_ITEMS);

  const siteUrl = (process.env.SITE_URL ?? "https://example.com").trim();

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(FEED_PATH, `${JSON.stringify(feed, null, 2)}\n`, "utf8"),
    fs.writeFile(TRENDING_PATH, `${JSON.stringify(trending, null, 2)}\n`, "utf8"),
    fs.writeFile(SITEMAP_PATH, `${buildSitemapXml(siteUrl)}\n`, "utf8"),
    fs.writeFile(ROBOTS_PATH, `${buildRobots(siteUrl)}\n`, "utf8")
  ]);

  console.log(`Wrote ${feed.length} feed items and ${trending.length} trending items.`);
}

void main();
