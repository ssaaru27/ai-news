import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { chromium } from "playwright";

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, ".artifacts");
const REFERENCE_PATH = path.join(ROOT, "design", "ui-reference.png");
const CURRENT_PATH = path.join(ARTIFACTS_DIR, "current.png");
const DIFF_PATH = path.join(ARTIFACTS_DIR, "diff.png");

const URL = process.env.UI_DIFF_URL ?? "http://127.0.0.1:4173/";
const SERVER_CMD = process.env.UI_DIFF_SERVER_CMD ?? "corepack pnpm dev --port 4173";
const AUTOSTART = process.env.UI_DIFF_AUTOSTART !== "0";
const TIMEOUT_MS = Number(process.env.UI_DIFF_TIMEOUT_MS ?? "120000");
const VIEWPORT_WIDTH = Number(process.env.UI_DIFF_VIEWPORT_WIDTH ?? "1440");
const VIEWPORT_HEIGHT = Number(process.env.UI_DIFF_VIEWPORT_HEIGHT ?? "900");
const COMPARE_WIDTH = Number(process.env.UI_DIFF_COMPARE_WIDTH ?? "1200");
const COMPARE_HEIGHT = Number(process.env.UI_DIFF_COMPARE_HEIGHT ?? "650");

const DEFAULT_REGION_RATIO = {
  x: 0.0833,
  y: 0.1719,
  width: 0.8333,
  height: 0.5417
};

function parsePng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

function cropPng(source: PNG, x: number, y: number, width: number, height: number): PNG {
  const output = new PNG({ width, height });
  PNG.bitblt(source, output, x, y, width, height, 0, 0);
  return output;
}

function resizeNearest(source: PNG, width: number, height: number): PNG {
  const output = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / width) * source.width));
      const sourceY = Math.min(source.height - 1, Math.floor((y / height) * source.height));
      const srcIdx = (sourceY * source.width + sourceX) * 4;
      const dstIdx = (y * width + x) * 4;
      output.data[dstIdx] = source.data[srcIdx];
      output.data[dstIdx + 1] = source.data[srcIdx + 1];
      output.data[dstIdx + 2] = source.data[srcIdx + 2];
      output.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }
  return output;
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep retrying until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startServer(command: string): ChildProcess {
  return spawn(command, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true
  });
}

async function run(): Promise<void> {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const referenceFile = await fs.readFile(REFERENCE_PATH);
  const referencePng = parsePng(referenceFile);
  const viewport = { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT };

  let serverProcess: ChildProcess | null = null;
  try {
    if (AUTOSTART) {
      serverProcess = startServer(SERVER_CMD);
      await waitForUrl(URL, TIMEOUT_MS);
    }

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport });
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: CURRENT_PATH, fullPage: false });
    await browser.close();

    const currentPng = parsePng(await fs.readFile(CURRENT_PATH));
    const referenceRegion = cropPng(
      referencePng,
      Math.floor(referencePng.width * DEFAULT_REGION_RATIO.x),
      Math.floor(referencePng.height * DEFAULT_REGION_RATIO.y),
      Math.floor(referencePng.width * DEFAULT_REGION_RATIO.width),
      Math.floor(referencePng.height * DEFAULT_REGION_RATIO.height)
    );
    const currentRegion = cropPng(
      currentPng,
      Math.floor(currentPng.width * DEFAULT_REGION_RATIO.x),
      Math.floor(currentPng.height * DEFAULT_REGION_RATIO.y),
      Math.floor(currentPng.width * DEFAULT_REGION_RATIO.width),
      Math.floor(currentPng.height * DEFAULT_REGION_RATIO.height)
    );

    const resizedReference = resizeNearest(referenceRegion, COMPARE_WIDTH, COMPARE_HEIGHT);
    const resizedCurrent = resizeNearest(currentRegion, COMPARE_WIDTH, COMPARE_HEIGHT);
    const diff = new PNG({ width: COMPARE_WIDTH, height: COMPARE_HEIGHT });

    const differentPixels = pixelmatch(
      resizedReference.data,
      resizedCurrent.data,
      diff.data,
      COMPARE_WIDTH,
      COMPARE_HEIGHT,
      {
        threshold: 0.14,
        includeAA: true
      }
    );

    await fs.writeFile(DIFF_PATH, PNG.sync.write(diff));

    const totalPixels = COMPARE_WIDTH * COMPARE_HEIGHT;
    const diffPercent = (differentPixels / totalPixels) * 100;

    console.log(`Reference: ${REFERENCE_PATH}`);
    console.log(`Current:   ${CURRENT_PATH}`);
    console.log(`Diff:      ${DIFF_PATH}`);
    console.log(`Viewport:  ${viewport.width}x${viewport.height}`);
    console.log(`Compare:   ${COMPARE_WIDTH}x${COMPARE_HEIGHT} (cropped region, normalized)`);
    console.log(`Difference ${diffPercent.toFixed(2)}% (${differentPixels}/${totalPixels} pixels)`);
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
