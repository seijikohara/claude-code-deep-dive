// Build the standalone deck from the chapter sources.
// Writes index.html (a full document for local viewing) and build/artifact.html (a fragment for the claude.ai Artifact),
// or, with --out, only a full document at that path so parallel authors never overwrite each other.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSlides } from "./lib/deck.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const CSS_FILES = ["vendor/reset.css", "vendor/reveal.css", "vendor/white.css", "src/deck.css"];

/**
 * Build the deck. `only` limits the chapter files to the given name prefixes (e.g. ["p1-c02", "p1-c03"]),
 * and `out` writes the full document to another path without touching index.html or build/artifact.html.
 */
export function build({ only = [], out = "" } = {}) {
  const { slides, chapters, files, count } = renderSlides({ projectRoot: root, only });

  const css = CSS_FILES.map((f) => read(f)).join("\n");
  const head = read("src/head.html").replace("{{CSS}}", () => css);
  const scripts = read("src/scripts.html");
  const deck = `<div class="reveal"><div class="slides">\n${slides}\n</div></div>`;

  const full = `<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}</head>\n<body>\n${deck}\n${scripts}</body>\n</html>\n`;
  const fragment = `${head}${deck}\n${scripts}`;

  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, full);
  } else {
    writeFileSync(join(root, "index.html"), full);
    mkdirSync(join(root, "build"), { recursive: true });
    writeFileSync(join(root, "build/artifact.html"), fragment);
  }
  return { files, chapters: chapters.length, slides: count };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const opt = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v = ""] = a.replace(/^--/, "").split("=");
      return [k, v];
    }),
  );
  const r = build({
    only: opt.only ? opt.only.split(",").filter(Boolean) : [],
    out: opt.out ? resolve(opt.out) : "",
  });
  console.log(`built ${r.slides} slides from ${r.files} files (${r.chapters} chapters)`);
}
