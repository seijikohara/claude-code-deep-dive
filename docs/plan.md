# Claude Code Deep Dive Implementation Plan

**Goal:** Build a ~500-slide Japanese Reveal.js reference deck on Claude Code 2.1.321, verified against the docs and the binary, and publish it locally and as a private claude.ai Artifact.

**Architecture:** Chapter slides are hand-authored HTML fragments. Catalog and appendix slides are generated from JSON data. A dependency-free Node build inlines CSS, escapes code, and emits a full document plus an Artifact fragment. Node lint scripts and an in-page browser check gate every build.

**Tech Stack:** Reveal.js 6.0.2 (cdnjs), Node 26 (`node:test`, no npm dependencies), Playwright MCP for in-browser checks, Google Fonts (Source Sans 3, Noto Sans JP, Source Code Pro).

**Spec:** `docs/design.md` (read it first; this plan does not repeat it).

## Global Constraints

- Target: Claude Code `2.1.321`. Default model observed: `claude-opus-5-5`.
- Reveal.js `6.0.2` from `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/6.0.2/`. Plugins: Highlight, Search, Zoom. No Notes plugin.
- Canvas `width: 1600, height: 900`. `hash: true`, `slideNumber: 'c/t'`, chapters as vertical stacks.
- Always white. Headings keep their case. `pre code` has no `max-height`.
- Body text Japanese; identifiers verbatim. Build and tool files in English.
- Every content slide has a `.src` footer; non-GA features carry a `.badge`.
- Research inputs live in a local research root (not committed) (`notes/`, `docs/`, `raw/`, `machine.md`). Scripts take this path from `CCDD_RESEARCH` (no hard-coded default in committed slides).
- Every `claude -p` run uses `--no-session-persistence`.
- No git commits (the user has not asked for any).
- Never put the user's home path, username, email, hostname, installed plugin/MCP/skill names, or UUIDs in `index.html`.

## Review Focus

1. A long unbreakable token (an env var name, a URL) in a narrow table cell → wraps inside the cell; the page check reports horizontal overflow if it doesn't. Test: Task 4 fixture slide with a 60-character env var in a 3-column table.
2. A raw code block containing `<script>`, `&amp;`, or `</pre>` → `<`/`&` are escaped; an embedded `</pre>` stops the build with the chapter file and line. Test: Task 2 `escapeRawBlocks` cases.
3. Google Fonts unreachable → Japanese still renders through the fallback stack (`"Hiragino Sans", "Yu Gothic", "Noto Sans CJK JP", sans-serif`). Test: Task 1 asserts the stack in the built CSS.
4. Keyboard navigation and internal `#/…` links inside the Artifact frame → TOC links land on the chapter. Test: Task 6 manual check on the published pilot.
5. An identifier that exists only in the notes (hallucinated or misspelled) → the lint fails unless the slide marks it `Undocumented`. Test: Task 3 fixture with `CLAUDE_CODE_NOT_A_REAL_VAR`.

---

### Task 1: Scaffold, vendor CSS, template, theme layer

**Files:**

- Create: `vendor/reveal.css`, `vendor/reset.css`, `vendor/white.css` (downloaded from jsDelivr `reveal.js@6.0.2/dist/...`; `white.css` with its four `@font-face` rules removed)
- Create: `src/template.html` (placeholders `{{CSS}}`, `{{SLIDES}}`)
- Create: `src/deck.css`
- Test: `tools/build.test.mjs` (first test only)

**Interfaces:**

- Produces: the component classes listed in design §6, plus `.badge.ga|beta|preview|experimental|undocumented|deprecated|removed`, `.lab` (observed output), `.toc`, `.catalog` (dense table), `.scroll-y` (appendix only).
- Produces: font stacks as CSS variables `--font-body`, `--font-code`.

- [ ] Step 1: Write test `vendor white.css has no embedded fonts` (asserts no `url(data:font/woff` in `vendor/white.css`) and `deck.css keeps the Japanese fallback stack` (asserts `Hiragino Sans` and `Noto Sans JP` in `src/deck.css`). Run `node --test tools/` → FAIL.
- [ ] Step 2: Download the three CSS files, strip the `@font-face` blocks, write `template.html` and `deck.css` (white tokens on `:root`, heading `text-transform: none`, `pre code { max-height: none }`, light highlight palette for `.hljs-*`, table cells `overflow-wrap: anywhere`).
- [ ] Step 3: `node --test tools/` → PASS.

