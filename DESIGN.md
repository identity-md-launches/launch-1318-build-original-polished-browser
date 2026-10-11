# PEPE Ladder design

## Overview

PEPE Ladder is a compact arcade game for a quick risk-and-reward climb. Its night pond uses deep green surfaces, a teal illustrated playfield, rounded lily pads, an expressive frog and a warm gold coin pot. The playable area is the main content. A quieter side column explains hazards and holds personal records; there is no separate marketing page or pre-run menu sequence. The opening pairs a factual product description with “One more pad?”, gameplay directions and Hop in; no promotional pill or extra intro/help tagline competes with that action.

The source of truth is `src/style.css` for the interface, `src/renderer.ts` for the canvas illustration, and `index.html` for structure. `src/main.ts` handles component states. The cover is original vector art in `src/assets/cover.svg`, rasterized using the same local fonts by `scripts/render-cover.mjs`.

## Colors

These are the implemented semantic CSS tokens, declared at the top of `src/style.css`. There is one deliberate night theme, without a separate light variant.

| Token          | Value     | Use                                          |
| -------------- | --------- | -------------------------------------------- |
| `--night`      | `#10231f` | Page background                              |
| `--panel`      | `#19312b` | Game shell, instructions and record cards    |
| `--line`       | `#355044` | Structural borders and separators            |
| `--text`       | `#f3f3dc` | Main text                                    |
| `--muted`      | `#adbdad` | Supporting copy and labels                   |
| `--green`      | `#b6e28b` | Brand, combo, selected aim and safe pad life |
| `--gold`       | `#f4cc64` | Primary actions, pot and coin rewards        |
| `--gold-hover` | `#ffdb7d` | Enabled primary button hover                 |
| `--ink`        | `#283122` | Text/icons on gold buttons                   |
| `--danger`     | `#ffb6a0` | Low pad life and final timer warning         |
| `--focus`      | `#fff4bd` | Three-pixel keyboard focus perimeter         |

The scoreboard has its own opaque `#1c322b` surface. Disabled BANK uses `#405343` with `#c6cfb5` text. The canvas has an independent illustration palette: sky `#12383a`, upper magical sky `#123449`, water `#327c6c`, moon `#f2d779`, ordinary lily `#8dc875`, sinker `#83bdae`, crumbler `#bea575`. Hazards also carry arrows/cracks and written messages; color is not their only signal.

Gold signals a reward or the main action. Ready, active and modal states each have one enabled gold primary action. Other controls use green-tinted neutral fills. See the validation report for measured contrast pairs; contrast over every animated pixel is not claimed.

## Typography

Two locally bundled WOFF2 families are defined with `@font-face`. The production build embeds the font bytes in the stylesheet to support the opaque sandbox without CORS dependencies.

- **Nunito Sans** is named `Nunito` in CSS, with `ui-sans-serif, system-ui, sans-serif` fallbacks. Its variable file provides the requested 200–900 range. Actual interface weights are 500 for body/supporting text and 800 for emphasis, controls and keycaps. Body line height is 1.5. Together with Lilita 400, the interface uses three weights.
- **Lilita One**, named `Lilita`, uses its real 400 weight for the game title, intro/modal headings and result number, with rounded/system sans fallbacks. Short headings use 1.1–1.2 line height.
- `font-synthesis: none` avoids invented faces. The actual fonts loaded in the checked desktop/mobile and opaque iframe states. Both licenses ship in `public/fonts/` and `dist/fonts/`.

The CSS type scale has exactly six steps: `--fs-xs` 0.75rem (12px), `--fs-sm` 0.875rem (14px), `--fs-base` 1rem (16px), `--fs-lg` 1.25rem (20px), `--fs-title` 2rem (32px), and `--fs-display` 3rem (48px). Small labels/keys use 12px; supporting instructions 14px; body/buttons 16px; controls and compact scores 20px; primary scores/mobile headings 32px; desktop title/intro/results 48px. Canvas and cover lettering have separate illustration sizes.

Scores, height, timer and record values use tabular numerals. Headings use balanced wrapping; short descriptions use `text-wrap: pretty`. Main title tracking is −0.5px; body copy has no added tracking. Text remains selectable outside the gesture-driven canvas.

## Layout

The shared page maximum is 1280px. Desktop page insets are 48px. The game/aside grid is `minmax(0, 1fr) 284px` with a 28px gap. Cards align to the top. The stats row uses four columns with quiet dividers, and the three-button action bar uses a wider central BANK control.

Spacing mainly uses 4, 8, 12, 16, 20, 24, 28 and 32px steps. Related controls are close; instructions and records have larger section gaps. The scene bleeds to its card edges; controls are inset. Mobile bottom padding includes `env(safe-area-inset-bottom)`.

Implemented breakpoints:

- **Above 1400px:** 40px page top inset and a 540px scene.
- **1050px and below:** 28px page insets, a 252px sidebar and a 20px grid gap; buttons and stats compact.
- **820px and below:** the game occupies a full row; the aside becomes two columns underneath.
- **540px and below:** 14px page insets, one-column aside, 32px title, 20px stats, 44px scene utility buttons and touch instructions. Keyboard keycaps are hidden. The ready scene uses viewport-aware height and a 26rem minimum so enlarged intro text stays inside it.
- **360px and below:** 10px page insets and less decorative HUD detail.
- **During mobile play:** `body.in-run` hides the introductory page header and gives the game the first viewport; instructions and records remain below it. BANK stays in the bottom action bar.
- **Results at heights up to 650px, at every width:** hide the decorative result frog, use `--fs-lg` (20px) for the result heading and `--fs-title` (32px) for the score. This also covers landscape phones and short embeds. Taller results retain their larger presentation.
- **Dialogs above 540px wide and up to 850px tall:** `.in-run .overlay` uses `position: fixed` with the existing zero inset, centering pause/results in the viewport instead of the shrinking pond. The pond stacking context is raised to z-index 1 here so later disabled controls cannot paint above the dialogs. The 850px boundary covers the full result card plus pond insets; an 800px cutoff still clips content at 801px. Portrait phone dialogs and desktop viewports taller than 850px keep their existing pond-relative positioning. Card overflow remains available for content beyond the checked sizes.
- **Short desktop/landscape play:** height queries at 950px and 650px compact or hide page chrome, reduce scene height and preserve controls. `Renderer.resize()` adjusts illustration scale and `Game.cameraFollow` to keep the frog visible in the shorter scene.

