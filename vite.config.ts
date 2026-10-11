import { tmpdir } from "node:os";
import { join } from "node:path";

// A classic bundle also loads in opaque-origin iframes on hosts without CORS headers.
export default {
  base: "./",
  cacheDir: join(tmpdir(), "pepe-ladder-vite-cache"),
  build: {
    target: "es2022",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    assetsInlineLimit: 65536,
    rollupOptions: { output: { format: "iife", inlineDynamicImports: true } },
  },
  plugins: [
    {
      name: "opaque-origin-classic-script",
      apply: "build" as const,
      transformIndexHtml: {
        order: "post" as const,
        handler(html: string) {
          return html
            .replace(/<script type="module" crossorigin/g, "<script defer")
            .replace(
              /<link rel="stylesheet" crossorigin/g,
              '<link rel="stylesheet"',
            );
        },
      },
    },
  ],
};
