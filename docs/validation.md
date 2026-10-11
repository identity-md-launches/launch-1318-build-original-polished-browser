# PEPE Ladder — validation and design review

**Completion: Complete for the stated build scope.** These are the worker's observations and tests, not an independent certification. The website and static export are complete. Hosting, release submission and administrative approval are outside this build and have not occurred.

## Scope and assumptions

Reviewed the single-page game in ready, playing, high-combo, banking, paused and game-over states. The delivered runtime is `dist/`, served under a real `/preview/` subpath for tests. The root source is Vite + TypeScript with Canvas 2D and native HTML controls. No app framework or backend is required.

Consequential design decisions: the ladder generates indefinitely but a run ends at the 75-second moonset; a fall may end it earlier. One pad equals one metre. Local-calendar streaks reward the first bank of every run, capped at a seven-day bonus. Denied browser storage uses session memory, with a visible explanation. The page offers English and a single night theme. There are no account, payment, form, remote leaderboard, theme-switcher or localization flows to review.

The pinned Better Interface workflow and the core principles of all six domains were read and applied during construction. Documentation follows its implementation-based design method. The template's AGENTS.md and INTEGRATION.md were read as task data; no coordinator job, release helper or publishing command was run.

## Verification performed

Environment: Node 24.9.0, npm 11.6.0, TypeScript 5.9.3, Vite 7.1.9, Playwright 1.56.1, Chromium 141.0.7390.37, axe-core integration 4.11.0. Dependencies and browser binaries were installed in `/tmp`, not the repository. The supplied MCP browser could not launch because its configured chrome-for-testing binary was absent. This was resolved for validation by installing Chromium under `/tmp` and using a bounded Playwright script with its own server. Every browser session and server was closed.

Actual final checks:

