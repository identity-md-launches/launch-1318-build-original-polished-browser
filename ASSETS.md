# Asset provenance

All runtime assets are local. No stock photograph, downloaded frog illustration, icon package or sampled music is used.

| Asset                                                                  | Source / rights                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/frog.svg`, `frog-grin.svg`, `frog-panic.svg`                   | Original SVG linework and expression variants drawn for this assignment's requested Pepe character. No external sprite was traced or imported. This records the artwork's provenance, not ownership of the underlying Pepe character or arcade brand. |
| `public/favicon.svg` and interface line icons                          | Original SVG drawings for this game.                                                                                                                                                                                                                  |
| `src/renderer.ts` pond, pads, moon, flowers, fireflies, jar, particles | Original procedural Canvas 2D illustration.                                                                                                                                                                                                           |
| `src/assets/cover.svg` / `public/cover.png`                            | Original composition reusing the game's original frog linework; rasterized at 1200×630 using the included fonts.                                                                                                                                      |
| `src/audio.ts`                                                         | Original oscillator-based music, hop/landing/banking sounds and heartbeat. No prerecorded audio.                                                                                                                                                      |
| `src/assets/nunito-sans.woff2`                                         | Nunito Sans variable Latin WOFF2, distributed through [Fontsource](https://fontsource.org/fonts/nunito-sans), SIL Open Font License 1.1. Full copyright and OFL text: `public/fonts/nunito-sans-LICENSE.txt` (also exported).                         |
| `src/assets/lilita-one.woff2`                                          | Lilita One Latin WOFF2, distributed through [Fontsource](https://fontsource.org/fonts/lilita-one), SIL Open Font License 1.1. Full copyright and OFL text: `public/fonts/lilita-one-LICENSE.txt` (also exported).                                     |

The font files are committed as used; the website never contacts Fontsource, Google Fonts or a CDN. Their licenses allow embedding and distribution. The cover's font appearance is reproduced by `npm run cover`; the original SVG has system-font fallbacks when viewed independently.

The code and manifest were implemented for this task. The iframe message shape follows the [Pepe2Pepe integration contract](https://github.com/adaki2004/pepe2pepe-game-template/blob/main/INTEGRATION.md), read during the build. No template release helper or private coordination code is embedded.

Design guidance attribution:

- **Better Interface**, copyright © 2026 Jakub Krehel; MIT; pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e` at <https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface>.
- **Impeccable documentation guidance**, copyright © 2025 Paul Bakaus; Apache-2.0; pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8` at <https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md>.

Both full license texts are retained in [`docs/licenses/design-guidance.txt`](docs/licenses/design-guidance.txt). The supplied adapted guide was used as review/documentation knowledge. The original guide itself is not a runtime asset. Each included work retains its own license.
