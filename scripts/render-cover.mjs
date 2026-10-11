// Rasterize the original vector artwork into a social/arcade-compatible 1200 × 630 PNG.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(
  process.env.PEPE_TOOLCHAIN
    ? path.join(process.env.PEPE_TOOLCHAIN, "package.json")
    : import.meta.url,
);
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const source = await readFile(
    new URL("../src/assets/cover.svg", import.meta.url),
    "utf8",
  );
  const displayFont = await readFile(
    new URL("../src/assets/lilita-one.woff2", import.meta.url),
  );
  const bodyFont = await readFile(
    new URL("../src/assets/nunito-sans.woff2", import.meta.url),
  );
  await page.setContent(
    `<html><head><style>@font-face{font-family:Lilita;src:url(data:font/woff2;base64,${displayFont.toString("base64")})} @font-face{font-family:Nunito;src:url(data:font/woff2;base64,${bodyFont.toString("base64")});font-weight:200 900}body{margin:0}svg{display:block}</style></head><body>${source}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: new URL("../public/cover.png", import.meta.url).pathname,
  });
  console.log(
    "Rendered public/cover.png (1200 × 630) from src/assets/cover.svg.",
  );
} finally {
  await browser.close();
}