| Command                                                                                                    | Actual result                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PATH="/tmp/pepe-ladder-tools/node_modules/.bin:$PATH" npm run typecheck`                                  | Exit 0, no diagnostics                                                                                 |
| `PATH="/tmp/pepe-ladder-tools/node_modules/.bin:$PATH" npm run build`                                      | Exit 0; 9 modules transformed; complete export generated                                               |
| `npm test`                                                                                                 | Exit 0; 14 tests passed, 0 failed                                                                      |
| `PEPE_TOOLCHAIN=/tmp/pepe-ladder-tools PLAYWRIGHT_BROWSERS_PATH=/tmp/pepe-playwright npm run test:browser` | Exit 0; 26 production-browser checks passed                                                            |
| `PEPE_TOOLCHAIN=/tmp/pepe-ladder-tools PLAYWRIGHT_BROWSERS_PATH=/tmp/pepe-playwright npm run cover`        | Exit 0; original cover rasterized at 1200×630; visually inspected and included in the subsequent build |

The final tests exercise:

- Directional hops with arrows, A/D, Space and W; normal button keyboard activation; BANK using B and Enter, including banking in flight.
- Real emulated touch events on the left half of the pond, the right hop control, BANK, pause, resume and instant restart.
- Combo accumulation/reset, a ×8 live run, golden fly pot doubling, banked/unbanked separation, fall/game over, near-miss copy and personal records.
- Pad lifetimes, increasing drift, narrow platforms, ladder generation to 60 pads, moonset loss, banking just before a splash and pause freezing all physics clocks.
- Sound starts without autoplay, explicit enable/mute/resume, preference persistence and no audio context before a gesture, even with a saved sound preference. The browser checked a running audio context and oscillator scheduling. A high-pot run reached 18,450 and scheduled 14 heartbeat notes. Sound was not subjectively auditioned.
- Pause/resume by P/Escape, Tab wrapping inside dialogs, inert background, visible keyboard focus, visibility-loss pause and no automatic visibility-return resume.
- Corrupt records, storage denial, same-day streak stability, consecutive-day/month/leap-day transitions and missed-day reset.
- A real `sandbox="allow-scripts allow-pointer-lock"` iframe with no same-origin permission and **no CORS headers**: fonts and game load, storage denial is caught, `init` → `ready`, wrong source/protocol/channel ignored, valid pause/resume handled, one `{ protocol: 'pepe-game/1', type: 'score', channel: 'test-channel', score: 125 }` sent on game over.
- Metadata, manifest entry/cover availability, local fonts and relative paths under `/preview/`.

Runtime results: **0 JavaScript errors, 0 console errors, 0 failed resource requests** in the tested flows. All 26 named checks, layout measurements, audio observations and incomplete accessibility items are preserved in [`browser-results.json`](browser-results.json).

A deterministic engine simulation of 100 correct-direction runs with a 0.45-second reaction interval measured 28–50 seconds (mean 35.23 seconds; mean height 32.23 pads). This informed the drift ramp. It is a pacing sanity check, not evidence of a human player's skill or enjoyment. Earlier falls remain possible and restart is immediate.

## Six-domain coverage

| Domain        | Coverage                | Evidence and limits                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility | **Checked**             | Native named buttons, landmark/headings, skip link, keyboard flow, visible focus screenshot, dialog focus trap/inert background, 44px mobile utility targets, non-color hazard symbols, reduced motion, and four axe scans. All scans report zero detected violations. Actual screen-reader use and fully nonvisual timing gameplay were **not verified**.                                                         |
| Layout        | **Checked**             | Ready at 1440×1080, 1024×900, 820×1000, 390×844, 320×740; active at 1440×900, 1024×768, 844×390, 390×844, 320×568, 540×720. No horizontal overflow in these checks. Main action is visible initially at 390px; BANK is within the checked active viewports. 200% text enlargement checked at 820px. Native browser zoom was **not verified**. RTL/localization is **not applicable** to this English-only release. |
| Writing       | **Checked**             | Short product/intro headings, action labels tied to actions, consistent pot/score/combo vocabulary, explicit bank/reset tradeoff, named hazard warnings, final-ten-second BANK reminder, actionable zero-score ending, clear session-only record message and no real-money claim. Unrequested form/error flows are **not applicable**.                                                                             |
| Typography    | **Checked**             | Six-size CSS scale, actual bundled fonts, correct loaded weights, readable narrow HUD, tabular changing numbers, wrap behavior, 200% text-size correction and final screenshot inspection. No claim of text shaping in unsupported locales.                                                                                                                                                                        |
| Colors        | **Checked with limits** | Semantic token/source review, hazard symbols in addition to hues, visual review of scene text and five measured opaque rendered pairs below. Axe cannot determine all backgrounds beneath gradients, overlays and canvas. Full contrast across animated artwork and every transient state is **not verified**.                                                                                                     |
| UI details    | **Checked**             | Ready/disabled/aimed/active/focus/modal/result component states, short specific-property transitions, press scale, pad life feedback, changing pot size, grin/panic sprites, coin effects, muted/playing sound state and reduced-motion behavior. Slow-motion animation-panel review and physical-device tactile behavior were **not performed**.                                                                  |

## Findings, fixes and rechecks

Locations refer to the final source containing the correction. Resolved issues are retained here as review evidence; they are not pending changes.

| Severity / domain                                             | Source                                                              | Observation and correction                                                                                                                                                                                                                               | Recheck                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| High / integration compatibility, identified in source review | `vite.config.ts:6`, `src/style.css:1`, `src/bridge.ts:7`            | A default ES-module/static-font export depends on cross-origin fetch support in an opaque iframe. Built a deferred classic bundle and embedded font bytes; assets remain local. Storage and bridge handling were designed for denied same-origin access. | Actual no-CORS opaque iframe loaded the fonts/game, completed a run and sent score 125; no resource or console errors.                          |
| Medium / layout                                               | `src/style.css:1370`, `src/style.css:1424`, `src/renderer.ts:51`    | An early 1024×900 layout measurement placed BANK's bottom at 904.8px. Mobile and short-height active layouts now compact the page chrome, use viewport-aware scene height, and adapt camera framing.                                                     | BANK's bottom is inside all recorded active viewports, including 320×568, 1024×768 and 844×390.                                                 |
| Medium / colors and hierarchy                                 | `src/renderer.ts:125`, `src/renderer.ts:270`                        | In the first mobile rendering the moon and bright preview pads competed with intro text. Reduced idle pad opacity and moved/scaled the small-screen moon away from the headline.                                                                         | Final desktop/mobile screenshots visually inspected; title, description and Hop in remain readable. No full animated-background contrast claim. |
| Medium / typography and layout                                | `src/style.css:1416`, `src/style.css:1419`                          | At 200% text size, the ready scene clipped the final intro hint. A 26rem minimum now grows with the text; dialog cards also have bounded overflow.                                                                                                       | Automated bounding-box assertion confirms the hint stays inside the scene. Final enlarged-text screenshot inspected.                            |
| Low / accessibility semantics                                 | `index.html:56`, `index.html:80`, `index.html:95`, `index.html:270` | Generic labeled elements produced axe manual-review items. Added group roles for stats/milestones, an image role for the canvas and a timer role with live updates off.                                                                                  | No remaining `aria-prohibited-attr` items in final scans. Remaining incomplete items concern contrast backgrounds.                              |
| Medium / reliability and writing                              | `src/storage.ts:37`                                                 | Malformed saved JSON previously selected the “storage unavailable” fallback even when storage worked. Parsing now discards invalid data separately from storage access failure.                                                                          | Unit test verifies defaults and persistent saving after corrupt JSON; denied storage still retains session bests without throwing.              |
| Low / cover composition                                       | `src/assets/cover.svg`                                              | The original cover's left reeds obscured the beginning of the footer caption. Narrowed the foreground shape, used the game's local fonts and rerendered the PNG.                                                                                         | Final 1200×630 image visually inspected; caption is unobstructed.                                                                               |

A final file audit also found Vite’s temporary config-loader directory and an incidental npm lock cache. They were removed. `vite.config.ts:7` now sends caches to the system temporary directory, and `package.json` uses `--configLoader native`. The subsequent typecheck and production rebuild passed, recreated no repository `node_modules`, and produced the same tested runtime asset `index-jsZhfT-o.js`. No ignore file or Git metadata was edited.

## Measured contrast

These are actual computed foreground/background pairs sampled in the production browser. Values do not establish contrast for unrelated gradients or canvas imagery. The primary control was sampled during its near-rest transition state.

| Pair                         | Foreground         | Rendered background | WCAG ratio |
| ---------------------------- | ------------------ | ------------------- | ---------- |
| Main copy on help card       | `rgb(243,243,220)` | `rgb(25,49,43)`     | 12.32:1    |
| Supporting copy on help card | `rgb(173,189,173)` | `rgb(25,49,43)`     | 7.03:1     |
| Score value                  | `rgb(243,243,220)` | `rgb(28,50,43)`     | 12.12:1    |
| Gold pot value               | `rgb(244,204,100)` | `rgb(28,50,43)`     | 8.87:1     |
| Primary action text          | `rgb(40,49,34)`    | `rgb(245,205,102)`  | 8.89:1     |

Axe's final incomplete contrast groups contain 36 nodes in desktop ready, 4 paused, 12 game over and 31 mobile ready. Details are in the JSON report. This is not an “all contrast passed” or WCAG-compliance claim.

## Rendered evidence

Portable copies included with the source:

- [Desktop ready](screenshots/desktop.png)
- [390px mobile ready](screenshots/mobile.png)
- [390px mobile gameplay and BANK](screenshots/mobile-playing.png)
- [Live ×8 combo, golden fly and 18,450 pot](screenshots/high-combo.png)
- [Game over and one-tap restart](screenshots/game-over.png)

The test's additional `artifacts/` outputs include `keyboard-focus.png`, `paused.png`, `desktop-playing.png`, `text-enlargement.png` and `sandbox.png`. Screenshots were viewed, not only captured. `artifacts/` is excluded by the supplied seat's Git configuration, so the report, raw browser results and five key screenshots are also retained in `docs/` for a self-contained source handoff. No ignore or Git configuration was changed.

## Remaining limits and release status

No known blocking defect remains in the tested scope. Chromium emulated touch is not a physical-device test. Safari, Firefox, native browser zoom, screen-reader sessions, subjective audio balance, every possible viewport, and long-term daily use were not tested. CSS/text and browser semantics checks do not make this timing-based visual game fully accessible to every player. Storage-free embeds cannot retain a daily streak across reloads; the UI explicitly communicates this.

No production hosting URL/CID, release submission or admin approval exists within this build. The coordinating publication workflow must publish the already built `dist/` and retain its actual submission receipt. The final file/size audit is recorded in `delivery-audit.json`.