### Task 2: Build script

**Files:**

- Create: `tools/build.mjs`, `tools/lib/html.mjs`
- Test: `tools/build.test.mjs`

**Interfaces:**

- Consumes: `src/template.html`, `src/deck.css`, `vendor/*.css`, `src/chapters/*.html` (sorted by file name), `data/*.json`.
- Produces in `tools/lib/html.mjs`:
  - `escapeHtml(s: string): string`
  - `escapeRawBlocks(html: string, file: string): string` — converts `<pre data-lang="X">RAW</pre>` into `<pre><code class="language-X" data-trim>ESCAPED</code></pre>`; throws `Error("<file>:<line>: </pre> inside raw block")` on a nested `</pre>`.
  - `chunk<T>(rows: T[], size: number): T[][]`
  - `renderTableSlides(spec: {id: string, title: string, columns: {key: string, label: string}[], rows: object[], rowsPerSlide: number, src: string}): string` — returns one vertical stack, slide titles suffixed `(n/m)`.
  - `buildToc(chapters: {id: string, part: string, title: string}[]): string`
- Produces CLI: `node tools/build.mjs` → writes `index.html` (full document) and `dist/artifact.html` (fragment: `<title>`, `<meta>`, font `<link>`, `<style>`, deck markup, scripts; no `<!doctype>`, `<html>`, `<head>`, `<body>`). Chapter metadata comes from the first `<section>` of each chapter file: `id`, `data-part`, `data-title`.

- [ ] Step 1: Tests: `escapeRawBlocks escapes < and &`, `escapeRawBlocks rejects nested </pre>` (message contains file and line), `chunk splits 41 rows into 18/18/5`, `renderTableSlides titles slides (1/3)…(3/3)`, `artifact output has no doctype or body tag`, `index.html contains every chapter id`. Run → FAIL.
- [ ] Step 2: Implement the functions and the CLI.
- [ ] Step 3: `node --test tools/` → PASS.

### Task 3: Lint script (identifiers, privacy, coverage, sources)

**Files:**

- Create: `tools/lint.mjs`, `tools/lib/lint-rules.mjs`, `tools/fixtures/` (small HTML fixtures)
- Test: `tools/lint.test.mjs`

**Interfaces:**

- Consumes: `index.html`, `data/*.json`, the research corpus under `$CCDD_RESEARCH` (`docs/*.md`, `raw/**`, `machine.md`, `lab/**` redacted outputs), `tools/privacy-patterns.local.json` (git-ignored list of private strings; never published).
- Produces in `tools/lib/lint-rules.mjs`:
  - `extractIdentifiers(html: string): {kind: 'flag'|'env'|'command'|'setting'|'hook', value: string, slideId: string, undocumented: boolean}[]` — reads `<code>` text only.
  - `checkIdentifiers(ids, corpusText: string): {value: string, slideId: string}[]` (unmatched list)
  - `checkPrivacy(html: string, patterns: string[]): {pattern: string, index: number}[]` (also matches any UUID)
  - `checkCoverage(html: string, entries: string[]): string[]` (missing entries)
  - `checkSources(html: string): string[]` (slide ids without `.src`, ignoring `.part-divider`, `.chapter-title`, `#title`)
- Produces CLI: `node tools/lint.mjs` → exit 0 and a summary, or exit 1 with a grouped report.

- [ ] Step 1: Tests: `flags env vars commands are extracted from code`, `unknown CLAUDE_CODE_NOT_A_REAL_VAR is reported`, `undocumented badge exempts an identifier`, `UUID is reported as private`, `missing command is reported`, `divider slides need no source`. Run → FAIL.
- [ ] Step 2: Implement.
- [ ] Step 3: `node --test tools/` → PASS.

### Task 4: In-page layout check

**Files:**

- Create: `tools/check-page.js` (a function body for Playwright MCP `browser_evaluate`), `tools/fixtures/overflow.html`
- Create: `tools/serve.mjs` (static file server on `127.0.0.1:4173` for the project directory)

**Interfaces:**

- Produces: `check-page.js` evaluates to an async function returning `{total: number, failures: {index: string, id: string, kind: 'height'|'scroll-x'|'scroll-y'|'no-src', detail: string}[], consoleErrors: string[]}`. It calls `Reveal.slide(h, v)` for every slide, waits one animation frame, and measures the current slide and its descendants.

