// Lint rules for the built deck: identifiers against the research corpus, privacy, coverage, and source footers.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "./html.mjs";

const HOOK_EVENTS_FILE = fileURLToPath(new URL("../../data/hook-events.json", import.meta.url));

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
// Element bodies taken as raw text: script and style hold CSS/JS, and code text is read verbatim.
const RAW_TEXT = new Set(["script", "style", "code"]);
const TOKEN =
  /<!--[\s\S]*?-->|<![^>]*>|<\/([A-Za-z][\w-]*)\s*>|<([A-Za-z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Return `s` with HTML entities decoded in a single pass, so `&amp;lt;` stays `&lt;`. */
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code =
        e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function parseAttrs(s) {
  const attrs = {};
  for (const m of s.matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/**
 * Parse `html` into a minimal element tree.
 * A regex over `<section>…</section>` cannot handle nested stacks, so the lint keeps an explicit element stack.
 * Unclosed elements are closed by the nearest matching end tag of an ancestor.
 */
export function parseHtml(html) {
  const root = { name: "#root", attrs: {}, classes: [], children: [], parent: null };
  let cur = root;
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(html))) {
    if (m[1]) {
      const name = m[1].toLowerCase();
      let n = cur;
      while (n !== root && n.name !== name) n = n.parent;
      if (n !== root) cur = n.parent;
      continue;
    }
    if (!m[2]) continue;
    const name = m[2].toLowerCase();
    const attrs = parseAttrs(m[3]);
    const el = {
      name,
      attrs,
      classes: (attrs.class || "").split(/\s+/).filter(Boolean),
      children: [],
      parent: cur,
    };
    cur.children.push(el);
    if (RAW_TEXT.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, "gi");
      close.lastIndex = TOKEN.lastIndex;
      const end = close.exec(html);
      const bodyEnd = end ? end.index : html.length;
      el.raw = html.slice(TOKEN.lastIndex, bodyEnd);
      TOKEN.lastIndex = end ? close.lastIndex : html.length;
      continue;
    }
    if (VOID.has(name) || m[3].trimEnd().endsWith("/")) continue;
    cur = el;
  }
  return root;
}

function* walk(node) {
  for (const child of node.children) {
    yield child;
    yield* walk(child);
  }
}

function closest(node, pred) {
  for (let n = node.parent; n; n = n.parent) if (pred(n)) return n;
  return null;
}

const hasClass = (node, cls) => node.classes.includes(cls);
const isUndocumentedBadge = (node) => hasClass(node, "badge") && hasClass(node, "undocumented");

/** Return the decoded text of a `<code>` element, with any inner markup removed. */
function codeText(el) {
  return decodeEntities((el.raw ?? "").replace(/<[^>]*>/g, ""));
}

const ENV_PREFIXES = [
  "CLAUDE_",
  "ANTHROPIC_",
  "DISABLE_",
  "ENABLE_",
  "MAX_",
  "BASH_",
  "MCP_",
  "OTEL_",
  "USE_",
  "CCR_",
  "AWS_",
  "GOOGLE_",
  "VERTEX_",
  "HTTP",
  "NO_PROXY",
  "NODE_",
  "DO_NOT_TRACK",
  "BETA_",
];
const FLAG_RE = /(?<![A-Za-z0-9_-])--[a-z][A-Za-z0-9-]+/g;
const ENV_RE = /(?<![A-Za-z0-9_])[A-Z][A-Z0-9_]{3,}(?![A-Za-z0-9_])/g;
// A path such as /etc/claude-code/... starts with a slash but is not a command.
const COMMAND_RE = /^\/[a-z][a-z0-9-:]*(?![/.A-Za-z0-9_:-])/;
const SETTING_RE = /"([a-z][A-Za-z0-9]+)"\s*:/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let defaultHookEvents;
function loadHookEvents() {
  if (defaultHookEvents === undefined) {
    defaultHookEvents = existsSync(HOOK_EVENTS_FILE)
      ? JSON.parse(readFileSync(HOOK_EVENTS_FILE, "utf8")).map((r) =>
          typeof r === "string" ? r : r.name,
        )
      : [];
  }
  return defaultHookEvents;
}

function hookPattern(events) {
  const names = events.filter(Boolean).toSorted((a, b) => b.length - a.length);
  if (names.length === 0) return null;
  return new RegExp(`(?<![A-Za-z0-9_])(?:${names.map(escapeRe).join("|")})(?![A-Za-z0-9_])`, "g");
}

/**
 * Return every flag, env var, slash command, settings key and hook event written inside `<code>`.
 * `options.hookEvents` overrides the list read from `data/hook-events.json`; hooks are skipped when neither exists.
 */
export function extractIdentifiers(html, options = {}) {
  const hookRe = hookPattern(options.hookEvents ?? loadHookEvents());
  const root = parseHtml(html);

  const undocumentedSlides = new Set();
  for (const el of walk(root)) {
    if (!isUndocumentedBadge(el) || !closest(el, (n) => n.name === "h2")) continue;
    const slide = closest(el, (n) => n.name === "section");
    if (slide) undocumentedSlides.add(slide);
  }

  const out = [];
  const seen = new Set();
  for (const el of walk(root)) {
    if (el.name !== "code") continue;
    const slide = closest(el, (n) => n.name === "section");
    const slideId = slide?.attrs.id ?? "";
    const undocumented =
      (slide !== null && undocumentedSlides.has(slide)) ||
      closest(el, (n) => hasClass(n, "undocumented")) !== null;
    const add = (kind, value) => {
      const key = `${kind}\u0000${value}\u0000${slideId}\u0000${undocumented}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ kind, value, slideId, undocumented });
    };

    const text = codeText(el);
    // A trailing dash or underscore marks a prefix such as `OTEL_*`, not a full name.
    for (const [v] of text.matchAll(FLAG_RE)) if (!v.endsWith("-")) add("flag", v);
    for (const [v] of text.matchAll(ENV_RE)) {
      if (v.includes("_") && !v.endsWith("_") && ENV_PREFIXES.some((p) => v.startsWith(p)))
        add("env", v);
    }
    const command = text.trimStart().match(COMMAND_RE);
    if (command) add("command", command[0]);
    if (hookRe) for (const [v] of text.matchAll(hookRe)) add("hook", v);
    const jsonBlock =
      el.classes.some((c) => /^language-json(c|5)?$/.test(c)) ||
      closest(
        el,
        (n) => n.name === "pre" && /^json(c|5)?$/.test(n.attrs["data-language"] ?? ""),
      ) !== null;
    if (jsonBlock) {
      for (const m of text.matchAll(SETTING_RE)) add("setting", m[1]);
    }
  }
  return out;
}

const isIdent = (c) => c !== undefined && /[A-Za-z0-9_-]/.test(c);

/** Return true when `value` occurs in `text` with no identifier character on either side. */
export function occursAsToken(text, value) {
  if (!value) return false;
  for (let i = text.indexOf(value); i !== -1; i = text.indexOf(value, i + 1)) {
    if (!isIdent(text[i - 1]) && !isIdent(text[i + value.length])) return true;
  }
  return false;
}

/**
 * Return the identifiers whose value does not occur in `corpusText`.
 * Undocumented identifiers are exempt. Commands match with or without the leading slash.
 * Matching is token-exact, so `--foo` is not satisfied by `--foo-bar`.
 */
export function checkIdentifiers(ids, corpusText) {
  const cache = new Map();
  const found = (v) => {
    if (!cache.has(v)) cache.set(v, occursAsToken(corpusText, v));
    return cache.get(v);
  };
  return ids
    .filter((id) => !id.undocumented)
    .filter((id) => !(found(id.value) || (id.kind === "command" && found(id.value.slice(1)))))
    .map(({ value, slideId, kind }) => ({ value, slideId, kind }));
}

/** Return every case-insensitive occurrence of a private pattern, plus every UUID, sorted by position. */
export function checkPrivacy(html, patterns) {
  const out = [];
  for (const p of patterns) {
    if (typeof p !== "string" || p.trim() === "") continue;
    for (const m of html.matchAll(new RegExp(escapeRe(p), "gi")))
      out.push({ pattern: p, index: m.index });
  }
  for (const m of html.matchAll(UUID_RE)) out.push({ pattern: "UUID", index: m.index });
  return out.toSorted((a, b) => a.index - b.index);
}

function stripScriptsAndStyles(html) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/** Return the entries that appear in neither raw nor HTML-escaped form in the deck markup. */
export function checkCoverage(html, entries) {
  const text = stripScriptsAndStyles(html);
  return entries.filter((e) => !occursAsToken(text, e) && !occursAsToken(text, escapeHtml(e)));
}

/**
 * Return the ids of content slides without a `.src` footer.
 * Stack wrappers, part dividers, chapter titles and the title slide are exempt.
 */
export function checkSources(html) {
  const sections = [...walk(parseHtml(html))].filter((n) => n.name === "section");
  const missing = [];
  sections.forEach((s, i) => {
    const descendants = [...walk(s)];
    if (descendants.some((n) => n.name === "section")) return;
    if (s.attrs.id === "title" || hasClass(s, "part-divider") || hasClass(s, "chapter-title"))
      return;
    if (!descendants.some((n) => hasClass(n, "src"))) missing.push(s.attrs.id || `section[${i}]`);
  });
  return missing;
}

/**
 * Return the internal deck links (`href="#/<id>"`) whose target id does not exist in `html`.
 * A link to a whole chapter (`#/ch05`) and to one slide (`#/ch05-enable`) both need a matching element id.
 */
export function checkLinks(html) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const broken = new Set();
  for (const m of html.matchAll(/href="#\/([^"]+)"/g)) {
    if (!ids.has(m[1])) broken.add(m[1]);
  }
  return [...broken];
}

/**
 * Return the internal links of a built site that point at a missing page or a missing id.
 * `pages` maps a site path (e.g. "/ja/fundamentals/advisor/") to that page's HTML; `base` is the site base path.
 */
export function checkSiteLinks(pages, base) {
  const idsByPath = new Map();
  for (const [path, html] of pages) {
    idsByPath.set(path, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  const broken = new Set();
  for (const [path, html] of pages) {
    for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
      const href = m[1].replaceAll("&amp;", "&");
      if (!href.startsWith(`${base}/`) && !href.startsWith("#")) continue;
      const [rawPath, rawFrag = ""] = href.split("#");
      const target = rawPath === "" ? path : rawPath.slice(base.length);
      if (
        /\.(css|js|svg|png|ico|xml|txt|json)$/.test(target) ||
        target.includes("/_astro/") ||
        target.includes("/pagefind/")
      )
        continue;
      const ids =
        rawPath === ""
          ? idsByPath.get(path)
          : idsByPath.get(target.endsWith("/") ? target : `${target}/`);
      if (!ids) {
        broken.add(`${path} -> ${href} (no page)`);
        continue;
      }
      const frag = decodeURIComponent(rawFrag);
      if (frag && frag !== "_top" && !ids.has(frag)) broken.add(`${path} -> ${href} (no id)`);
    }
  }
  return [...broken];
}
