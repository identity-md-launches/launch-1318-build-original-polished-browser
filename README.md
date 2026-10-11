# PEPE Ladder

A free, single-player browser game for the Pepe2Pepe arcade. Hop through an illustrated night pond, grow a coin pot, and **BANK before you sink**. The finished static website is in [`dist/`](dist/), alongside the TypeScript source, lockfile, original artwork and test evidence.

## Play

Select **Hop in**. The first pad is to the left.

| Action         | Desktop                      | Touch                                                    |
| -------------- | ---------------------------- | -------------------------------------------------------- |
| Aim            | Left / Right arrows or A / D | Choose a side of the pond                                |
| Hop            | Space or W                   | Tap the left/right half of the pond, or its arrow button |
| Bank           | B or Enter                   | Tap the gold BANK button                                 |
| Pause / resume | P or Escape                  | Pause button, then Keep climbing                         |
| Restart        | Activate One more run        | Tap One more run once                                    |
| Sound          | Activate the speaker button  | Tap the speaker button                                   |

Space and Enter retain normal activation when a button is reached with Tab. Clicking/tapping Sound, a hop button or BANK returns focus to the pond: Space/Enter starts from the ready screen, and hops/banks during a run. Aiming persists until you change direction. The dotted arc shows your aim. Hops take 0.58 seconds; moving pads can drift away from the point you aimed at. Input is processed immediately, and there is no run-start countdown.

- Each new pad adds to the **current pot**. Only **banked score** counts after a fall.
- BANK saves the pot, resets the combo to ×1, and works in midair—even during the brief fall before the splash.
- Combo milestones are 2 / 5 / 9 / 14 / 20 / 28 / 40 consecutive pads, giving ×2 / ×3 / ×5 / ×8 / ×10 / ×15 / ×20. The landing reward is `(100 + floor(height / 5) × 25) × multiplier`.
- Drifters carry an arrow and move sideways. Sinkers carry a down arrow and last 1.65 seconds underfoot. Crumblers have a crack and last 0.95 seconds. Ordinary lilies last 4 seconds; the starting pad allows 8 seconds.
- A rare golden fly above a pad doubles the pot when caught on landing. Higher pads move faster and get narrower. Every climbed pad adds one metre to height.
- The ladder keeps generating, with a **75-second moonset cap**. Bank before moonset; remaining unbanked coins are lost. Falls can end a run sooner. No forced waiting extends a failed run.
- Playing on consecutive local calendar days builds a streak. The first bank **of each run** receives `25 × min(streak, 7)` bonus coins. Repeated runs on the same day do not increase the streak.

Best score, best height, streak and sound preference are saved locally when storage is available. In the arcade's opaque-origin sandbox, the game uses memory and clearly labels records as **session only**; records cannot survive an iframe reload there. No wallet, payment, login, backend, telemetry or external asset request is required.

## Install, develop and preview

Use Node **22.18 or later** (revision tested with Node 22.23.3) and npm. Install dependencies normally:

```sh
npm ci
npm run dev
```

For the production export:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Open the local URL printed by Vite. `preview` serves the existing `dist/`; the publisher does **not** rebuild it. You may also serve `dist/` with any ordinary static HTTP server. Keep its directory structure intact. No server-side routes or runtime environment variables are needed.

The game uses **Vite + TypeScript + Canvas 2D**, with semantic HTML controls. Canvas owns the frame loop; a UI framework is unnecessary for this one-screen game. Vite has `base: './'`, uses its native config loader, and keeps its cache in the system temporary directory. The production output is a classic deferred IIFE with styles and fonts embedded, so an iframe without `allow-same-origin` can load it even on a server that sends no CORS headers. Frog sprites, favicon, manifest and cover use relative paths.

## Validate

```sh
npx playwright install chromium
npm run test:browser
```

The browser test starts a temporary static server under `/preview/`, launches Chromium, exercises the **production export**, writes evidence to `artifacts/`, and closes the browser and server in `finally`. It also embeds the export in `sandbox="allow-scripts allow-pointer-lock"` with no CORS headers. It does not launch a persistent background service.

Actual results from this build:

