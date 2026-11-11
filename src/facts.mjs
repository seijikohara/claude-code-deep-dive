// Values that the pages repeat in many places: the release the reference covers, and totals.
// Pages read them as `{facts.settingsKeys}` instead of writing the number, and tools/lint.mjs
// checks the places that cannot (frontmatter, READMEs, package.json, astro.config.ts).
//
// When the reference moves to a new release, edit TARGET_VERSION and DOCS_PAGES by hand.
// Every other value is counted from data/*.json and the chapter files.
//
// Do NOT use this for verification stamps ("実測 2.1.321", "実機確認 2.1.321") or for history
// ("2.1.321 で追加"): those record the release a fact was checked on or changed in, and stay
// true after the target moves. tools/lint.mjs reports stamps older than the target instead.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** The Claude Code release this reference describes. */
const TARGET_VERSION = "2.1.321";
/** Pages in the official docs index at the time of the research (the docs mirror is local only). */
const DOCS_PAGES = 228;

// Astro builds and the lint both run from the repository root.
const root = process.cwd();
const rows = (name) => JSON.parse(readFileSync(join(root, "data", `${name}.json`), "utf8"));
const current = (list) => list.filter((r) => r.status !== "removed");

const PARTS = [
  "intro",
  "fundamentals",
  "operation",
  "settings",
  "extensions",
  "parallel",
  "automation",
  "platforms",
  "enterprise",
  "summary",
  "appendix",
];
/** Count chapter pages in each part of the Japanese edition (the part overview is not a chapter). */
function countChapters() {
  const byPart = {};
  for (const part of PARTS) {
    byPart[part] = readdirSync(join(root, "src/content/docs/ja", part)).filter(
      (f) => f.endsWith(".mdx") && f !== "index.mdx",
    ).length;
  }
  return { byPart, total: Object.values(byPart).reduce((a, b) => a + b, 0) };
}

const tools = rows("tools");
const commands = rows("commands");

export const facts = {
  targetVersion: TARGET_VERSION,
  docsPages: DOCS_PAGES,
  settingsKeys: rows("settings").length,
  envVars: rows("env").length,
  hookEvents: rows("hook-events").length,
  /** Every tool in the reference, removed ones included. */
  tools: tools.length,
  /** Tools that still exist. */
  currentTools: current(tools).length,
  /** Built-in slash commands that still exist (bundled skills and workflows excluded). */
  builtinCommands: current(commands).filter((c) => c.kind === "builtin" && !c.removed).length,
  chapters: countChapters(),
};
