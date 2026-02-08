"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Search } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeedItem } from "@/lib/types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const NAV_LINKS = ["Home", "Trending AI", "Research", "Opinion", "Podcasts"];

const INNOVATORS = [
  { name: "Dr. Anna Singh", subtitle: "AI Ethics Lead" },
  { name: "Mark Chen", subtitle: "Foundation Model Engineer" },
  { name: "Lina Alvarez", subtitle: "Applied ML Researcher" }
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NewsApp() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<FeedItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    try {
      setError(null);
      const [feedResponse, trendingResponse] = await Promise.all([
        fetch("/feed.json", { cache: "no-store" }),
        fetch("/trending.json", { cache: "no-store" })
      ]);

      if (!feedResponse.ok || !trendingResponse.ok) {
        throw new Error("Failed to fetch feed data");
      }

      const [feedData, trendingData] = await Promise.all([
        feedResponse.json() as Promise<FeedItem[]>,
        trendingResponse.json() as Promise<FeedItem[]>
      ]);

      setFeed(feedData);
      setTrending(trendingData);
      setLastUpdated(new Date());
    } catch {
      setError("Unable to load feed data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
    const interval = setInterval(() => void loadFeed(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const categories = useMemo(() => {
    const values = new Set(feed.map((item) => item.category).filter(Boolean));
    return ["all", ...Array.from(values).sort()];
  }, [feed]);

  const filteredFeed = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return feed.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.excerpt.toLowerCase().includes(normalizedQuery) ||
        item.sourceName.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [feed, query, selectedCategory]);

  const latestDevelopments = filteredFeed.slice(0, 3);
  const deepDives = filteredFeed.slice(3, 5);

  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
      <div className="glass-panel overflow-hidden rounded-[18px]">
        <header className="border-b border-white/10 bg-slate-950/25 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Image src="/logo-mark.svg" alt="" width={24} height={24} className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-100 sm:text-base">
                AI Chronicle
              </span>
            </div>

            <nav className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link, idx) => (
                <a
                  key={link}
                  href="#"
                  className={`section-title relative text-[11px] font-semibold ${
                    idx === 0 ? "text-[#35B5DE]" : "text-slate-300"
                  }`}
                >
                  {link}
                  {idx === 0 ? <span className="absolute -bottom-3 left-0 h-[2px] w-full bg-[#35B5DE]" /> : null}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="h-8 w-44 rounded-md border-white/10 bg-white/5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:ring-[#35B5DE]"
                />
              </div>
              <div className="relative md:hidden">
                <select
                  aria-label="Sections"
                  className="h-8 appearance-none rounded-md border border-white/10 bg-white/5 px-2 pr-7 text-xs text-slate-300"
                >
                  {NAV_LINKS.map((link) => (
                    <option key={link}>{link}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
          <div className="relative mt-3 sm:hidden">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-8 rounded-md border-white/10 bg-white/5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:ring-[#35B5DE]"
            />
          </div>
        </header>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.95fr_0.9fr]">
          <section className="space-y-4">
            <Card className="glass-panel overflow-hidden rounded-2xl border-white/10 bg-white/[0.04]">
              <div
                className="relative min-h-[190px] bg-cover bg-center p-5 sm:p-7"
                style={{ backgroundImage: "linear-gradient(90deg, rgba(9,16,29,0.88) 0%, rgba(9,16,29,0.36) 55%, rgba(9,16,29,0.28) 100%), url('/hero-brain.svg')" }}
              >
                <div className="max-w-md">
                  <p className="section-title mb-2 text-[11px] font-semibold text-[#35B5DE]">Featured Insight</p>
                  <h1 className="section-title text-2xl font-bold leading-tight text-slate-100 sm:text-3xl">
                    The Future Is Now: AI Breakthroughs Refining Industries
                  </h1>
                  <p className="mt-2 text-xs text-slate-300">
                    Curated snapshots of major AI advances and high-signal trends.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="glass-panel rounded-2xl border-white/10 bg-white/[0.04]">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="section-title text-sm text-slate-100">Latest Developments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-1">
                  {latestDevelopments.map((item, idx) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-2.5 transition hover:bg-white/[0.07]"
                    >
                      <div className="accent-glow flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-semibold uppercase tracking-wide text-slate-100">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{item.sourceName}</p>
                      </div>
                    </a>
                  ))}
                  {latestDevelopments.length === 0 && !loading ? (
                    <p className="text-xs text-slate-400">No items found for this filter.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="glass-panel rounded-2xl border-white/10 bg-white/[0.04]">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="section-title text-sm text-slate-100">Deep Dives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-1">
                  {deepDives.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-3 transition hover:border-[#35B5DE]/50"
                      style={{
                        backgroundImage:
                          "linear-gradient(120deg, rgba(9,16,29,0.9), rgba(14,28,48,0.55)), url('/hero-brain.svg')",
                        backgroundSize: "cover"
                      }}
                    >
                      <Badge
                        variant="secondary"
                        className="mb-2 border border-[#35B5DE]/45 bg-[#35B5DE]/15 text-[10px] uppercase tracking-wide text-[#8ad7ef]"
                      >
                        {item.category}
                      </Badge>
                      <p className="line-clamp-2 text-sm font-semibold uppercase tracking-wide text-slate-100">
                        {item.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-300">{item.excerpt}</p>
                    </a>
                  ))}
                  {deepDives.length === 0 && !loading ? (
                    <p className="text-xs text-slate-400">No deep-dive cards yet.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="glass-panel rounded-2xl border-white/10 bg-white/[0.04]">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="section-title text-sm text-slate-100">AI Innovators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-1">
                  {INNOVATORS.map((person, idx) => (
                    <div key={person.name} className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-2.5">
                      <div className="accent-glow flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {initials(person.name)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-100">{person.name}</p>
                        <p className="text-[10px] text-slate-400">{person.subtitle}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-slate-500">{idx + 1}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          <aside className="glass-panel rounded-2xl border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <Button className="h-9 w-full rounded-md bg-[#35B5DE] text-xs font-semibold uppercase tracking-wide text-[#081624] hover:bg-[#44bfe6]">
              Ask AI News
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Streamlined analysis from trusted AI coverage. Browse, filter, and follow source links for full context.
            </p>
            <div className="my-4 h-px w-full bg-white/10" />

            <h2 className="section-title mb-2 text-sm font-semibold text-slate-100">Popular Topics</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                    selectedCategory === category
                      ? "border-[#35B5DE]/60 bg-[#35B5DE]/20 text-[#8ad7ef]"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-[#35B5DE]/40"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="my-4 h-px w-full bg-white/10" />
            <h3 className="section-title mb-3 text-sm font-semibold text-slate-100">Trending AI</h3>
            <div className="space-y-3">
              {trending.slice(0, 4).map((item) => (
                <a
                  key={`tr-${item.id}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-white/10 bg-white/[0.03] p-2.5 hover:border-[#35B5DE]/45"
                >
                  <p className="line-clamp-2 text-xs font-semibold uppercase tracking-wide text-slate-100">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {item.sourceName} • {toDateLabel(item.publishedAt)}
                  </p>
                </a>
              ))}
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-950/25 px-4 py-3 text-[10px] text-slate-400 sm:px-6">
          <span>Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : "just now"} • refresh every 5 min</span>
          <div className="flex items-center gap-3">
            {error ? <span className="text-red-300">{error}</span> : null}
            <a
              href={filteredFeed[0]?.sourceUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#8ad7ef]"
            >
              Source Links
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