| Check                                                     | Result                                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                       | Passed; no TypeScript diagnostics                                                                    |
| `npm run build`                                           | Passed; complete static export produced                                                              |
| `npm test`                                                | 14 tests passed                                                                                      |
| `npm run test:browser`                                    | 50 checks passed in Chromium 141.0.7390.37                                                           |
| Axe scans: desktop ready, paused, game over; mobile ready | Zero detected violations; background/gradient contrast items still need manual interpretation        |
| Runtime / resources                                       | Zero JavaScript errors, console errors or failed resource requests in the checked flows              |
| Pacing simulation                                         | 100 seeded correct-direction runs: 28–50 seconds, mean 35.23 seconds; a simulation, not a user study |

Checked keyboard and touch, banking/reset, combos, golden flies, pause/focus, instant restart, game over, visibility loss, muted startup, sound on/off/resume, high-pot heartbeat, persisted records, denied storage and bridge source/channel validation. Initial widths: 320, 390, 820, 1024 and 1440 CSS pixels. Active game checks also include 320×568, 540×720, 844×390 and 1024×768. The main action is visible on the initial 390-pixel screen; BANK remains in view during the checked active layouts. Revision checks cover pause and both game-over variants at 21 sizes, including 1366×657 laptops, 1280×720, 844×390 and 667×375 landscape phones, portrait phones, and the 850/851px dialog breakpoint. All records, run detail and the full restart button fit without scrolling; direct coordinate clicks/taps restart instantly. Nine-point action probes and screenshot review confirm background controls cannot paint over the dialog. Clicking Sound before a run then pressing Space or Enter starts with sound still on; Tab-reached buttons retain native activation.

The worker installed its toolchain and browser **under `/tmp`**, then invoked these same scripts with the external toolchain on `PATH`. Tests accept `PEPE_TOOLCHAIN` for that restricted environment; ordinary local installs do not need it.

See [`docs/validation.md`](docs/validation.md) for the consolidated six-domain Better Interface review, fixes and limits. Machine-readable results are in [`docs/browser-results.json`](docs/browser-results.json). Native-device touch, Safari/Firefox, screen-reader use, native browser zoom, subjective audio quality and human difficulty testing were not performed. The 200% check enlarged text via CSS; it is not a claim of native 200% browser zoom or full accessibility certification.

## Files and artwork

- `src/engine.ts`: scoring, jumps, hazards, procedural ladder, timer and pause state.
- `src/renderer.ts`: original pond illustration, animation, expressive frog selection and coin effects.
- `src/main.ts`: DOM controls, keyboard/touch input, focus management, results and announcements.
- `src/audio.ts`: original procedural music, hop/coin sounds and heartbeat; no audio downloads.
- `src/storage.ts`, `src/bridge.ts`: safe local/session records and the arcade protocol.
- `public/pepe-game.json`: `pepe-browser-game/1` metadata copied to the export root.
- `public/cover.png`: original **1200×630** cover, also used for social metadata.
- `src/assets/cover.svg`: editable cover artwork. `npm run cover` rerenders it with the locally bundled fonts; install Playwright's Chromium first, then rebuild.
- [`DESIGN.md`](DESIGN.md): implemented tokens, typography, components and responsive rules.
- [`ASSETS.md`](ASSETS.md): provenance and licenses.

Keep source, `package.json`, `package-lock.json`, necessary configuration, documentation, evidence and the complete `dist/` in the submission. Do not include `node_modules`, browser binaries, caches, dependency tarballs or a vendored registry. This build creates no ignore file and no submodule.

## Arcade bridge and publication

The bridge accepts `init` only from `window.parent`, with protocol `pepe-game/1` and a nonempty channel up to 200 characters. It replies `ready`, handles matching-channel `pause` / `resume`, pauses on visibility loss, and sends one nonnegative safe-integer `score` when a run ends. It uses `parent.postMessage(message, '*')` because the iframe origin is opaque. No secret or configuration value is sent. Scores are local display hints, not trusted leaderboard or payout data.

The complete export is ready for **Swarm publication after this build finishes**. The assigned publication workflow supplies the hosted URL/CID. The coordinating creator can then run the game-template repository's release helper, **in its own workspace**, using the real completed job ID:

```sh
npm run release -- --job "$SWARM_JOB_ID"
```

That is the command from the [Pepe2Pepe template](https://github.com/adaki2004/pepe2pepe-game-template), not a script installed in this game repository. Follow its current [integration contract](https://github.com/adaki2004/pepe2pepe-game-template/blob/main/INTEGRATION.md), verify the published manifest/entry/cover, and retain the submission receipt. A human administrator reviews the release before listing it. **This build has not published, submitted or obtained approval, and has no hosting CID or submission receipt.**
