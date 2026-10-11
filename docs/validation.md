# PEPE Ladder — validation and design review

**Completion: Complete for the stated revision scope (2026-10-11).** These are the worker's observations and tests, not an independent certification. The website and static export are complete. Hosting, release submission and administrative approval are outside this build and have not occurred.

## Scope and assumptions

Reproduced all four reported findings against the supplied export before editing. Applied only the compact result layout, mixed-input focus correction, opening-copy reduction and weight consolidation. Rechecked the single-page game in ready, playing, high-combo, banking, paused and game-over states. The delivered runtime is `dist/`, served under a real `/preview/` subpath for tests. The root source is Vite + TypeScript with Canvas 2D and native HTML controls. No app framework or backend is required.

Consequential design decisions: the ladder generates indefinitely but a run ends at the 75-second moonset; a fall may end it earlier. One pad equals one metre. Local-calendar streaks reward the first bank of every run, capped at a seven-day bonus. Denied browser storage uses session memory, with a visible explanation. The page offers English and a single night theme. There are no account, payment, form, remote leaderboard, theme-switcher or localization flows to review.

The pinned Better Interface workflow and the core principles of all six domains were read and applied during construction. Documentation follows its implementation-based design method. The template's AGENTS.md and INTEGRATION.md were read as task data; no coordinator job, release helper or publishing command was run.

## Verification performed

Revision environment: Node 22.23.3, npm 10.9.9, TypeScript 5.9.3, Vite 7.1.9, Playwright 1.56.1, Chromium 141.0.7390.37, axe-core integration 4.11.0. Dependencies and browser binaries were installed in `/tmp`, not the repository. The supplied MCP browser opened about:blank, refused file URLs, then returned “Transport closed” on resize and HTTP navigation. Rendered validation used installed Chromium under `/tmp` through the bounded Playwright script with its own server at a `/preview/` subpath. Every scripted browser session and server was closed. Screenshots were opened with the image viewer; no MCP rendered-page observation is claimed.

Actual final checks:

