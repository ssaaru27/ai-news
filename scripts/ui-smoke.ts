import { chromium } from "playwright";
import assert from "node:assert/strict";

const URL = process.env.UI_SMOKE_URL ?? "http://127.0.0.1:3100";
const STARTUP_TIMEOUT_MS = 90_000;

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    try {
      const response = await fetch(URL);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for dev server at ${URL}. Start it with: corepack pnpm dev --port 3100`);
}

async function run() {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });

  try {
    await page.goto(URL, { waitUntil: "networkidle" });

    const layoutState = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) {
        return null;
      }

      const bodyStyles = window.getComputedStyle(document.body);
      const mainStyles = window.getComputedStyle(main);
      return {
        mainMinHeight: mainStyles.minHeight,
        bodyOverflowY: bodyStyles.overflowY
      };
    });

    assert.ok(layoutState, "Main layout container was not rendered");
    assert.notEqual(layoutState.bodyOverflowY, "hidden", "Page scroll is blocked by body overflow");

    await page.click('[data-testid="nav-trending"]');
    await page.waitForTimeout(300);
    const trendingVisible = await page
      .locator("#trending")
      .evaluate((el) => el.getBoundingClientRect().top < window.innerHeight && el.getBoundingClientRect().bottom > 0);
    assert.ok(trendingVisible, "Trending nav did not bring the trending section into view");

    await page.click('[data-testid="nav-research"]');
    await page.waitForTimeout(300);
    const researchVisible = await page
      .locator("#research")
      .evaluate((el) => el.getBoundingClientRect().top < window.innerHeight && el.getBoundingClientRect().bottom > 0);
    assert.ok(researchVisible, "Research nav did not bring the research section into view");

    const firstTopic = page.locator('[data-testid^="topic-"]').nth(1);
    await firstTopic.click();
    await page.waitForTimeout(200);
    const selectedClass = await firstTopic.getAttribute("class");
    assert.ok(selectedClass?.includes("bg-[#35B5DE]/20"), "Topic pill click did not apply selected styling");

    await page.getByLabel("Search news").first().fill("zzzz-not-a-result");
    const emptyState = page.getByText("No items found for this filter.", { exact: true });
    await emptyState.waitFor({ state: "visible", timeout: 10_000 });

    await page.click('[data-testid="ask-ai-news"]');
    await page.waitForTimeout(200);
    const focusedSearch = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    assert.equal(focusedSearch, "Search news", "Ask AI News did not focus search input");

    const invalidLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'));
      return links.filter((link) => link.target !== "_blank" || !link.rel.includes("noopener")).map((link) => link.href);
    });
    assert.equal(invalidLinks.length, 0, `Some external links are missing target/rel: ${invalidLinks.join(", ")}`);

    console.log("UI smoke checks passed.");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
