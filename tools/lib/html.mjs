// HTML helpers shared by the build: escaping, raw code blocks, generated table slides, and tables of contents.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Return `s` with `& < > "` replaced by HTML entities. */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/**
 * Return `s` escaped, with `backtick` spans turned into <code> elements.
 * Authors and translators write identifiers in backticks; the slides show them as code.
 */
export function inlineText(s) {
  return escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");
}

const RAW_OPEN = /<pre data-lang="([\w+-]+)"([^>]*)>/g;

/**
 * Convert `<pre data-lang="X">RAW</pre>` into a highlighted, escaped code block.
 * Authors paste code verbatim; escaping here keeps `<`, `>` and `&` from breaking the page.
 */
export function escapeRawBlocks(html, file) {
  let out = "";
  let last = 0;
  RAW_OPEN.lastIndex = 0;
  let m;
  while ((m = RAW_OPEN.exec(html))) {
    const bodyStart = m.index + m[0].length;
    const close = html.indexOf("</pre>", bodyStart);
    if (close === -1) throw new Error(`${file}:${lineOf(html, m.index)}: unclosed raw block`);
    const body = html.slice(bodyStart, close);
    const nested = body.search(/<pre[\s>]/);
    if (nested !== -1) {
      throw new Error(
        `${file}:${lineOf(html, m.index)}: </pre> inside raw block (nested <pre> at line ${lineOf(html, bodyStart + nested)})`,
      );
    }
    const extra = m[2] || "";
    const cls = extra.match(/\sclass="([^"]*)"/);
    const lineNumbers = extra.match(/\sdata-line-numbers(?:="[^"]*")?/);
    out += html.slice(last, m.index);
    const text = body.replace(/[&<>]/g, (c) => ESCAPES[c]);
    out += `<pre${cls ? ` class="${cls[1]}"` : ""}><code class="language-${m[1]}" data-trim${lineNumbers ? lineNumbers[0] : ""}>${text}</code></pre>`;
    last = close + "</pre>".length;
    RAW_OPEN.lastIndex = last;
  }
  return out + html.slice(last);
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** Split `rows` into consecutive groups of at most `size`. */
export function chunk(rows, size) {
  const groups = [];
  for (let i = 0; i < rows.length; i += size) groups.push(rows.slice(i, i + size));
  return groups;
}

export const STATUS_LABELS = {
  ga: null,
  beta: "Beta",
  preview: "Preview",
  experimental: "Experimental",
  undocumented: "Undocumented",
  deprecated: "Deprecated",
  removed: "Removed",
};

/** Return a status badge, or an empty string for GA and unknown values. */
export function badge(status) {
  const key = String(status || "ga")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const ALIASES = { researchpreview: "preview", publicbeta: "beta" };
  const normalized = ALIASES[key] ?? key;
  const label = STATUS_LABELS[normalized];
  return label ? `<span class="badge ${normalized}">${label}</span>` : "";
}

/** Escape code text and allow line breaks after `|` so long argument lists wrap at separators. */
function codeText(v) {
  return escapeHtml(v).replace(/\|/g, "|<wbr>");
}

function renderValue(col, v) {
  if (v === undefined || v === null || v === "") return "";
  if (col.badge) return badge(v);
  if (typeof v === "boolean") return v ? "✓" : "—";
  if (col.map && Object.hasOwn(col.map, v)) return escapeHtml(col.map[v]);
  if (Array.isArray(v))
    return v.map((x) => (col.code ? `<code>${codeText(x)}</code>` : inlineText(x))).join(" ");
  if (col.code) return `<code>${codeText(v)}</code>`;
  return inlineText(v);
}

function renderCell(col, row) {
  const main = renderValue(col, row[col.key]);
  if (!col.sub) return main;
  const sub = renderValue({ code: true }, row[col.sub]);
  return sub ? `${main}<div class="sub">${sub}</div>` : main;
}

// Geometry of a generated table slide; tools/check.mjs verifies the result in a browser.
const TABLE = {
  width: 1440,
  font: 18,
  lineHeight: 1.42,
  rowPad: 13,
  header: 34,
  budget: 645,
  introCost: 70,
};

/** Estimate the rendered width of `text` in px: CJK glyphs are one em, Latin about 0.55 em, code 0.53 em. */
export function textWidth(text, fontPx, code = false) {
  let w = 0;
  for (const ch of String(text).replace(/`/g, "")) {
    const cp = ch.codePointAt(0);
    w += cp >= 0x2e80 ? fontPx : fontPx * (code ? 0.53 : 0.55);
  }
  return w;
}

function columnWidths(columns) {
  const fixed = columns.reduce((sum, c) => sum + (c.width ? parseFloat(c.width) / 100 : 0), 0);
  const flexible = columns.filter((c) => !c.width).length || 1;
  return columns.map(
    (c) =>
      (c.width
        ? (parseFloat(c.width) / 100) * TABLE.width
        : ((1 - fixed) * TABLE.width) / flexible) - 14,
  );
}

function cellLines(col, row, width) {
  const v = row[col.key];
  if (v === undefined || v === null || v === "" || col.badge || typeof v === "boolean") return 1;
  const text = Array.isArray(v) ? v.join(" ") : String(v);
  const font = col.code ? TABLE.font * 0.88 : TABLE.font;
  let lines = Math.max(1, Math.ceil(textWidth(text, font, col.code) / width));
  if (col.sub && row[col.sub])
    lines +=
      (Math.ceil((textWidth(row[col.sub], 14, true) * 1.15) / width) * (14 * 1.42)) /
      (TABLE.font * TABLE.lineHeight);
  return lines;
}

/** Split rows into slides by estimated height so short rows pack densely and long rows get room. */
export function paginate(rows, columns, spec = {}) {
  const widths = columnWidths(columns);
  const budget = spec.budget ?? TABLE.budget;
  const groups = [];
  let current = [];
  let used = TABLE.header + (spec.intro ? TABLE.introCost : 0);
  for (const row of rows) {
    const lines = Math.max(...columns.map((c, i) => cellLines(c, row, widths[i])));
    const h = lines * TABLE.font * TABLE.lineHeight + TABLE.rowPad;
    if (current.length && used + h > budget) {
      groups.push(current);
      current = [];
      used = TABLE.header;
    }
    current.push(row);
    used += h;
  }
  if (current.length) groups.push(current);
  return groups;
}

/**
 * Render rows as one or more table slides (inner <section>s of a vertical stack).
 * Each slide repeats the header row and the source footer.
 */
export function renderTableSlides(spec) {
  const { id, title, columns, rows, rowsPerSlide, src, intro = "", className = "" } = spec;
  const groups =
    rowsPerSlide === "auto" || rowsPerSlide === undefined
      ? paginate(rows, columns, spec)
      : chunk(rows, rowsPerSlide);
  const classAttr = `table-slide ${className}`.trim();
  const head = `<tr>${columns
    .map((c) => `<th${c.width ? ` style="width:${c.width}"` : ""}>${escapeHtml(c.label)}</th>`)
    .join("")}</tr>`;
  return groups
    .map((group, i) => {
      const suffix = groups.length > 1 ? ` (${i + 1}/${groups.length})` : "";
      const body = group
        .map((row) => `<tr>${columns.map((c) => `<td>${renderCell(c, row)}</td>`).join("")}</tr>`)
        .join("\n");
      return [
        `<section id="${id}-${i + 1}" class="${classAttr}">`,
        `<h2>${escapeHtml(title)}${suffix}</h2>`,
        i === 0 && intro ? `<p class="lead">${intro}</p>` : "",
        `<table class="catalog"><thead>${head}</thead><tbody>\n${body}\n</tbody></table>`,
        `<footer class="src">出典: ${src}</footer>`,
        `</section>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

/** Return the linked table of contents for the deck, grouped by part. */
export function buildToc(chapters) {
  const parts = new Map();
  for (const ch of chapters) {
    if (!parts.has(ch.part)) parts.set(ch.part, []);
    parts.get(ch.part).push(ch);
  }
  const blocks = [...parts.entries()].map(
    ([part, chs]) =>
      `<div class="toc-part"><h3>${escapeHtml(part)}</h3><ol>${chs
        .map(
          (ch) =>
            `<li><a href="#/${ch.id}">${ch.label ? `<span class="toc-no">${escapeHtml(ch.label)}</span>` : ""}${escapeHtml(ch.title)}</a></li>`,
        )
        .join("")}</ol></div>`,
  );
  return `<div class="toc">${blocks.join("\n")}</div>`;
}
