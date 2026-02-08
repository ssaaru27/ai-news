"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Flame, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedItem } from "@/lib/types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
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
      setError("Unable to load feeds. Try refreshing in a moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
    const interval = setInterval(() => {
      void loadFeed();
    }, REFRESH_INTERVAL_MS);

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-xl border border-border/70 bg-card/85 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI News Aggregator</h1>
            <p className="text-sm text-muted-foreground">
              Fresh AI stories from curated RSS sources. Updated every 5 minutes in your browser.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadFeed()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title, source, or excerpt..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {lastUpdated ? `Last loaded ${lastUpdated.toLocaleTimeString()}` : "Loading feed..."}
        </p>
      </header>

      {error ? (
        <Card className="border-red-300/70">
          <CardContent className="p-6 text-sm text-red-700 dark:text-red-300">{error}</CardContent>
        </Card>
      ) : null}

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h2 className="text-lg font-semibold">Trending (Last 48h)</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((item) => (
            <Card key={`trending-${item.id}`} className="border-border/70">
              <CardHeader className="p-4 pb-2">
                <Badge variant="secondary" className="w-fit">
                  {item.category}
                </Badge>
                <CardTitle className="line-clamp-2 text-base">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {item.title}
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {item.sourceName}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span>{formatDate(item.publishedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {trending.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">No trending stories in the last 48 hours.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Latest Feed</h2>
        <div className="grid gap-4">
          {filteredFeed.map((item) => (
            <Card key={item.id} className="border-border/70">
              <CardHeader className="p-5 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant="secondary">Score {item.score.toFixed(2)}</Badge>
                </div>
                <CardTitle className="text-lg">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {item.title}
                  </a>
                </CardTitle>
                <CardDescription>{formatDate(item.publishedAt)}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="mb-3 text-sm text-muted-foreground">{item.excerpt}</p>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Source: {item.sourceName}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          ))}
          {!loading && filteredFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stories match your current search or filters.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
