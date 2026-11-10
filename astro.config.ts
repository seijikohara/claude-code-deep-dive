import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// Sidebar groups follow the parts of the reference. Each group lists the chapter pages
// in its directory, ordered by the `sidebar.order` frontmatter (the chapter number).
const parts: Array<[dir: string, en: string, ja: string]> = [
  ["intro", "Introduction", "導入"],
  ["fundamentals", "Fundamentals", "基礎の深掘り"],
  ["operation", "Operation", "操作"],
  ["settings", "Settings and safety", "設定と安全"],
  ["extensions", "Extensions", "拡張"],
  ["parallel", "Parallel work", "並列化"],
  ["automation", "Automation", "自動化"],
  ["platforms", "Platforms", "プラットフォーム"],
  ["enterprise", "Enterprise", "エンタープライズ"],
  ["summary", "Summary", "まとめ"],
  ["appendix", "Complete appendices", "全件付録"],
];

// https://docs.astro.build/en/reference/configuration-reference/
// https://starlight.astro.build/reference/configuration/
export default defineConfig({
  site: "https://seijikohara.github.io",
  base: "/claude-code-deep-dive",
  markdown: {
    // SmartyPants would turn "--effort" into "–effort" and straight quotes into curly ones.
    // The reference quotes flags and UI strings verbatim, so keep the source characters.
    smartypants: false,
  },
  integrations: [
    starlight({
      title: "Claude Code Deep Dive",
      description:
        "A reference on every feature of Claude Code 2.1.321, checked against the official documentation and the installed binary.",
      // English is the primary language at the site root; the Japanese edition lives under /ja/.
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        ja: { label: "日本語", lang: "ja" },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/seijikohara/claude-code-deep-dive",
        },
      ],
      customCss: [
        "@fontsource/ibm-plex-sans-jp/400.css",
        "@fontsource/ibm-plex-sans-jp/500.css",
        "@fontsource/ibm-plex-sans-jp/600.css",
        "@fontsource/ibm-plex-sans-jp/700.css",
        "@fontsource/ibm-plex-mono/400.css",
        "@fontsource/ibm-plex-mono/500.css",
        "./src/styles/site.css",
      ],
      sidebar: parts.map(([dir, en, ja]) => ({
        label: en,
        translations: { ja },
        // Eleven parts and about 90 pages: start each part collapsed; Starlight opens the current one.
        collapsed: true,
        items: [{ autogenerate: { directory: dir } }],
      })),
      // Round code frames to match the other surfaces in src/styles/site.css.
      expressiveCode: {
        styleOverrides: { borderRadius: "0.75rem" },
      },
      // Each page links to its MDX source so readers can report or fix an error in place.
      editLink: {
        baseUrl: "https://github.com/seijikohara/claude-code-deep-dive/edit/main/",
      },
      lastUpdated: false,
    }),
  ],
});