| Command                                                                                                    | Actual result                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PATH="/tmp/pepe-ladder-revision-tools/node_modules/.bin:$PATH" npm run typecheck`                                  | Exit 0, no diagnostics                                                                                 |
| `PATH="/tmp/pepe-ladder-revision-tools/node_modules/.bin:$PATH" npm run build`                                      | Exit 0; 9 modules transformed; complete export generated                                               |
| `npm test`                                                                                                 | Exit 0; 14 tests passed, 0 failed                                                                      |
| `PEPE_TOOLCHAIN=/tmp/pepe-ladder-revision-tools PLAYWRIGHT_BROWSERS_PATH=/tmp/pepe-ladder-revision-browsers npm run test:browser` | Exit 0; 33 production-browser checks passed                                                            |

The original cover and its source were preserved; the final delivery audit rechecks its 1200×630 dimensions and manifest paths.

The final tests exercise:

- Directional hops with arrows, A/D, Space and W; normal button keyboard activation; BANK using B and Enter, including banking in flight. Regression checks switch from pointer-clicked Sound, left/right Hop and BANK to keyboard actions; Tab-reached Sound/Hop/BANK retain native Space/Enter behavior.
- Real emulated touch events on the left half of the pond, the right hop control, BANK, pause, resume and instant restart. New-best and unbanked-loss game-over states are measured before restart at 320×568, 390×568, 540×650, 390×844 and 1440×900; loss, score, record values, run detail and all 52px of restart fit within the card without scrolling.
- Combo accumulation/reset, a ×8 live run, golden fly pot doubling, banked/unbanked separation, fall/game over, near-miss copy and personal records.
- Pad lifetimes, increasing drift, narrow platforms, ladder generation to 60 pads, moonset loss, banking just before a splash and pause freezing all physics clocks.
- Sound starts without autoplay, explicit enable/mute/resume, preference persistence and no audio context before a gesture, even with a saved sound preference. The browser checked a running audio context and oscillator scheduling. A high-pot run reached 18,450 and scheduled 16 heartbeat notes. Sound was not subjectively auditioned.
- Pause/resume by P/Escape, Tab wrapping inside dialogs, inert background, visible keyboard focus, visibility-loss pause and no automatic visibility-return resume.
- Corrupt records, storage denial, same-day streak stability, consecutive-day/month/leap-day transitions and missed-day reset.
- A real `sandbox="allow-scripts allow-pointer-lock"` iframe with no same-origin permission and **no CORS headers**: fonts and game load, storage denial is caught, `init` → `ready`, wrong source/protocol/channel ignored, valid pause/resume handled, one `{ protocol: 'pepe-game/1', type: 'score', channel: 'test-channel', score: 125 }` sent on game over.
- Metadata, manifest entry/cover availability, local fonts and relative paths under `/preview/`.

Runtime results: **0 JavaScript errors, 0 console errors, 0 failed resource requests** in the tested flows. All 33 named checks, layout measurements, audio observations and incomplete accessibility items are preserved in [`browser-results.json`](browser-results.json).

A deterministic engine simulation of 100 correct-direction runs with a 0.45-second reaction interval measured 28–50 seconds (mean 35.23 seconds; mean height 32.23 pads). This informed the drift ramp. It is a pacing sanity check, not evidence of a human player's skill or enjoyment. Earlier falls remain possible and restart is immediate.

## Six-domain coverage

| Domain        | Coverage                | Evidence and limits                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility | **Checked**             | Native named buttons, landmark/headings, skip link, keyboard flow, visible focus screenshot, dialog focus trap/inert background, 44px mobile utility targets, non-color hazard symbols, reduced motion, and four axe scans. All scans report zero detected violations. Pointer-to-keyboard switching and Tab-reached native controls both pass; short results keep focused restart in view. Actual screen-reader use and fully nonvisual timing gameplay were **not verified**.                                                         |
| Layout        | **Checked**             | Ready at 1440×1080, 1024×900, 820×1000, 390×844, 320×740; active at 1440×900, 1024×768, 844×390, 390×844, 320×568, 540×720. No horizontal overflow in these checks. Main action is visible initially at 390px; BANK is within the checked active viewports. Result geometry passes for new-best and loss states at 320×568, 390×568, 540×650, 390×844 and 1440×900. 200% text enlargement checked at 820px. Native browser zoom was **not verified**. RTL/localization is **not applicable** to this English-only release. |
| Writing       | **Checked**             | Factual product description, one intro headline with gameplay directions, removed intro pill/post-button/help taglines, action labels tied to actions, consistent pot/score/combo vocabulary, explicit bank/reset tradeoff, named hazard warnings, final-ten-second BANK reminder, actionable zero-score ending, clear session-only record message and no real-money claim. Unrequested form/error flows are **not applicable**.                                                                             |
| Typography    | **Checked**             | Six-size CSS scale, actual bundled fonts, three rendered weights (Lilita 400; Nunito 500/800) at 390×844 and 1440×900, readable narrow HUD, tabular changing numbers, wrap behavior, 200% text-size correction and final screenshot inspection. No claim of text shaping in unsupported locales.                                                                                                                                                                        |
| Colors        | **Checked with limits** | Semantic token/source review, hazard symbols in addition to hues, visual review of scene text and five measured opaque rendered pairs below. Axe cannot determine all backgrounds beneath gradients, overlays and canvas. Full contrast across animated artwork and every transient state is **not verified**.                                                                                                     |
| UI details    | **Checked**             | Ready/disabled/aimed/active/focus/modal/result component states, short specific-property transitions, press scale, pad life feedback, changing pot size, grin/panic sprites, coin effects, muted/playing sound state and reduced-motion behavior. Slow-motion animation-panel review and physical-device tactile behavior were **not performed**.                                                                  |

## Findings, fixes and rechecks

Revision locations refer to the final source. Baseline reproduction measurements are retained in [`revision-baseline.json`](revision-baseline.json); final style observations are in [`revision-styles.json`](revision-styles.json). The supplied design-critic script is absent from this task's inputs, so its taste command was not run. DOM/computed-style measurements and viewed screenshots independently reproduce both advisory reports.

| Finding | Final source | Reproduction, fix and recheck |
| --- | --- | --- |
| High: clipped mobile restart (`5ce832b1…`) | `src/style.css:1376` | Original 320×568 card had clientHeight 328, scrollHeight 453 and 0/52px of restart visible. At 390×568 only 27.42/52px showed. Added the ≤540px width / ≤650px height treatment: hide the decorative frog, use `--fs-lg` heading and `--fs-title` score. New-best results now have equal client/scroll heights (328 at 320×568; 307 at 390×568) and a fully visible 52px restart. Loss states and larger layouts also pass; all records fit and one tap restarts. |
| Medium: pointer focus diverts keyboard (`e4ca9314…`) | `src/main.ts:235` | Click-left → ArrowRight → Space fell at height 1; click-Sound → Space/Enter toggled sound instead of hopping/banking. Pointer-generated clicks on Sound/Hop/BANK now focus the canvas with preventScroll during play. Rechecks reach height 2/pot 300 and bank score 125 as expected; both hop buttons, BANK and Tab-reached native controls pass. |
| Medium: competing opening taglines (`44bfae66…`) | `index.html:46`, `index.html:123` | All four quoted promotional lines appeared in the original DOM; desktop/mobile screenshots confirmed their placement. Replaced the page subtitle with a factual game description and removed `.intro-chip`, `.intro-hint`, `.combo-caption` and their unused styles. “One more pad?”, directions and Hop in remain; the 390px start button ends at y=478.38 inside the first screen. |
| Low: six font weights (`a31c0cef…`) | `src/style.css:37`, `src/style.css:109`, `src/style.css:408` | Original visible text computed to 400/500/600/700/800/900. Nunito 600 now uses 500; 700/900 use 800, including keycaps. Final computed weights are exactly 400/500/800 at both review sizes, using the same loaded fonts and six sizes. |

The following original-build findings are retained as historical context; their line references refer to the original submission. They are not additional changes in this revision.

| Severity / domain                                             | Source                                                              | Observation and correction                                                                                                                                                                                                                               | Recheck                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| High / integration compatibility, identified in source review | `vite.config.ts:6`, `src/style.css:1`, `src/bridge.ts:7`            | A default ES-module/static-font export depends on cross-origin fetch support in an opaque iframe. Built a deferred classic bundle and embedded font bytes; assets remain local. Storage and bridge handling were designed for denied same-origin access. | Actual no-CORS opaque iframe loaded the fonts/game, completed a run and sent score 125; no resource or console errors.                          |
| Medium / layout                                               | `src/style.css:1370`, `src/style.css:1424`, `src/renderer.ts:51`    | An early 1024×900 layout measurement placed BANK's bottom at 904.8px. Mobile and short-height active layouts now compact the page chrome, use viewport-aware scene height, and adapt camera framing.                                                     | BANK's bottom is inside all recorded active viewports, including 320×568, 1024×768 and 844×390.                                                 |
| Medium / colors and hierarchy                                 | `src/renderer.ts:125`, `src/renderer.ts:270`                        | In the first mobile rendering the moon and bright preview pads competed with intro text. Reduced idle pad opacity and moved/scaled the small-screen moon away from the headline.                                                                         | Final desktop/mobile screenshots visually inspected; title, description and Hop in remain readable. No full animated-background contrast claim. |
| Medium / typography and layout                                | `src/style.css:1416`, `src/style.css:1419`                          | At 200% text size, the ready scene clipped the final intro hint. A 26rem minimum now grows with the text; dialog cards also have bounded overflow.                                                                                                       | The original hint check passed; that hint is removed by this revision. The current enlarged-text check verifies Hop in remains inside the scene.                            |
| Low / accessibility semantics                                 | `index.html:56`, `index.html:80`, `index.html:95`, `index.html:270` | Generic labeled elements produced axe manual-review items. Added group roles for stats/milestones, an image role for the canvas and a timer role with live updates off.                                                                                  | No remaining `aria-prohibited-attr` items in final scans. Remaining incomplete items concern contrast backgrounds.                              |
| Medium / reliability and writing                              | `src/storage.ts:37`                                                 | Malformed saved JSON previously selected the “storage unavailable” fallback even when storage worked. Parsing now discards invalid data separately from storage access failure.                                                                          | Unit test verifies defaults and persistent saving after corrupt JSON; denied storage still retains session bests without throwing.              |
| Low / cover composition                                       | `src/assets/cover.svg`                                              | The original cover's left reeds obscured the beginning of the footer caption. Narrowed the foreground shape, used the game's local fonts and rerendered the PNG.                                                                                         | Final 1200×630 image visually inspected; caption is unobstructed.                                                                               |

A final file audit also found Vite’s temporary config-loader directory and an incidental npm lock cache. They were removed. `vite.config.ts:7` now sends caches to the system temporary directory, and `package.json` uses `--configLoader native`. The revision also installs dependencies outside the repository and uses the native loader. Its typecheck and production build passed, producing the tested runtime asset `index-Bpz9Qy4h.js`. No ignore file or Git metadata was edited.

## Measured contrast

These are actual computed foreground/background pairs sampled in the production browser. Values do not establish contrast for unrelated gradients or canvas imagery. The primary control was sampled during its near-rest transition state.

| Pair                         | Foreground         | Rendered background | WCAG ratio |
| ---------------------------- | ------------------ | ------------------- | ---------- |
| Main copy on help card       | `rgb(243,243,220)` | `rgb(25,49,43)`     | 12.32:1    |
| Supporting copy on help card | `rgb(173,189,173)` | `rgb(25,49,43)`     | 7.03:1     |
| Score value                  | `rgb(243,243,220)` | `rgb(28,50,43)`     | 12.12:1    |
| Gold pot value               | `rgb(244,204,100)` | `rgb(28,50,43)`     | 8.87:1     |
| Primary action text          | `rgb(40,49,34)`    | `rgb(244,204,100)`  | 8.80:1     |

Axe's final incomplete contrast groups contain 34 nodes in desktop ready, 4 paused, 12 game over and 29 mobile ready. Details are in the JSON report. This is not an “all contrast passed” or WCAG-compliance claim.

## Rendered evidence

Portable copies included with the source:

- [Desktop ready](screenshots/desktop.png)
- [390px mobile ready](screenshots/mobile.png)
- [390px mobile gameplay and BANK](screenshots/mobile-playing.png)
- [Live ×8 combo, golden fly and 18,450 pot](screenshots/high-combo.png)
- [Game over and one-tap restart](screenshots/game-over.png)
- [320×568 result: all records and restart visible](screenshots/result-320-568.png)
- [390×568 result: all records and restart visible](screenshots/result-390-568.png)

The test's additional `artifacts/` outputs include `keyboard-focus.png`, `paused.png`, `desktop-playing.png`, `text-enlargement.png` and `sandbox.png`. Screenshots were viewed, not only captured. `artifacts/` is excluded by the supplied seat's Git configuration, so the report, raw browser results and seven key screenshots are also retained in `docs/` for a self-contained source handoff. No ignore or Git configuration was changed.

## Remaining limits and release status

No known blocking defect remains in the tested scope. Chromium emulated touch is not a physical-device test. Safari, Firefox, native browser zoom, screen-reader sessions, subjective audio balance, every possible viewport, and long-term daily use were not tested. CSS/text and browser semantics checks do not make this timing-based visual game fully accessible to every player. Storage-free embeds cannot retain a daily streak across reloads; the UI explicitly communicates this.

No production hosting URL/CID, release submission or admin approval exists within this build. The coordinating publication workflow must publish the already built `dist/` and retain its actual submission receipt. The final file/size audit is recorded in `delivery-audit.json`.
