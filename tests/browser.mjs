// A bounded production-export check. The server and browsers close in finally.
// PEPE_TOOLCHAIN lets a restricted worker keep installed dependencies outside the repo.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(
  process.env.PEPE_TOOLCHAIN
    ? path.join(process.env.PEPE_TOOLCHAIN, "package.json")
    : import.meta.url,
);
const { chromium, expect } = require("@playwright/test");
const { default: AxeBuilder } = require("@axe-core/playwright");
const root = process.cwd(),
  results = [];
const evidence = {
  browser: "",
  checks: results,
  consoleErrors: [],
  failedRequests: [],
  accessibility: [],
  layouts: [],
  audio: {},
  bridge: {},
  contrast: [],
  resultLayouts: [],
  pauseLayouts: [],
  readyInput: [],
};
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
const hostHtml = `<!doctype html><html lang="en"><title>Opaque iframe test host</title><link rel="icon" href="/preview/favicon.svg"><body style="margin:0"><iframe title="PEPE Ladder" id="game" sandbox="allow-scripts allow-pointer-lock" src="/preview/index.html" style="width:100vw;height:100vh;border:0"></iframe><script>window.messages=[];addEventListener('message',e=>{if(e.source===document.querySelector('iframe').contentWindow)messages.push(e.data)});window.send=(message)=>document.querySelector('iframe').contentWindow.postMessage(message,'*');</script></body></html>`;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/host.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(hostHtml);
      return;
    }
    if (!url.pathname.startsWith("/preview/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    const rel =
      decodeURIComponent(url.pathname.slice("/preview/".length)) ||
      "index.html";
    const file = path.resolve(root, "dist", rel);
    if (!file.startsWith(path.resolve(root, "dist") + path.sep))
      throw Error("Path");
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await mkdir(path.join(root, "artifacts"), { recursive: true });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
evidence.browser = browser.version();
function watch(page, name) {
  page.on("pageerror", (e) =>
    evidence.consoleErrors.push(`${name}: ${e.message}`),
  );
  page.on("console", (m) => {
    if (m.type() === "error")
      evidence.consoleErrors.push(`${name}: ${m.text()}`);
  });
  page.on("requestfailed", (r) =>
    evidence.failedRequests.push(
      `${name}: ${r.url()} ${r.failure()?.errorText}`,
    ),
  );
}
async function check(name, fn) {
  await fn();
  results.push({ name, result: "pass" });
  console.log(`PASS ${name}`);
}
async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: path.join(root, "artifacts", name), fullPage });
}
async function scan(page, state) {
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = scan.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  }));
  evidence.accessibility.push({
    state,
    violations,
    incomplete: scan.incomplete.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
  assert.equal(violations.length, 0, JSON.stringify(violations, null, 2));
}
async function modalPaintOrder(page, selector) {
  const samples = await page.evaluate((selector) => {
    const controls = document.querySelector("#game-controls"),
      wasInert = controls.inert;
    // Inert hides underlying controls from hit testing, even if they paint above
    // a dialog. Make them hit-testable for this synchronous probe, then restore.
    controls.inert = false;
    try {
      return [...document.querySelectorAll(`${selector} button`)].map((button) => {
        const b = button.getBoundingClientRect();
        const hits = [0.2, 0.5, 0.8].flatMap((x) =>
          [0.2, 0.5, 0.8].map((y) =>
            button.contains(document.elementFromPoint(b.x + b.width * x, b.y + b.height * y)),
          ),
        );
        return { button: button.id, hits };
      });
    } finally {
      controls.inert = wasInert;
    }
  }, selector);
  for (const sample of samples)
    assert.ok(sample.hits.every(Boolean), `${sample.button} paints behind a background control: ${JSON.stringify(samples)}`);
  return samples;
}
async function layout(page, width, height, state) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(120);
  const data = await page.evaluate(() => {
    const c = document.querySelector("#play-button").getBoundingClientRect(),
      b = document.querySelector("#bank-button").getBoundingClientRect();
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      startVisible: c.bottom > 0 && c.bottom <= innerHeight,
      bankBottom: b.bottom,
      loadedFonts: [
        document.fonts.check("16px Nunito"),
        document.fonts.check("32px Lilita"),
      ],
    };
  });
  evidence.layouts.push({ width, height, state, ...data });
  assert.ok(data.scrollWidth <= width, `Overflow at ${width}`);
  if (state === "ready")
    assert.ok(data.startVisible, `Start below fold at ${width}`);
  if (state === "playing")
    assert.ok(data.bankBottom <= height, `BANK below fold at ${width}`);
}
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await desktop.newPage();
  watch(page, "desktop");
  await page.addInitScript(() => {
    let seed = 52;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    window.__audio = {
      created: 0,
      resumed: 0,
      oscillators: 0,
      heartbeatNotes: 0,
    };
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(...args) {
        super(...args);
        window.__audio.created++;
        window.__context = this;
      }
      resume() {
        window.__audio.resumed++;
        return super.resume();
      }
      createOscillator() {
        window.__audio.oscillators++;
        const oscillator = super.createOscillator();
        const original = oscillator.frequency.setValueAtTime.bind(
          oscillator.frequency,
        );
        oscillator.frequency.setValueAtTime = (frequency, time) => {
          if (frequency === 58 || frequency === 52)
            window.__audio.heartbeatNotes++;
          return original(frequency, time);
        };
        return oscillator;
      }
    };
  });
  await page.goto(`${base}/preview/index.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.clock.install();
  await check("metadata, local fonts, cover and manifest", async () => {
    assert.match(await page.title(), /PEPE Ladder/);
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:image"]',
      'link[rel="icon"]',
    ])
      await expect(page.locator(selector)).toHaveCount(1);
    const manifest = await (
      await fetch(`${base}/preview/pepe-game.json`)
    ).json();
    assert.equal(manifest.schemaVersion, "pepe-browser-game/1");
    assert.equal(manifest.players, 1);
    for (const rel of [manifest.entry, manifest.cover])
      assert.equal((await fetch(`${base}/preview/${rel}`)).status, 200);
    assert.ok(
      (
        await page.evaluate(() => [
          document.fonts.check("16px Nunito"),
          document.fonts.check("32px Lilita"),
        ])
      ).every(Boolean),
    );
  });
  await check("desktop initial accessibility scan", () =>
    scan(page, "desktop ready"),
  );
  await check("desktop and narrow initial layouts", async () => {
    for (const [w, h] of [
      [1440, 1080],
      [1024, 900],
      [820, 1000],
      [390, 844],
      [320, 740],
    ])
      await layout(page, w, h, "ready");
    await page.setViewportSize({ width: 1440, height: 1080 });
    await shot(page, "desktop.png", true);
  });
  await check("no audio before a user gesture", async () => {
    assert.equal(await page.evaluate(() => window.__audio.created), 0);
  });
  await check("keyboard-only entry and visible focus", async () => {
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#play-button")).toBeFocused();
    assert.equal(
      await page
        .locator("#play-button")
        .evaluate((el) => getComputedStyle(el).outlineStyle),
      "solid",
    );
    await shot(page, "keyboard-focus.png");
    await page.keyboard.press("Enter");
    await expect(page.locator("#intro")).toBeHidden();
    await expect(page.locator("#pond")).toBeFocused();
  });
  await check("arrow keys, Space and banking with B", async () => {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Space");
    await page.clock.runFor(660);
    await expect(page.locator("#height")).toHaveText("1");
    await expect(page.locator("#pot")).toHaveText("100");
    await page.keyboard.press("b");
    await page.clock.runFor(100);
    await expect(page.locator("#score")).toHaveText("125");
    await expect(page.locator("#pot")).toHaveText("0");
    await expect(page.locator("#multiplier")).toHaveText("×1");
  });
  await check("A/D and W, combo growth, Enter banks in midair", async () => {
    await page.keyboard.press("d");
    await page.keyboard.press("w");
    await page.clock.runFor(660);
    await expect(page.locator("#height")).toHaveText("2");
    await expect(page.locator("#pot")).toHaveText("100");
    const side = (await page.locator("#pad-status").innerText()).includes(
      "left",
    )
      ? "a"
      : "d";
    await page.keyboard.press(side);
    await page.keyboard.press("w");
    await page.keyboard.press("Enter");
    await page.clock.runFor(660);
    await expect(page.locator("#score")).toHaveText("225");
    await expect(page.locator("#height")).toHaveText("3");
  });
  await check(
    "audio starts only after toggle gesture and creates procedural notes",
    async () => {
      await page.locator("#sound-button").click();
      await page.clock.runFor(500);
      assert.equal(
        await page.locator("#sound-button").getAttribute("aria-pressed"),
        "true",
      );
      const audio = await page.evaluate(() => ({
        ...window.__audio,
        state: window.__context?.state,
      }));
      evidence.audio = audio;
      assert.equal(audio.created, 1);
      assert.equal(audio.state, "running");
      assert.ok(audio.oscillators > 0);
    },
  );
  await check(
    "mute suspends audio and a new gesture resumes the same context",
    async () => {
      await page.locator("#sound-button").click();
      await expect
        .poll(() => page.evaluate(() => window.__context.state))
        .toBe("suspended");
      const count = await page.evaluate(() => window.__audio.oscillators);
      await page.clock.runFor(300);
      assert.equal(
        await page.evaluate(() => window.__audio.oscillators),
        count,
      );
      await page.locator("#sound-button").click();
      await expect
        .poll(() => page.evaluate(() => window.__context.state))
        .toBe("running");
      evidence.audio = await page.evaluate(() => ({
        ...window.__audio,
        state: window.__context.state,
      }));
      assert.equal(evidence.audio.created, 1);
      assert.ok(evidence.audio.resumed >= 1);
    },
  );
  await check(
    "P pause freezes timer and gameplay, traps focus, Escape resumes",
    async () => {
      await page.keyboard.press("p");
      await expect(page.locator("#pause-overlay")).toBeVisible();
      await expect(page.locator("#resume-button")).toBeFocused();
      const timer = await page.locator("#timer").textContent(),
        height = await page.locator("#height").textContent(),
        nodes = await page.evaluate(() => window.__audio.oscillators);
      await page.clock.runFor(3000);
      assert.equal(await page.locator("#timer").textContent(), timer);
      assert.equal(await page.locator("#height").textContent(), height);
      assert.equal(
        await page.evaluate(() => window.__audio.oscillators),
        nodes,
      );
      await page.keyboard.press("Shift+Tab");
      await expect(page.locator("#pause-restart")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator("#resume-button")).toBeFocused();
      await shot(page, "paused.png");
      await scan(page, "desktop paused");
      await page.keyboard.press("Escape");
      await expect(page.locator("#pause-overlay")).toBeHidden();
    },
  );
  await check(
    "short desktop and landscape gameplay keeps BANK visible",
    async () => {
      await page.keyboard.press("p");
      for (const [width, height] of [
        [1440, 900],
        [1024, 768],
        [844, 390],
      ])
        await layout(page, width, height, "playing");
      await page.setViewportSize({ width: 1440, height: 1080 });
      await page.keyboard.press("p");
      await shot(page, "desktop-playing.png");
    },
  );
  await check("fall, near-miss, best records and one-tap restart", async () => {
    await page.clock.runFor(6000);
    await expect(page.locator("#over-overlay")).toBeVisible();
    await expect(page.locator("#final-score")).toHaveText("225");
    await expect(page.locator("#loss-message")).toContainText("Lost 100");
    await expect(page.locator("#result-best")).toHaveText("225");
    await expect(page.locator("#restart-button")).toBeFocused();
    await shot(page, "game-over.png");
    await scan(page, "desktop game over");
    await page.locator("#restart-button").click();
    await expect(page.locator("#over-overlay")).toBeHidden();
    await expect(page.locator("#height")).toHaveText("0");
    await expect(page.locator("#score")).toHaveText("0");
    await expect(page.locator("#pause-button")).toBeEnabled();
  });
  await check("visibility loss pauses and never auto-resumes", async () => {
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator("#pause-overlay")).toBeVisible();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator("#pause-overlay")).toBeVisible();
    await page.locator("#resume-button").click();
  });
  await check(
    "sound preference and records survive reload, without daily streak inflation",
    async () => {
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("#best-score")).toHaveText("225");
      await expect(page.locator("#daily-streak")).toHaveText("1 day");
      assert.equal(
        await page.locator("#sound-button").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await page.evaluate(() => window.__audio.created), 0);
    },
  );
  await check("measured opaque UI contrast pairs", async () => {
    await page.mouse.move(0, 0);
    await page.clock.runFor(160);
    evidence.contrast = await page.evaluate(() => {
      const lum = (color) => {
        const channels = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((n) => {
            n /= 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      };
      return [
        ["body text", ".how-list h3", ".how-card"],
        ["secondary text", ".how-list p", ".how-card"],
        ["score value", "#score", ".scoreboard"],
        ["gold pot", "#pot", ".scoreboard"],
        ["primary action", "#play-button", "#play-button"],
      ].map(([name, fg, bg]) => {
        const foreground = getComputedStyle(document.querySelector(fg)).color,
          background = getComputedStyle(
            document.querySelector(bg),
          ).backgroundColor,
          a = lum(foreground),
          b = lum(background);
        return {
          name,
          foreground,
          background,
          ratio: +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(
            2,
          ),
        };
      });
    });
    for (const pair of evidence.contrast)
      assert.ok(pair.ratio >= 4.5, JSON.stringify(pair));
  });
  await check(
    "a high combo grows the pot and activates the heartbeat",
    async () => {
      await page.locator("#play-button").click();
      for (let height = 1; height <= 14; height++) {
        const status = await page.locator("#pad-status").innerText();
        await page.keyboard.press(
          status.toLowerCase().includes("left") ? "ArrowLeft" : "ArrowRight",
        );
        await page.keyboard.press("Space");
        await page.clock.runFor(680);
        await expect(page.locator("#height")).toHaveText(String(height));
      }
      await expect(page.locator("#multiplier")).toHaveText("×8");
      const pot = Number(
        (await page.locator("#pot").innerText()).replaceAll(",", ""),
      );
      assert.ok(pot >= 2000);
      assert.ok(await page.evaluate(() => window.__audio.heartbeatNotes > 0));
      evidence.audio.highPot = pot;
      evidence.audio.heartbeatNotes = await page.evaluate(
        () => window.__audio.heartbeatNotes,
      );
      await shot(page, "high-combo.png");
      await page.keyboard.press("p");
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
    },
  );
  await check("200% text enlargement reflow", async () => {
    await page.setViewportSize({ width: 820, height: 1000 });
    await page.addStyleTag({ content: "html{font-size:32px!important}" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.ok(
      await page
        .locator("#play-button")
        .evaluate(
          (el) =>
            el.getBoundingClientRect().bottom <=
            document.querySelector(".pond-wrap").getBoundingClientRect().bottom,
        ),
    );
    await shot(page, "text-enlargement.png", true);
  });
  await desktop.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  watch(phone, "mobile");
  await phone.goto(`${base}/preview/index.html`);
  await phone.evaluate(() => document.fonts.ready);
  await phone.clock.install();
  await check(
    "390-pixel first screen contains product and primary action",
    async () => {
      await layout(phone, 390, 844, "ready");
      await shot(phone, "mobile.png", true);
      await scan(phone, "mobile ready");
    },
  );
  await check("touch left pond, right control, and BANK", async () => {
    await phone.locator("#play-button").tap();
    const bounds = await phone.locator("#pond").boundingBox();
    await phone.touchscreen.tap(
      bounds.x + bounds.width * 0.25,
      bounds.y + bounds.height * 0.6,
    );
    await phone.clock.runFor(660);
    await expect(phone.locator("#height")).toHaveText("1");
    await phone.locator("#hop-right").tap();
    await phone.clock.runFor(660);
    await expect(phone.locator("#height")).toHaveText("2");
    await expect(phone.locator("#multiplier")).toHaveText("×2");
    await expect(phone.locator("#pot")).toHaveText("300");
    await shot(phone, "mobile-playing.png");
    await phone.locator("#bank-button").tap();
    await phone.clock.runFor(100);
    await expect(phone.locator("#score")).toHaveText("325");
    await expect(phone.locator("#pot")).toHaveText("0");
  });
  await check(
    "touch pause/resume and short viewport controls remain reachable",
    async () => {
      await phone.locator("#pause-button").tap();
      await expect(phone.locator("#pause-overlay")).toBeVisible();
      await phone.locator("#resume-button").tap();
      for (const [w, h] of [
        [390, 844],
        [320, 568],
        [540, 720],
      ])
        await layout(phone, w, h, "playing");
      await phone.setViewportSize({ width: 390, height: 844 });
    },
  );
  await check("touch game over and one-tap restart", async () => {
    await phone.clock.runFor(6500);
    await expect(phone.locator("#over-overlay")).toBeVisible();
    await phone.locator("#restart-button").tap();
    await expect(phone.locator("#height")).toHaveText("0");
    await expect(phone.locator("#over-overlay")).toBeHidden();
  });
  await check(
    "reduced-motion removes button scaling and retains functional controls",
    async () => {
      await phone.emulateMedia({ reducedMotion: "reduce" });
      await phone.locator("#pause-button").tap();
      assert.equal(
        await phone
          .locator("#resume-button")
          .evaluate((el) => getComputedStyle(el).transitionDuration),
        "0s",
      );
      await phone.locator("#resume-button").tap();
      await phone.locator("#hop-left").tap();
      await phone.clock.runFor(660);
      await expect(phone.locator("#height")).toHaveText("1");
    },
  );
  await mobile.close();
  for (const [width, height] of [
    [320, 568],
    [390, 568],
    [540, 650],
    [390, 844],
    [1440, 900],
    [1366, 657],
    [1280, 720],
    [1366, 768],
    [1024, 768],
    [1440, 790],
    [844, 390],
    [667, 375],
    [960, 540],
    [1024, 600],
    [1280, 800],
    [1440, 801],
    [1440, 848],
    [1440, 850],
    [1440, 851],
    [541, 650],
    [1920, 1080],
  ]) {
    await check(`game-over content and one-tap restart at ${width}×${height}`, async () => {
      const touch = width <= 540 || (width <= 900 && height < 500);
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: touch,
        hasTouch: touch,
      });
      try {
        const resultPage = await context.newPage();
        watch(resultPage, `result ${width}×${height}`);
        await resultPage.goto(`${base}/preview/index.html`);
        await resultPage.evaluate(() => document.fonts.ready);
        await resultPage.clock.install();
        const activate = async (id) => {
          if (touch) await resultPage.locator(id).tap();
          else await resultPage.locator(id).click();
        };
        const activateAtCenter = async (id) => {
          // Raw coordinates cannot auto-scroll a clipped action into view.
          const box = await resultPage.locator(id).boundingBox();
          assert.ok(box);
          const x = box.x + box.width / 2, y = box.y + box.height / 2;
          if (touch) await resultPage.touchscreen.tap(x, y);
          else await resultPage.mouse.click(x, y);
        };
        await activate("#play-button");
        const bankBox = await resultPage.locator("#bank-button").boundingBox();
        assert.ok(bankBox.y >= 0 && bankBox.y + bankBox.height <= height);
        await activate("#pause-button");
        await expect(resultPage.locator("#resume-button")).toBeFocused();
        const pauseMetrics = await resultPage.evaluate(() => {
          const card = document.querySelector("#pause-overlay .overlay-card"), rect = card.getBoundingClientRect();
          return {
            clientHeight: card.clientHeight, scrollHeight: card.scrollHeight, scrollTop: card.scrollTop,
            content: ["#pause-title", "#resume-button", "#pause-restart"].map(selector => {
              const el = document.querySelector(selector), b = el.getBoundingClientRect();
              return {selector, height:b.height, visibleHeight:Math.max(0, Math.min(b.bottom,rect.bottom-1,innerHeight)-Math.max(b.top,rect.top+1,0)), hit:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};
            }),
          };
        });
        pauseMetrics.paintOrder = await modalPaintOrder(resultPage, "#pause-overlay");
        evidence.pauseLayouts.push({width,height,...pauseMetrics});
        assert.equal(pauseMetrics.scrollTop, 0);
        assert.equal(pauseMetrics.scrollHeight, pauseMetrics.clientHeight);
        for (const item of pauseMetrics.content) {
          assert.ok(item.visibleHeight >= item.height - 0.5, `${item.selector} clipped at ${width}×${height}`);
          assert.ok(item.hit, `${item.selector} is obscured`);
        }
        await resultPage.keyboard.press("Shift+Tab");
        await expect(resultPage.locator("#pause-restart")).toBeFocused();
        await resultPage.keyboard.press("Tab");
        await expect(resultPage.locator("#resume-button")).toBeFocused();
        await activateAtCenter("#pause-restart");
        await expect(resultPage.locator("#pause-overlay")).toBeHidden();
        await expect(resultPage.locator("#pond")).toBeFocused();
        // Exercise both the extra new-best line and the unbanked near-miss copy.
        for (const banked of [true, false]) {
          await activate("#hop-left");
          await expect(resultPage.locator("#pond")).toBeFocused();
          await resultPage.clock.runFor(680);
          if (banked) await activate("#bank-button");
          await resultPage.clock.runFor(5500);
          await expect(resultPage.locator("#over-overlay")).toBeVisible();
          await expect(resultPage.locator("#final-score")).toHaveText(banked ? "125" : "0");
          await expect(resultPage.locator("#result-best")).toHaveText("125");
          await expect(resultPage.locator("#result-height")).toHaveText("1 m");
          await expect(resultPage.locator("#result-streak")).toHaveText("1 day");
          if (banked) await expect(resultPage.locator("#new-best")).toBeVisible();
          else await expect(resultPage.locator("#loss-message")).toHaveText("Lost 100 — 1 pad from ×2.");
          await expect(resultPage.locator("#restart-button")).toBeFocused();
          // Measure before activating: locator clicks can scroll a clipped control into view.
          const metrics = await resultPage.evaluate(() => {
            const card = document.querySelector(".result-card"),
              rect = card.getBoundingClientRect();
            const content = ["#over-title", "#loss-message", "#final-score", "#result-best", "#result-height", "#result-streak", "#restart-button", "#run-detail"]
              .map((selector) => {
                const b = document.querySelector(selector).getBoundingClientRect();
                return { selector, height: b.height, visibleHeight: Math.max(0, Math.min(b.bottom, rect.bottom - 1, innerHeight) - Math.max(b.top, rect.top + 1, 0)), hit: document.querySelector(selector).contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)) };
              });
            return {
              clientHeight: card.clientHeight,
              scrollHeight: card.scrollHeight,
              scrollTop: card.scrollTop,
              horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
              frogVisible: document.querySelector(".result-frog").checkVisibility(),
              content,
            };
          });
          metrics.paintOrder = await modalPaintOrder(resultPage, "#over-overlay");
          evidence.resultLayouts.push({ width, height, banked, ...metrics });
          assert.equal(metrics.scrollTop, 0);
          assert.equal(metrics.scrollHeight, metrics.clientHeight, "Result card must fit without scrolling");
          assert.equal(metrics.horizontalOverflow, false);
          assert.equal(metrics.frogVisible, height > 650);
          for (const item of metrics.content) {
            assert.ok(item.visibleHeight >= item.height - 0.5, `${item.selector} clipped at ${width}×${height}: ${JSON.stringify(item)}`);
            assert.ok(item.hit, `${item.selector} is obscured at ${width}×${height}`);
          }
          if (banked && (height === 568 || width === 1366 && height === 657 || width === 844 && height === 390))
            await shot(resultPage, `result-${width}-${height}.png`);
          await activateAtCenter("#restart-button");
          await expect(resultPage.locator("#over-overlay")).toBeHidden();
          await expect(resultPage.locator("#height")).toHaveText("0");
          await expect(resultPage.locator("#score")).toHaveText("0");
          await expect(resultPage.locator("#pond")).toBeFocused();
        }
      } finally {
        await context.close();
      }
    });
  }
  await check("ready-screen pointer Sound preserves Space/Enter start and keyboard activation", async () => {
    for (const key of ["Space", "Enter"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        const ready = await context.newPage();
        watch(ready, `ready Sound ${key}`);
        await ready.goto(`${base}/preview/index.html`);
        await ready.clock.install();
        await ready.locator("#sound-button").click();
        await expect(ready.locator("#sound-button")).toHaveAttribute("aria-pressed", "true");
        await expect(ready.locator("#pond")).toBeFocused();
        await ready.keyboard.press(key);
        await expect(ready.locator("#intro")).toBeHidden();
        await expect(ready.locator("#pause-button")).toBeEnabled();
        await expect(ready.locator("#sound-button")).toHaveAttribute("aria-pressed", "true");
        await expect(ready.locator("#pond")).toBeFocused();
        evidence.readyInput.push({key, started:true, soundEnabled:true, focus:"pond"});
        // On the ready screen, a button reached with Tab must still activate natively.
        await ready.reload();
        await ready.locator("#pond").focus();
        await ready.keyboard.press("Tab");
        await expect(ready.locator("#sound-button")).toBeFocused();
        await ready.keyboard.press(key);
        await expect(ready.locator("#sound-button")).toHaveAttribute("aria-pressed", "false");
        await expect(ready.locator("#sound-button")).toBeFocused();
        await expect(ready.locator("#intro")).toBeVisible();
      } finally {
        await context.close();
      }
    }
  });
  await check("pointer controls hand the next keyboard hop/bank back to the pond", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
      const mixed = await context.newPage();
      watch(mixed, "mixed input");
      const freshRun = async () => {
        await mixed.goto(`${base}/preview/index.html`);
        await mixed.clock.install();
        await mixed.locator("#play-button").click();
      };
      await freshRun();
      await mixed.locator("#hop-left").click();
      await expect(mixed.locator("#pond")).toBeFocused();
      await mixed.clock.runFor(680);
      await mixed.keyboard.press("ArrowRight");
      await mixed.keyboard.press("Space");
      await mixed.clock.runFor(680);
      await expect(mixed.locator("#height")).toHaveText("2");
      await expect(mixed.locator("#pot")).toHaveText("300");

      await freshRun();
      await mixed.locator("#sound-button").click();
      await expect(mixed.locator("#pond")).toBeFocused();
      const sound = await mixed.locator("#sound-button").getAttribute("aria-pressed");
      await mixed.keyboard.press("ArrowLeft");
      await mixed.keyboard.press("Space");
      await mixed.clock.runFor(680);
      await expect(mixed.locator("#height")).toHaveText("1");
      await expect(mixed.locator("#sound-button")).toHaveAttribute("aria-pressed", sound);
      await mixed.locator("#sound-button").click();
      const toggled = await mixed.locator("#sound-button").getAttribute("aria-pressed");
      await mixed.keyboard.press("Enter");
      await expect(mixed.locator("#score")).toHaveText("125");
      await expect(mixed.locator("#pot")).toHaveText("0");
      await expect(mixed.locator("#sound-button")).toHaveAttribute("aria-pressed", toggled);

      await freshRun();
      await mixed.locator("#hop-left").click();
      await mixed.clock.runFor(680);
      await mixed.locator("#bank-button").click();
      await expect(mixed.locator("#pond")).toBeFocused();
      await mixed.keyboard.press("ArrowRight");
      await mixed.keyboard.press("Space");
      await mixed.clock.runFor(680);
      await expect(mixed.locator("#height")).toHaveText("2");
      await expect(mixed.locator("#score")).toHaveText("125");
      await expect(mixed.locator("#pot")).toHaveText("100");

      await freshRun();
      await mixed.locator("#hop-left").click();
      await mixed.clock.runFor(680);
      await mixed.locator("#hop-right").click();
      await expect(mixed.locator("#pond")).toBeFocused();
      await mixed.clock.runFor(680);
      const direction = (await mixed.locator("#pad-status").innerText()).includes("left") ? "ArrowLeft" : "ArrowRight";
      await mixed.keyboard.press(direction);
      await mixed.keyboard.press("Space");
      await mixed.clock.runFor(680);
      await expect(mixed.locator("#height")).toHaveText("3");
    } finally {
      await context.close();
    }
  });
  await check("Tab-reached buttons retain native Space/Enter activation and focus", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
      const keys = await context.newPage();
      watch(keys, "native buttons");
      await keys.goto(`${base}/preview/index.html`);
      await keys.clock.install();
      await keys.locator("#play-button").click();
      await keys.keyboard.press("Tab");
      await expect(keys.locator("#sound-button")).toBeFocused();
      await keys.keyboard.press("Space");
      await expect(keys.locator("#sound-button")).toHaveAttribute("aria-pressed", "true");
      await expect(keys.locator("#sound-button")).toBeFocused();
      await keys.keyboard.press("Enter");
      await expect(keys.locator("#sound-button")).toHaveAttribute("aria-pressed", "false");
      await expect(keys.locator("#sound-button")).toBeFocused();
      await keys.keyboard.press("Tab");
      await keys.keyboard.press("Tab");
      await expect(keys.locator("#hop-left")).toBeFocused();
      await keys.keyboard.press("Space");
      await keys.clock.runFor(680);
      await expect(keys.locator("#height")).toHaveText("1");
      await expect(keys.locator("#hop-left")).toBeFocused();
      await keys.keyboard.press("Tab");
      await expect(keys.locator("#bank-button")).toBeFocused();
      await keys.keyboard.press("Enter");
      await expect(keys.locator("#score")).toHaveText("125");
      await expect(keys.locator("#pot")).toHaveText("0");
    } finally {
      await context.close();
    }
  });
  const sandbox = await browser.newContext({
    viewport: { width: 1100, height: 950 },
  });
  const host = await sandbox.newPage();
  watch(host, "opaque iframe");
  await host.goto(`${base}/host.html`);
  const frame = host.frameLocator("#game");
  await expect(frame.locator("#play-button")).toBeVisible();
  await host.clock.install();
  await check(
    "sandbox without same-origin storage renders local fonts and plays",
    async () => {
      await expect(frame.locator("#storage-note")).toHaveText(
        "Session records only. Storage is unavailable.",
      );
      const data = await frame.locator("body").evaluate(() => {
        let denied = false;
        try {
          localStorage.getItem("probe");
        } catch {
          denied = true;
        }
        return {
          denied,
          fonts: [
            document.fonts.check("16px Nunito"),
            document.fonts.check("32px Lilita"),
          ],
        };
      });
      assert.ok(data.denied);
      assert.ok(data.fonts.every(Boolean));
      evidence.bridge.storageDenied = data.denied;
      await frame.locator("#play-button").click();
      await frame.locator("#hop-left").click();
      await host.clock.runFor(660);
      await expect(frame.locator("#pot")).toHaveText("100");
    },
  );
  await check(
    "bridge validates source, protocol and channel; init replies ready",
    async () => {
      await host.evaluate(() =>
        send({
          protocol: "pepe-game/1",
          type: "init",
          channel: "test-channel",
        }),
      );
      await expect.poll(() => host.evaluate(() => messages.length)).toBe(1);
      assert.deepEqual(await host.evaluate(() => messages[0]), {
        protocol: "pepe-game/1",
        type: "ready",
        channel: "test-channel",
      });
      await host.evaluate(() =>
        send({
          protocol: "pepe-game/1",
          type: "pause",
          channel: "wrong-channel",
        }),
      );
      await expect(frame.locator("#pause-overlay")).toBeHidden();
      await host.evaluate(() =>
        send({
          protocol: "bad-protocol",
          type: "pause",
          channel: "test-channel",
        }),
      );
      await expect(frame.locator("#pause-overlay")).toBeHidden();
      await frame
        .locator("body")
        .evaluate(() =>
          window.postMessage(
            { protocol: "pepe-game/1", type: "pause", channel: "test-channel" },
            "*",
          ),
        );
      await expect(frame.locator("#pause-overlay")).toBeHidden();
      await host.evaluate(() =>
        send({
          protocol: "pepe-game/1",
          type: "pause",
          channel: "test-channel",
        }),
      );
      await expect(frame.locator("#pause-overlay")).toBeVisible();
      const timer = await frame.locator("#timer").textContent();
      await host.clock.runFor(1500);
      assert.equal(await frame.locator("#timer").textContent(), timer);
      await host.evaluate(() =>
        send({
          protocol: "pepe-game/1",
          type: "resume",
          channel: "test-channel",
        }),
      );
      await expect(frame.locator("#pause-overlay")).toBeHidden();
    },
  );
  await check(
    "bridge sends a finite integer game-over score only on the negotiated channel",
    async () => {
      await frame.locator("#bank-button").click();
      await host.clock.runFor(6000);
      await expect(frame.locator("#over-overlay")).toBeVisible();
      await expect
        .poll(() =>
          host.evaluate(
            () => messages.filter((m) => m.type === "score").length,
          ),
        )
        .toBe(1);
      const message = await host.evaluate(() =>
        messages.find((m) => m.type === "score"),
      );
      assert.deepEqual(message, {
        protocol: "pepe-game/1",
        type: "score",
        channel: "test-channel",
        score: 125,
      });
      evidence.bridge.messages = await host.evaluate(() => messages);
      await shot(host, "sandbox.png");
    },
  );
  await sandbox.close();
  await check(
    "no JavaScript errors, console errors or failed resource requests",
    async () => {
      assert.deepEqual(evidence.consoleErrors, []);
      assert.deepEqual(evidence.failedRequests, []);
    },
  );
  console.log(`\n${results.length} browser checks passed.`);
} catch (error) {
  results.push({
    name: "Interrupted check",
    result: "fail",
    message: error.message,
  });
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile(
    path.join(root, "artifacts/browser-results.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