- [ ] Step 1: Write `tools/fixtures/overflow.html` with three slides: one too tall, one with a 60-character env var in a 3-column table, one clean.
- [ ] Step 2: Serve and run `check-page.js` on the fixture → expect two failures (`height`, and either none or `scroll-x` for the table depending on wrapping) and the clean slide passing. Adjust `deck.css` until the env-var table wraps and only `height` fails.
- [ ] Step 3: Record the exact procedure in `docs/checking.md`.

### Task 5: Shared ledger and data files

**Files:**

- Create: `docs/ledger.md` (drafted by an agent from all notes' conflict and status sections, reviewed by the lead)
- Create: `tools/extract.mjs` → `data/settings.json` (249), `data/env.json` (402), `data/cli-flags.json` (docs table merged with `claude --help`), `data/hook-events.json` (33), `data/tools.json` (41), `data/commands.json` (116 commands + 24 aliases, from the commands-ui catalog).
- Test: `tools/extract.test.mjs`

**Interfaces:**

- Produces: every JSON row has `{name: string, desc_en: string, desc_ja: string, status: string, anchor: string}`; command rows add `{aliases: string[], args: string, kind: 'builtin'|'bundled-skill'|'bundled-workflow', headless: string}`.

- [ ] Step 1: Tests: counts are exactly 249 / 402 / 33 settings, env, hook events; `advisorModel` row has a non-empty `desc_en`; `commands.json` contains `/advisor`, `/compact`, `/code-review` and no plugin-provided names.
- [ ] Step 2: Implement `extract.mjs`; run it; tests PASS with `desc_ja` empty.
- [ ] Step 3: Fill `desc_ja` in batches with subagents (one batch per file); rerun the tests plus a check that no `desc_ja` is empty.
- [ ] Step 4: Ledger agent writes `docs/ledger.md`; the lead reviews it against the conflicts listed in each agent report.

### Task 6: Pilot and first publish

**Files:**

- Create: `src/chapters/00-intro.html` (title + reading guide + TOC placeholder), `src/chapters/90-pilot.html` (temporary: one catalog slide generated from `data/commands.json`, the hook-events table, a 25-line JSON code slide, a Japanese-heavy prose slide, a conflict callout)

- [ ] Step 1: Build, lint, run the page check → zero failures.
- [ ] Step 2: Publish `dist/artifact.html` as the Artifact (`icon: "slides"`).
- [ ] Step 3: Open the published page; confirm fonts, highlight colors, arrow-key and TOC navigation.
- [ ] Step 4: Show the user the pilot link and wait for their reaction before Task 7.

### Task 7: Author chapters (fan-out)

**Files:**

- Create: `src/chapters/NN-<slug>.html` for every chapter in design §9 (Parts 0–IX), one file per chapter.

**Interfaces:**

- Consumes: `docs/design.md`, `docs/ledger.md`, `docs/authoring-guide.md` (component examples copied from the pilot), the domain notes named in design §9.

- [ ] Step 1: Write `docs/authoring-guide.md` from the approved pilot.
- [ ] Step 2: Dispatch about 12 authoring agents in parallel, one per chapter group, each limited to its files and the slide budget in design §9.
- [ ] Step 3: Build and lint after each group returns; send lint failures back to the author.

### Task 8: Fact review per chapter

- [ ] Step 1: Dispatch one reviewer agent per chapter group. Each checks every claim against the docs mirror and lab outputs (not the notes) and returns `{slideId, claim, verdict, evidence}` rows for errors only.
- [ ] Step 2: Authors fix the reported errors.
- [ ] Step 3: Rebuild; lint passes.

### Task 9: Appendix, catalog, integration check

- [ ] Step 1: Generate Ch12 catalog slides and Part X appendix stacks from `data/*.json`; remove `90-pilot.html`.
- [ ] Step 2: Build; `node tools/lint.mjs` → exit 0 (identifiers, privacy, coverage for all JSON entries, sources).
- [ ] Step 3: Page check over every slide → zero failures; total slide count ≥ 480; no console errors.

### Task 10: Publish and clean up

- [ ] Step 1: Publish `dist/artifact.html` to the same Artifact URL.
- [ ] Step 2: Delete the 26 transcript directories under `~/.claude/projects/` created by the research lab runs (approved by the user).
- [ ] Step 3: Report: link, local path, slide count, check results, known gaps.
