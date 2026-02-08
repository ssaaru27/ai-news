"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Search } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeedItem } from "@/lib/types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const NAV_LINKS = [
  { label: "Home", sectionId: "home" },
  { label: "Trending AI", sectionId: "trending" },
  { label: "Research", sectionId: "research" },
  { label: "Opinion", sectionId: "opinion" },
  { label: "Podcasts", sectionId: "podcasts" }
];

const INNOVATORS = [
  { name: "Dr. Anna Singh", subtitle: "AI Ethics Lead" },
  { name: "Mark Chen", subtitle: "Foundation Model Engineer" },
  { name: "Lina Alvarez", subtitle: "Applied ML Researcher" }
];

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B5DE] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

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
  const [activeSection, setActiveSection] = useState("home");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const desktopSearchRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchRef = useRef<HTMLInputElement | null>(null);

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
  const researchFeed = filteredFeed.filter((item) => item.category.toLowerCase().includes("research")).slice(0, 3);
  const opinionFeed = filteredFeed.filter((item) => item.category.toLowerCase().includes("opinion")).slice(0, 3);
  const podcastFeed = filteredFeed.filter((item) => item.category.toLowerCase().includes("podcast")).slice(0, 3);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
  };

  const onAskAiNews = () => {
    scrollToSection("latest");
    const isDesktop = window.matchMedia("(min-width: 640px)").matches;
    const searchInput = isDesktop ? desktopSearchRef.current : mobileSearchRef.current;
    const fallbackInput = desktopSearchRef.current ?? mobileSearchRef.current;
    (searchInput ?? fallbackInput)?.focus();
  };

  useEffect(() => {
    const sections = NAV_LINKS.map((link) => document.getElementById(link.sectionId)).filter(
      (section): section is HTMLElement => section !== null
    );

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (current) {
          setActiveSection(current.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-30% 0px -45% 0px",
        threshold: [0.2, 0.6, 1]
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [feed, query, selectedCategory]);

  return (
    <main id="home" className="w-screen min-h-dvh overflow-x-hidden px-2 py-4 sm:px-4 lg:px-6">
      <div className="glass-panel mx-auto w-full rounded-[18px]">
        <header className="border-b border-white/10 bg-slate-950/25 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Image src="/logo-mark.svg" alt="" width={24} height={24} className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-100 sm:text-base">
                AI Chronicle
              </span>
            </div>

            <nav className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.sectionId}
                  href={`#${link.sectionId}`}
                  data-testid={`nav-${link.sectionId}`}
                  aria-current={activeSection === link.sectionId ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(link.sectionId);
                  }}
                  className={`section-title relative text-[11px] font-semibold transition ${
                    activeSection === link.sectionId ? "text-[#35B5DE]" : "text-slate-300 hover:text-slate-100"
                  } ${FOCUS_RING_CLASS}`}
                >
                  {link.label}
                  {activeSection === link.sectionId ? (
                    <span className="absolute -bottom-3 left-0 h-[2px] w-full bg-[#35B5DE]" />
                  ) : null}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  ref={desktopSearchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  aria-label="Search news"
                  className="h-8 w-44 rounded-md border-white/10 bg-white/5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:ring-[#35B5DE]"
                />
              </div>
              <div className="relative md:hidden">
                <select
                  aria-label="Sections"
                  value={activeSection}
                  onChange={(event) => scrollToSection(event.target.value)}
                  className={`h-8 appearance-none rounded-md border border-white/10 bg-white/5 px-2 pr-7 text-xs text-slate-300 ${FOCUS_RING_CLASS}`}
                >
                  {NAV_LINKS.map((link) => (
                    <option key={link.sectionId} value={link.sectionId}>
                      {link.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
          <div className="relative mt-3 sm:hidden">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <Input
              ref={mobileSearchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search news"
              className="h-8 rounded-md border-white/10 bg-white/5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:ring-[#35B5DE]"
            />
          </div>
        </header>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.95fr_0.9fr]">
          <section className="space-y-4" id="latest">
            <Card className="glass-panel overflow-hidden rounded-2xl border-white/10 bg-white/[0.04]">
              <div
                className="relative min-h-[190px] bg-cover bg-center p-5 sm:p-7"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(9,16,29,0.88) 0%, rgba(9,16,29,0.36) 55%, rgba(9,16,29,0.28) 100%), url('/hero-brain.svg')"
                }}
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
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8ad7ef]">
                        Read
                        <ExternalLink className="h-3 w-3" />
                      </span>
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

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { id: "research", title: "Research", stories: researchFeed },
                { id: "opinion", title: "Opinion", stories: opinionFeed },
                { id: "podcasts", title: "Podcasts", stories: podcastFeed }
              ].map((section) => (
                <Card key={section.id} id={section.id} className="glass-panel rounded-2xl border-white/10 bg-white/[0.04]">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="section-title text-sm text-slate-100">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-1">
                    {section.stories.map((item) => (
                      <article key={`${section.id}-${item.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="line-clamp-2 text-xs font-semibold uppercase tracking-wide text-slate-100">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-slate-300">{item.excerpt}</p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-[#8ad7ef] hover:text-[#b0e8f8] ${FOCUS_RING_CLASS}`}
                          >
                            Read
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <a
                            href={item.sourceUrl || item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-slate-300 hover:text-slate-100 ${FOCUS_RING_CLASS}`}
                          >
                            Source
                          </a>
                        </div>
                      </article>
                    ))}
                    {section.stories.length === 0 && !loading ? (
                      <p className="text-xs text-slate-400">No items for this section yet.</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <aside className="glass-panel rounded-2xl border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <Button
              data-testid="ask-ai-news"
              onClick={onAskAiNews}
              className="h-9 w-full rounded-md bg-[#35B5DE] text-xs font-semibold uppercase tracking-wide text-[#081624] hover:bg-[#44bfe6]"
            >
              Ask AI News
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Streamlined analysis from trusted AI coverage. Browse, filter, and follow source links for full context.
            </p>
            <div className="my-4 h-px w-full bg-white/10" />

            <h2 className="section-title mb-2 text-sm font-semibold text-slate-100" id="topics">
              Popular Topics
            </h2>
            <div className="flex flex-wrap gap-2" aria-label="Popular Topics">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`topic-${category.toLowerCase()}`}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                    selectedCategory === category
                      ? "border-[#35B5DE]/60 bg-[#35B5DE]/20 text-[#8ad7ef]"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-[#35B5DE]/40"
                  } ${FOCUS_RING_CLASS}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="my-4 h-px w-full bg-white/10" />
            <h3 className="section-title mb-3 text-sm font-semibold text-slate-100" id="trending">
              Trending AI
            </h3>
            <div className="space-y-3" aria-label="Trending AI stories">
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
                    {item.sourceName} - {toDateLabel(item.publishedAt)}
                  </p>
                </a>
              ))}
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-950/25 px-4 py-3 text-[10px] text-slate-400 sm:px-6">
          <span>Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : "just now"} - refresh every 5 min</span>
          <div className="flex items-center gap-3">
            {error ? <span className="text-red-300">{error}</span> : null}
            {filteredFeed[0] ? (
              <a
                href={filteredFeed[0].sourceUrl || filteredFeed[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 hover:text-[#8ad7ef] ${FOCUS_RING_CLASS}`}
              >
                Source Links
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span>No source links for current filter</span>
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}
