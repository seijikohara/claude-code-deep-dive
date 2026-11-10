import { defineConfig } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: "https://seijikohara.github.io",
  base: "/claude-code-deep-dive",
  vite: {
    build: {
      // reveal.js's highlight plugin bundles highlight.js with every language (about 900 KB).
      // The deck page loads it once; raise the limit so the warning flags only unexpected growth.
      chunkSizeWarningLimit: 1200,
    },
  },
  i18n: {
    // English is the site's primary language. Japanese pages live under /ja/.
    defaultLocale: "en",
    locales: ["en", "ja"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
