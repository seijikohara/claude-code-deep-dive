// Render the deck's slide markup from the chapter sources: escape raw code, expand generated tables,
// add the deck/chapter/part tables of contents, running heads, and formatted source lines.
// Shared by the standalone build (tools/build.mjs) and the Astro pages (src/pages/**/deck.astro).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { escapeHtml, escapeRawBlocks, renderTableSlides, buildToc } from "./html.mjs";

let root = process.cwd();
const read = (p) => readFileSync(join(root, p), "utf8");

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : "";
}

function loadData(name) {
  const file = join(root, "data", `${name}.json`);
  if (!existsSync(file)) throw new Error(`data/${name}.json not found`);
  const rows = JSON.parse(readFileSync(file, "utf8"));
  const overridesFile = join(root, "data/status-overrides.json");
  const overrides = existsSync(overridesFile)
    ? JSON.parse(readFileSync(overridesFile, "utf8"))[name] || {}
    : {};
  return rows.map((r) => (overrides[r.name] ? { ...r, status: overrides[r.name] } : r));
}

function matchesFilter(row, filter) {
  return Object.entries(filter || {}).every(([k, v]) =>
    Array.isArray(v) ? v.includes(row[k]) : row[k] === v,
  );
}

/** Replace each `<!--TABLE {json}-->` marker with generated table slides. */
function expandTables(html, file) {
  return html.replace(/<!--TABLE\s+([\s\S]*?)-->/g, (_, json) => {
    let spec;
    try {
      spec = JSON.parse(json);
    } catch (e) {
      throw new Error(`${file}: invalid TABLE spec: ${e.message}`, { cause: e });
    }
    let rows = loadData(spec.data).filter((r) => matchesFilter(r, spec.filter));
    if (spec.sort)
      rows = rows.toSorted((a, b) => String(a[spec.sort]).localeCompare(String(b[spec.sort])));
    if (rows.length === 0) throw new Error(`${file}: TABLE ${spec.id} matched no rows`);
    return renderTableSlides({ ...spec, rows });
  });
}

function stripTags(s) {
  return s
    .replace(/<span class="badge[^"]*">[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseChapter(html, file) {
  const open = html.match(/<section\b[^>]*>/);
  if (!open) throw new Error(`${file}: no <section>`);
  const outer = open[0];
  const rest = html.slice(open.index + outer.length);
  const inner = [...rest.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)].map((m) => {
    const h2 = m[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    return { id: attr(m[0], "id"), cls: attr(m[0], "class"), title: h2 ? stripTags(h2[1]) : "" };
  });
  return {
    file,
    id: attr(outer, "id"),
    part: attr(outer, "data-part"),
    label: attr(outer, "data-chapter"),
    title: attr(outer, "data-title"),
    isStack: inner.length > 0,
    inner,
  };
}

function chapterToc(ch) {
  const items = ch.inner
    .filter((s) => s.id && s.title && !/chapter-title/.test(s.cls))
    .map((s) => `<li><a href="#/${s.id}">${escapeHtml(s.title)}</a></li>`);
  // Long chapters switch to a denser three-column list so the title slide never overflows.
  const cls =
    items.length > 40
      ? "chapter-toc many most"
      : items.length > 22
        ? "chapter-toc many"
        : "chapter-toc";
  return `<ol class="${cls}">${items.join("")}</ol>`;
}

/** Return the running-head number for a chapter label: "Ch5" -> "05", other labels unchanged. */
export function runheadNumber(label) {
  const m = /^Ch(\d+)$/.exec(label || "");
  return m ? m[1].padStart(2, "0") : label || "";
}

/** Insert the running head (chapter number and name) at the top of every inner content slide. */
function addRunheads(html, ch) {
  if (!ch.isStack || !ch.title) return html;
  const no = runheadNumber(ch.label);
  const head = `<div class="runhead">${no ? `<span class="rh-no">${escapeHtml(no)}</span>` : ""}<span class="rh-title">${escapeHtml(ch.title)}</span></div>`;
  let seenOuter = false;
  return html.replace(/<section\b[^>]*>/g, (tag) => {
    if (!seenOuter) {
      seenOuter = true;
      return tag;
    }
    return /class="[^"]*(chapter-title|part-divider|no-kicker)|\sid="title"/.test(tag)
      ? tag
      : `${tag}\n${head}`;
  });
}

/** Turn " · " separators inside source footers into spacing, and label the line. */
export function formatSources(html) {
  return html.replace(/<footer class="src">([\s\S]*?)<\/footer>/g, (_, body) => {
    const text = body
      .replace(/^\s*出典:\s*/, "")
      .split(/\s+·\s+/)
      .join('<span class="sep"></span>');
    return `<footer class="src"><span class="src-label">出典</span>${text}</footer>`;
  });
}

function partToc(part, chapters) {
  const items = chapters
    .filter((c) => c.part === part)
    .map(
      (c) =>
        `<li><a href="#/${c.id}"><span class="toc-no">${escapeHtml(runheadNumber(c.label))}</span>${escapeHtml(c.title)}</a></li>`,
    );
  return `<ol class="part-toc">${items.join("")}</ol>`;
}

function assertUniqueIds(html) {
  const seen = new Set();
  for (const m of html.matchAll(/<section\b[^>]*\sid="([^"]+)"/g)) {
    if (seen.has(m[1])) throw new Error(`duplicate section id: ${m[1]}`);
    seen.add(m[1]);
  }
}

/**
 * Render every chapter file in `chaptersDir` (relative to `projectRoot`) into one slides string.
 * `only` limits the files to the given name prefixes (e.g. ["p1-c02", "p1-c03"]).
 */
export function renderSlides({
  projectRoot = process.cwd(),
  chaptersDir = "src/chapters",
  only = [],
} = {}) {
  root = projectRoot;
  const files = readdirSync(join(root, chaptersDir))
    .filter((f) => f.endsWith(".html"))
    .filter((f) => only.length === 0 || only.some((p) => f.startsWith(p)))
    .toSorted();
  const sources = files.map((f) => {
    const name = `${chaptersDir}/${f}`;
    const html = expandTables(escapeRawBlocks(read(name), name), name);
    return { html, meta: parseChapter(html, name) };
  });

  const chapters = sources.map((s) => s.meta).filter((m) => m.isStack && m.title);
  const toc = buildToc(chapters);

  const slides = formatSources(
    sources
      .map(({ html, meta }) =>
        addRunheads(
          html
            .replace("<!--TOC-->", toc)
            .replace("<!--CHAPTER-TOC-->", chapterToc(meta))
            .replace("<!--PART-TOC-->", () => partToc(meta.part, chapters)),
          meta,
        ),
      )
      .join("\n"),
  );
  assertUniqueIds(slides);
  const count = (slides.match(/<section\b/g) || []).length - chapters.length;
  return { slides, chapters, files: files.length, count };
}
