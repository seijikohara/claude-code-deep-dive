#!/usr/bin/env node
// Extract the reference tables of the docs mirror and the raw `--help` captures into data/full/*.json.
// data/full/ keeps the English source text and stays local; tools/apply-ja.mjs writes the slim, publishable data/*.json.
// Usage: CCDD_RESEARCH=<research root> node tools/extract.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DOCS = "https://code.claude.com/docs/en/";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- Markdown helpers ----------

/** Replace each markdown link with its text, keeping nested code spans. */
export function reduceLinks(s) {
  return s.replace(/\[((?:[^[\]]|\[[^\]]*\])*)\]\((?:[^()\s]|\([^)]*\))*\)/g, "$1");
}

/** Return plain cell text: links reduced, bold markers and markdown escapes removed. */
export function clean(s) {
  return reduceLinks(s)
    .replace(/\*\*/g, "")
    .replace(/\\([[\]|*_<>])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split one markdown table row into trimmed cells, honoring `\|` escapes. */
export function splitRow(line) {
  const body = line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "");
  return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

/** Return the code-span contents of a string, in order. */
const codeSpans = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

/** Return the rows of the first table that starts at or after line index `from`. */
function readTable(lines, from, warn, label) {
  let i = from;
  while (i < lines.length && !lines[i].startsWith("|")) i++;
  const header = splitRow(lines[i]);
  const rows = [];
  for (i += 2; i < lines.length && lines[i].startsWith("|"); i++) {
    const cells = splitRow(lines[i]);
    if (cells.length !== header.length) {
      warn(
        `${label}: row has ${cells.length} cells, header has ${header.length}: ${lines[i].slice(0, 80)}`,
      );
    }
    rows.push({ cells, line: i + 1 });
  }
  return rows;
}

const findLine = (lines, re, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && re.test(l));
  if (i < 0) throw new Error(`heading not found: ${re}`);
  return i;
};

// ---------- Status ----------

const STATUS_RULES = [
  ["removed", /^\s*Removed\b/],
  [
    "deprecated",
    /\[deprecated\]|\(deprecated\)|(?:^|[.!?;]\s+|>\s*)Deprecated\b|\b(?:is|are) (?:now )?deprecated\b/i,
  ],
  ["preview", /research preview/i],
  ["beta", /public beta|\(beta\)/i],
  [
    "experimental",
    /\(experimental\)|(?:^|[.!?;]\s+|>\s*)Experimental\b|\b(?:is|are) experimental\b/i,
  ],
];
const NEAR_MISS = /deprecat|experimental|preview|\bbeta\b|\bremoved\b/i;

/**
 * Derive a status from label-like markers in the entry's own description.
 * Code spans are removed first so identifiers such as `..._EXPERIMENTAL_BETAS` never match.
 * "Removed" at the start of an entry marks it removed in every file (settings, env vars, flags, tools, commands).
 */
export function deriveStatus(text, { allowRemoved = true } = {}) {
  const plain = clean(text).replace(/`[^`]*`/g, " ");
  for (const [status, re] of STATUS_RULES) {
    if (status === "removed" && !allowRemoved) continue;
    const m = plain.match(re);
    if (m) {
      // Deprecated/experimental must open the text or a sentence, or be a predicate,
      // so "the deprecated X" (about another key) does not count.
      if (status === "deprecated" && /\bthe deprecated\b/i.test(m[0])) continue;
      return { status, marker: m[0].trim() };
    }
  }
  const near = plain.match(NEAR_MISS);
  const removedLead = !allowRemoved && /^\s*Removed\b/.test(plain);
  return { status: "ga", marker: "", nearMiss: near ? near[0] : "", removedLead };
}

// ---------- Logging ----------

function makeLog() {
  const statuses = [];
  const nearMisses = [];
  const warnings = [];
  return {
    statuses,
    nearMisses,
    warnings,
    warn: (msg) => warnings.push(msg),
    status(file, name, desc, opts) {
      const r = deriveStatus(desc, opts);
      if (r.status !== "ga") statuses.push(`${file}\t${name}\t${r.status}\t"${r.marker}"`);
      else if (r.removedLead)
        nearMisses.push(
          `${file}\t${name}\topens with "Removed" (left ga: removed is commands-only)`,
        );
      else if (r.nearMiss) nearMisses.push(`${file}\t${name}\tmentions "${r.nearMiss}" (left ga)`);
      return r.status;
    },
  };
}

// ---------- Extractors ----------

/** Return a block's text with callout markers ("> " and "[!NOTE]") removed. */
const blockText = (b) =>
  b.lines
    .map((l) => l.replace(/^>\s?/, ""))
    .filter((l) => !/^\[!\w+\]\s*$/.test(l.trim()))
    .join(" ");

function extractSettings(md, log) {
  const lines = md.split("\n");
  const page = `${DOCS}settings-reference`;

  // The index table gives each key's anchor, a one-line summary, its topic, and its scope.
  const index = new Map();
  const idx = findLine(lines, /^## Settings index/);
  for (const { cells } of readTable(lines, idx, log.warn, "settings index")) {
    const m = cells[0].match(/^\[`([^`]+)`\]\(#([^)]+)\)$/);
    if (!m) {
      log.warn(`settings index: cannot read key cell ${cells[0]}`);
      continue;
    }
    index.set(m[1], { frag: m[2], summary: clean(cells[1]), topic: cells[2], scope: cells[3] });
  }

  const rows = [];
  let category = "";
  for (let i = 0; i < lines.length; i++) {
    const h2 = lines[i].match(/^## (.+)$/);
    if (h2) category = h2[1].trim();
    const h3 = lines[i].match(/^### `([^`]+)`\s*$/);
    if (!h3) continue;
    const name = h3[1];
    let j = i + 1;
    const body = [];
    let fence = false;
    for (; j < lines.length && !/^#{1,3} /.test(lines[j]); j++) {
      const l = lines[j];
      if (/^(?:>\s*)?```/.test(l.trim())) {
        fence = !fence;
        continue;
      }
      if (!fence) body.push(l);
    }

    // Split the section into blocks: callouts, bullet lists, and paragraphs.
    const blocks = [];
    let cur = null;
    for (const l of body) {
      if (!l.trim() || /^#{4,} /.test(l)) {
        cur = null;
        continue;
      }
      const kind = l.startsWith(">") ? "callout" : /^\s*\* /.test(l) ? "list" : "para";
      if (cur && (cur.kind === kind || (cur.kind === "list" && /^\s+/.test(l)))) cur.lines.push(l);
      else blocks.push((cur = { kind, lines: [l] }));
    }
    const lead = blocks[0]?.kind === "callout" ? clean(blockText(blocks[0])) : "";
    const pi = blocks.findIndex((b) => b.kind === "para");
    let paraText = pi >= 0 ? clean(blockText(blocks[pi])) : "";
    // A paragraph that ends with ":" introduces a list; keep the list so the sentence is complete.
    if (paraText.endsWith(":") && blocks[pi + 1]?.kind === "list") {
      const items = [];
      for (const l of blocks[pi + 1].lines) {
        const item = clean(l.replace(/^\s*\* /, ""));
        if (l.startsWith("* ")) items.push(item);
        else if (items.length)
          items[items.length - 1] += `${items[items.length - 1].endsWith(":") ? " " : ", "}${item}`;
      }
      paraText = `${paraText} ${items.join("; ")}`;
    }
    let desc = [lead, paraText].filter(Boolean).join(" ");
    const info = index.get(name);
    if (!desc) {
      desc = info?.summary ?? "";
      log.warn(`settings: ${name} has no paragraph; used the index summary`);
    }

    // Read the Scope, Type, and Default bullets with their nested sub-bullets.
    const bullet = (label) => {
      for (const b of blocks.filter((x) => x.kind === "list")) {
        const k = b.lines.findIndex((l) => l.startsWith(`* **${label}**:`));
        if (k < 0) continue;
        const head = b.lines[k].slice(`* **${label}**:`.length);
        const subs = [];
        for (let n = k + 1; n < b.lines.length && /^\s+\* /.test(b.lines[n]); n++)
          subs.push(b.lines[n].trim().slice(2));
        return { head: clean(head), subs };
      }
      return null;
    };
    const scopeB = bullet("Scope");
    const typeB = bullet("Type");
    const defB = bullet("Default");

    let scope = "";
    let scope_note = "";
    if (scopeB) {
      const m = scopeB.head.match(/^`([^`]+)`[.,]?\s*(.*)$/);
      scope = m ? m[1] : scopeB.head;
      scope_note = m ? m[2] : "";
    } else if (info) {
      scope = info.scope;
      log.warn(`settings: ${name} has no Scope bullet; used the index scope "${info.scope}"`);
    }
    let type = typeB?.head ?? "";
    if (typeB && type.endsWith(":")) {
      const values = typeB.subs.map((s) => s.match(/^`([^`]+)`/)?.[1]).filter(Boolean);
      if (values.length) type = `${type} ${values.map((v) => `\`${v}\``).join(", ")}`;
    }
    if (!typeB) log.warn(`settings: ${name} has no Type bullet`);
    if (info && info.topic !== category)
      log.warn(`settings: ${name} sits under "${category}" but the index says "${info.topic}"`);
    if (!info) log.warn(`settings: ${name} is missing from the index; anchor computed`);

    const frag = info?.frag ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    rows.push({
      name,
      desc_en: desc,
      desc_ja: "",
      status: log.status("settings", name, desc),
      anchor: `${page}#${frag}`,
      category,
      scope,
      scope_note,
      type,
      default: defB?.head ?? "",
      summary_en: info?.summary ?? "",
    });
    i = j - 1;
  }
  return rows;
}

function extractEnv(md, log) {
  const lines = md.split("\n");
  const start = findLine(lines, /^## Variables\s*$/);
  return readTable(lines, start, log.warn, "env").map(({ cells }) => {
    const name = cells[0].replace(/`/g, "");
    const desc = clean(cells[1]);
    return {
      name,
      desc_en: desc,
      desc_ja: "",
      status: log.status("env", name, desc),
      anchor: `${DOCS}env-vars#variables`,
    };
  });
}

/** Parse a docs flag cell such as "`--allowedTools`, `--allowed-tools`" or "`--advisor <model>`". */
function parseFlagCell(cell) {
  const names = [];
  let args = "";
  for (const span of codeSpans(cell)) {
    const [flag, ...rest] = span.split(/\s+/);
    names.push(flag);
    if (rest.length && !args) args = rest.join(" ");
  }
  const primary = names.find((n) => n.startsWith("--")) ?? names[0];
  return { name: primary, aliases: names.filter((n) => n !== primary), args };
}

/** Parse `Options:` or `Commands:` entries of a commander help capture. */
function parseHelpSection(text, section) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === `${section}:`);
  if (start < 0) return [];
  const entries = [];
  let cur = null;
  const entryRe =
    section === "Options" ? /^ {2}(-\S.*)$/ : /^ {2}([a-z][\w-]*(?:\|[\w-]+)*(?: .*)?)$/;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\S/.test(l)) break;
    const m = l.match(entryRe);
    if (m) {
      const [spec, ...desc] = m[1].split(/\s{2,}/);
      cur = { spec: spec.trim(), desc: desc.join(" ").trim() };
      entries.push(cur);
    } else if (cur && /^ {6,}\S/.test(l)) {
      // Long option specs wrap their help onto 6-space lines; the `mcp add` examples use 4.
      cur.desc = `${cur.desc} ${l.trim()}`.trim();
    } else if (cur && /^ {2}\S/.test(l)) {
      cur = null; // e.g. the "Examples:" block inside `mcp add`
    }
  }
  return entries;
}

function readHelp(research) {
  const dir = join(research, "raw", "help");
  const files = readdirSync(dir).filter((f) => f.endsWith(".txt"));
  return files.map((f) => ({ file: f, text: readFileSync(join(dir, f), "utf8") }));
}

function extractCliFlags(md, help, log) {
  const lines = md.split("\n");
  const start = findLine(lines, /^## CLI flags\s*$/);
  const rows = [];
  const byName = new Map();
  for (const { cells } of readTable(lines, start, log.warn, "cli flags")) {
    const f = parseFlagCell(cells[0]);
    const desc = clean(cells[1]);
    const example = codeSpans(cells[2]).join(" ; ") || clean(cells[2]);
    const row = {
      name: f.name,
      desc_en: desc,
      desc_ja: "",
      status: log.status("cli-flags", f.name, desc),
      anchor: `${DOCS}cli-reference#cli-flags`,
      aliases: f.aliases,
      args: f.args,
      example,
      in_docs: true,
      in_help: false,
      help_desc: "",
    };
    rows.push(row);
    for (const n of [f.name, ...f.aliases]) byName.set(n, row);
  }

  const rootHelp = help.find((h) => h.file === "root.txt");
  if (!rootHelp) throw new Error("raw/help/root.txt (claude --help) not found");
  for (const opt of parseHelpSection(rootHelp.text, "Options")) {
    const parts = opt.spec.split(/,\s*/);
    const names = [];
    let args = "";
    for (const p of parts) {
      const [flag, ...rest] = p.split(/\s+/);
      names.push(flag);
      if (rest.length) args = rest.join(" ");
    }
    const primary = names.find((n) => n.startsWith("--")) ?? names[0];
    const hit = names.map((n) => byName.get(n)).find(Boolean);
    if (hit) {
      hit.in_help = true;
      hit.help_desc = opt.desc;
      for (const n of names) if (n !== hit.name && !hit.aliases.includes(n)) hit.aliases.push(n);
      if (!hit.args && args) hit.args = args;
      continue;
    }
    const row = {
      name: primary,
      desc_en: opt.desc,
      desc_ja: "",
      status: log.status("cli-flags", primary, opt.desc),
      anchor: `${DOCS}cli-reference#cli-flags`,
      aliases: names.filter((n) => n !== primary),
      args,
      example: "",
      in_docs: false,
      in_help: true,
      help_desc: opt.desc,
    };
    rows.push(row);
    for (const n of names) byName.set(n, row);
  }
  return rows.toSorted((a, b) =>
    a.name.replace(/^-+/, "").localeCompare(b.name.replace(/^-+/, "")),
  );
}

/** Split a docs command such as "claude mcp login <name>" into its name and its arguments. */
function parseCliCommand(text) {
  const tokens = text.split(/\s+/);
  if (tokens[0] !== "claude" || (tokens.length > 1 && !/^[a-z][\w-]*$/.test(tokens[1]))) {
    return { name: text, args: "" }; // An invocation form such as `claude -p "query"`.
  }
  let k = 1;
  while (k < tokens.length && /^[a-z][\w-]*$/.test(tokens[k])) k++;
  return { name: tokens.slice(0, k).join(" "), args: tokens.slice(k).join(" ") };
}

function extractCliCommands(md, help, log) {
  const lines = md.split("\n");
  const start = findLine(lines, /^## CLI commands\s*$/);
  const rows = [];
  const byName = new Map();
  for (const { cells } of readTable(lines, start, log.warn, "cli commands")) {
    const { name, args } = parseCliCommand(codeSpans(cells[0])[0] ?? clean(cells[0]));
    const desc = clean(cells[1]);
    const aliases = [];
    for (const m of cells[1].matchAll(
      /(?:Alias(?:es)?:|Also accepts)\s+((?:`claude [^`]+`(?:,\s*|\s+and\s+)?)+)/g,
    )) {
      aliases.push(...codeSpans(m[1]));
    }
    const row = {
      name,
      desc_en: desc,
      desc_ja: "",
      status: log.status("cli-commands", name, desc),
      anchor: `${DOCS}cli-reference#cli-commands`,
      aliases,
      args,
      example: codeSpans(cells[2]).join(" ; ") || clean(cells[2]),
      in_docs: true,
      in_help: false,
      help_desc: "",
    };
    rows.push(row);
    byName.set(name, row);
  }

  // Walk every `Commands:` block. The parent comes from the capture's Usage line,
  // so `claude mcp` subcommands become `claude mcp add` and so on.
  for (const { text } of help) {
    const usage = text.match(/^Usage: (.+)$/m)?.[1];
    if (!usage) continue;
    const parent = [];
    for (const t of usage.split(/\s+/)) {
      if (/^[[<]/.test(t)) break;
      parent.push(t.split("|")[0]);
    }
    for (const entry of parseHelpSection(text, "Commands")) {
      const [spec, ...rest] = entry.spec.split(/\s+/);
      const [cmd, ...alts] = spec.split("|");
      if (cmd === "help") continue;
      const name = [...parent, cmd].join(" ");
      const aliases = alts.map((a) => [...parent, a].join(" "));
      const args = rest.filter((t) => t !== "[options]").join(" ");
      const hit = byName.get(name);
      if (hit) {
        hit.in_help = true;
        hit.help_desc = entry.desc;
        for (const a of aliases) if (!hit.aliases.includes(a)) hit.aliases.push(a);
        continue;
      }
      const row = {
        name,
        desc_en: entry.desc,
        desc_ja: "",
        status: log.status("cli-commands", name, entry.desc),
        anchor: `${DOCS}cli-reference#cli-commands`,
        aliases,
        args,
        example: "",
        in_docs: false,
        in_help: true,
        help_desc: entry.desc,
      };
      rows.push(row);
      byName.set(name, row);
    }
  }
  // Keep the docs order, then list help-only commands alphabetically.
  const helpOnly = rows.filter((r) => !r.in_docs).toSorted((a, b) => a.name.localeCompare(b.name));
  return [...rows.filter((r) => r.in_docs), ...helpOnly];
}

function extractHookEvents(md, log) {
  const lines = md.split("\n");
  const start = findLine(lines, /^## Hook lifecycle\s*$/);
  const headings = new Set(
    lines.filter((l) => /^### \w+\s*$/.test(l)).map((l) => l.slice(4).trim()),
  );
  // "Can block?" comes from the exit-code-2 table, which covers every event; the lifecycle table mentions blocking only for some.
  const exit2 = findLine(lines, /^\| Hook event \| Can block\? \|/);
  const blocks = new Map(
    readTable(lines, exit2, log.warn, "exit code 2").map(({ cells }) => [
      cells[0].replace(/`/g, ""),
      /^Yes\b/.test(cells[1].trim()),
    ]),
  );
  return readTable(lines, start, log.warn, "hook events").map(({ cells }) => {
    const name = cells[0].replace(/`/g, "");
    const desc = clean(cells[1]);
    if (!headings.has(name)) log.warn(`hook-events: ${name} has no ### heading; anchor falls back`);
    return {
      name,
      desc_en: desc,
      desc_ja: "",
      status: log.status("hook-events", name, desc),
      anchor: `${DOCS}hooks#${headings.has(name) ? name.toLowerCase() : "hook-lifecycle"}`,
      can_block: blocks.has(name) ? blocks.get(name) : /\bCan block\b/.test(cells[1]),
    };
  });
}

function extractTools(md, log) {
  const lines = md.split("\n");
  const start = findLine(lines, /^\| Tool \| Description \| Permission required \|/);
  const slugs = new Set(
    lines
      .filter((l) => l.startsWith("## "))
      .map((l) =>
        l
          .slice(3)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-$/, ""),
      ),
  );
  return readTable(lines, start, log.warn, "tools").map(({ cells }) => {
    const name = cells[0].replace(/`/g, "");
    const desc = clean(cells[1]);
    // Prefer the page section the row links to; otherwise use a matching "## <Tool> tool" heading.
    const own = cells[1].match(/\]\(#([a-z0-9-]+)\)/)?.[1];
    const lower = name.toLowerCase();
    const guess = [`${lower}-tool-behavior`, `${lower}-tool`].find((s) => slugs.has(s));
    const frag = own ?? guess;
    return {
      name,
      desc_en: desc,
      desc_ja: "",
      status: log.status("tools", name, desc),
      anchor: `${DOCS}tools-reference${frag ? `#${frag}` : ""}`,
      permission: clean(cells[2]),
    };
  });
}

/** Read the `-p` probe column of the notes' slash command catalog (tables A, B, C). */
function readCatalog(notes, log) {
  const lines = notes.split("\n");
  const start = findLine(lines, /^## Slash command catalog/);
  const end = findLine(lines, /^## Feature notes/, start);
  const probe = new Map();
  for (let i = start; i < end; i++) {
    if (!lines[i].startsWith("| # | Command | Aliases |")) continue;
    const header = splitRow(lines[i]);
    const col = header.findIndex((h) => h.includes("-p` probe"));
    for (const { cells } of readTable(lines, i, log.warn, "commands-ui catalog")) {
      for (const n of codeSpans(cells[1])) probe.set(n, cells[col]);
    }
  }
  return probe;
}

function extractCommands(md, init, catalog, log) {
  const lines = md.split("\n");
  const start = findLine(lines, /^## All commands\s*$/);
  const rows = [];
  const aliasOf = [];
  for (const { cells } of readTable(lines, start, log.warn, "commands")) {
    const raw = cells[1];
    const target = raw.match(/^Alias (?:for|of) \[?`(\/[\w-]+)`/);
    if (target) {
      aliasOf.push({ alias: codeSpans(cells[0])[0].split(/\s+/)[0], target: target[1] });
      continue;
    }
    const kind = raw.startsWith("**[Skill]")
      ? "bundled-skill"
      : raw.startsWith("**[Workflow]")
        ? "bundled-workflow"
        : "builtin";
    const desc = clean(raw.replace(/^\*\*\[(?:Skill|Workflow)\]\([^)]*\)\.\*\*\s*/, ""));
    // Fold only explicit alias statements about this row; skip history such as
    // "were aliases of `/feedback`" and "`/ultrareview` is an alias".
    const aliases = [];
    for (const m of raw.matchAll(/(?:^|\.\s+)Alias(?:es)?:\s+((?:`\/[^`]+`(?:,\s*)?)+)/g))
      aliases.push(...codeSpans(m[1]));
    for (const m of raw.matchAll(/Also available as\s+`(\/[^`]+)`/g)) aliases.push(m[1]);
    for (const m of raw.matchAll(/`(\/[\w-]+)` and `(\/[\w-]+)` are aliases/g))
      aliases.push(m[1], m[2]);
    const spans = codeSpans(cells[0]);
    const entries =
      spans.length > 1
        ? spans.map((s) => ({ name: s, args: "" }))
        : [{ name: spans[0].split(/\s+/)[0], args: spans[0].split(/\s+/).slice(1).join(" ") }];
    for (const { name, args } of entries) {
      const removed = /^Removed\b/.test(desc);
      rows.push({
        name,
        desc_en: desc,
        desc_ja: "",
        status: log.status("commands", name, desc, { allowRemoved: true }),
        anchor: `${DOCS}commands#all-commands`,
        aliases: [...new Set(aliases)],
        args,
        kind,
        removed,
        in_init: init.has(name.slice(1).replace(/\s+/g, "-")),
        headless: catalog.get(name) ?? "",
      });
    }
  }
  for (const { alias, target } of aliasOf) {
    const row = rows.find((r) => r.name === target);
    if (!row) {
      log.warn(`commands: alias ${alias} points at missing ${target}`);
      continue;
    }
    if (!row.aliases.includes(alias)) row.aliases.push(alias);
  }
  for (const r of rows) if (!r.headless) log.warn(`commands: no catalog probe for ${r.name}`);
  const known = new Set(rows.map((r) => r.name.slice(1).replace(/\s+/g, "-")));
  const extra = [...init].filter((n) => !known.has(n));
  log.warn(`commands: init names with no docs row: ${extra.join(", ")}`);
  return rows;
}

// ---------- Writing ----------

/** Write rows, carrying over each existing desc_ja whose desc_en is unchanged. */
function writeData(name, rows, log) {
  const file = join(root, "data", "full", `${name}.json`);
  if (existsSync(file)) {
    const old = new Map(JSON.parse(readFileSync(file, "utf8")).map((r) => [r.name, r]));
    for (const r of rows) {
      const prev = old.get(r.name);
      if (!prev?.desc_ja) continue;
      if (prev.desc_en === r.desc_en) r.desc_ja = prev.desc_ja;
      else log.warn(`${name}: ${r.name} changed its desc_en; dropped the old desc_ja`);
    }
  }
  writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
  return rows.length;
}

function main() {
  const research = process.env.CCDD_RESEARCH;
  if (!research) {
    console.error(
      "CCDD_RESEARCH is not set. Point it at the research root that holds docs/, raw/, notes/.",
    );
    process.exit(2);
  }
  if (!existsSync(join(research, "docs", "settings-reference.md"))) {
    console.error("CCDD_RESEARCH does not contain docs/settings-reference.md.");
    process.exit(2);
  }
  const doc = (page) => readFileSync(join(research, "docs", `${page}.md`), "utf8");
  const log = makeLog();
  const help = readHelp(research);
  const initFile = join(research, "raw", "headless", "safe_nousersettings_stream.redacted.json");
  const events = [JSON.parse(readFileSync(initFile, "utf8"))].flat();
  const initEvent = events.find((e) => e.type === "system" && e.subtype === "init");
  const init = new Set(initEvent?.slash_commands ?? []);
  if (!init.size) throw new Error("the safe-mode init capture has no slash_commands");
  const catalog = readCatalog(readFileSync(join(research, "notes", "commands-ui.md"), "utf8"), log);

  mkdirSync(join(root, "data", "full"), { recursive: true });
  const counts = {
    settings: writeData("settings", extractSettings(doc("settings-reference"), log), log),
    env: writeData("env", extractEnv(doc("env-vars"), log), log),
    "cli-flags": writeData("cli-flags", extractCliFlags(doc("cli-reference"), help, log), log),
    "cli-commands": writeData(
      "cli-commands",
      extractCliCommands(doc("cli-reference"), help, log),
      log,
    ),
    "hook-events": writeData("hook-events", extractHookEvents(doc("hooks"), log), log),
    tools: writeData("tools", extractTools(doc("tools-reference"), log), log),
    commands: writeData("commands", extractCommands(doc("commands"), init, catalog, log), log),
  };

  console.log("== row counts");
  for (const [k, v] of Object.entries(counts)) console.log(`${k}\t${v}`);
  console.log("\n== non-ga statuses (review these)");
  console.log(log.statuses.join("\n") || "(none)");
  console.log("\n== near-misses left as ga (review these)");
  console.log(log.nearMisses.join("\n") || "(none)");
  console.log("\n== parse warnings");
  console.log(log.warnings.join("\n") || "(none)");
}

if (import.meta.main) main();
