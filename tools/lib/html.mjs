// HTML helpers for the generated tables (appendix, command catalog) rendered by src/components/DataTable.astro.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Return `s` with `& < > "` replaced by HTML entities. */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/**
 * Return `s` escaped, with `backtick` spans turned into <code> elements.
 * Translators write identifiers in backticks; the tables show them as code.
 */
export function inlineText(s) {
  return escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");
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

/** Render rows as one plain table (no slide pagination) for the documentation pages. */
export function renderTable({ columns, rows, className = "catalog" }) {
  const head = `<tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr>`;
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${renderCell(c, row)}</td>`).join("")}</tr>`)
    .join("\n");
  return `<table class="${className}"><thead>${head}</thead><tbody>\n${body}\n</tbody></table>`;
}