Inspected ready widths are 320, 390, 820, 1024 and 1440px. Active layout measurements include 320×568 and 844×390. Pause and result dialogs were measured at 21 sizes, including 1366×657, 844×390 and both sides of the 850px boundary; all records, run detail and restart fit without scrolling. See `docs/validation.md` for the exact matrix and limits. Text was enlarged to 200% at 820px; native browser zoom was not exercised. The product is English-only; RTL/localization is not implemented.

## Elevation & depth

Page and cards use tonal green differences, low-contrast structural borders and restrained shadows. The game shell uses `0 18px 60px #0000001c`. Gold buttons have a four-pixel darker gold base and a soft shadow to suggest a physical arcade control. The pause/result layer adds a dark scrim and a 6px backdrop blur, with a stronger card shadow.

The canvas is the lowest game layer. Scene tools and toasts are at z-index 3; dialogs are at 5. The skip link is at 20. Decorative canvas art and notification layers do not intercept button input. Modals make the surrounding content inert, move focus inside, trap Tab, and return focus to the pond on resume.

Pointer clicks/taps on Sound, either hop button or BANK return focus to the pond without scrolling. On the ready screen, Space/Enter then starts the run; during play they hop/bank. Buttons reached with Tab retain focus and native Space/Enter activation in both states. Sound and the gameplay controls remain inert under pause/result dialogs.

## Shapes

`--radius` is 20px for outer cards. The mobile game shell uses 16px. Main controls use 12px, utility controls and status pills use 10px or a full pill radius, and keycaps use 5px. Pads and water rings are elliptical. No external icon library is used: line SVGs share 1.8px strokes and `currentColor`; the custom frog sprites use their own illustrated outlines.

## Components

| Pattern              | Source                             | Behavior                                                                                                          |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Scoreboard           | `.scoreboard`, `.stat` in HTML/CSS | Banked score, pot, multiplier and height remain separate; pot is gold and combo green                             |
| Primary action       | `.primary-button`                  | Hop in, Keep climbing or One more run; hover/focus/active states, 0.96 press scale                                |
| Banking control      | `.bank-button`, `bank()`           | Disabled for an empty pot or inactive phase; displays the current pot; immediate save and coin burst              |
| Direction controls   | `.hop-button`, `aim()` / `hop()`   | Left/right hop, persistent aim highlight; same actions as tapping scene halves                                    |
| Utility buttons      | `.icon-button`                     | Named Sound toggle (`aria-pressed`) and Pause; 44px touch targets                                                 |
| Pond                 | `Renderer` in `src/renderer.ts`    | Resizes at capped 2× pixel density; original night scene, rare flies, three frog expressions and pot growth/shake |
| Pad warning          | `.play-status`, `.pad-timer`       | Named hazard/direction plus a draining life bar; final 10 seconds explicitly prompt BANK                          |
| Feedback             | `.pond-toast`, `role="status"`     | Short banking/combo/fly announcements; static text supplements particle effects                                   |
| Pause/result dialogs | `.overlay`, `.overlay-card`        | Native buttons, bounded card with overflow fallback, inert background and focus trap; compact short-screen results fit without scrolling and restart begins immediately |
| Records              | `.records-card`, `RecordStore`     | Local bests and streak; visible session-only fallback; corrupt records safely reset                               |
| Help                 | `.how-card`, `.pond-guide`         | Three steps, clear pad symbols and golden-fly explanation; normal document flow                                   |

Button transitions are limited to background, transform and shadow at 120ms. Frequent game actions are not staggered. `prefers-reduced-motion` removes CSS transitions and press scaling, as well as decorative bobbing, shake, hop tilt and particles. Essential hops, platform drift and camera movement remain. Sound is a separate opt-in control, synthesized only after a gesture; pauses silence it.

The empty state is a ready pond with zero stats and a Hop in action. No network loading flow, forms, login or payment state exists. Recoverable storage failure changes the record label and keeps the game playable.

## Do's and don'ts

- Reuse the six text sizes and existing semantic colors. Keep gold for rewards and the current primary action.
- Preserve distinct banked score and unbanked pot; never make banking resemble real-money activity.
- Keep every hazard's shape/symbol and text cue. Essential information must survive reduced motion and muted audio.
- Keep control targets inset, named and keyboard reachable. Preserve native Enter/Space button behavior and visible focus.
- For another page, start with the `main` width/insets, `--panel` card, existing heading/body families, and `.primary-button`; keep content in normal flow and use the same responsive breakpoints only when appropriate.
- Do not introduce remote fonts, scripts, wallets or a required storage/backend dependency. Rebuild the committed static export after any runtime change.

Design review methodology is adapted from Better Interface (Jakub Krehel, MIT) and Impeccable's documentation method (Paul Bakaus, Apache-2.0). See `ASSETS.md` and `docs/licenses/design-guidance.txt` for attribution and licenses.
