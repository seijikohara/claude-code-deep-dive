// Lint the built deck: identifiers against the research corpus, privacy, data coverage, and source footers.
// Usage: CCDD_RESEARCH=<research dir> node tools/lint.mjs [--html index.html] [--only=ids,privacy,coverage,sources]
// Exit status: 0 when clean, 1 on any finding, 2 on a usage or configuration error.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  extractIdentifiers,
  checkIdentifiers,
  checkPrivacy,
  checkCoverage,
  checkSources,
} from "./lib/lint-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKS = ["ids", "privacy", "coverage", "sources"];
const PRIVACY_FILE = join(root, "tools/privacy-patterns.local.json");

class UsageError extends Error {}

function listFiles(dir, recursive) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name))
    .toSorted();
}

/** Return true when the first 8 KB contain no NUL byte, the usual sign of a binary file. */
function isText(buf) {
  return !buf.subarray(0, 8192).includes(0);
}

/** Concatenate the research corpus: docs mirror, raw captures, machine notes, and redacted lab outputs. */
function loadCorpus(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    throw new UsageError(`CCDD_RESEARCH is not a directory`);
  const files = [
    ...listFiles(join(dir, "docs"), false).filter((f) => f.endsWith(".md")),
    ...listFiles(join(dir, "raw"), true),
    ...[join(dir, "machine.md")].filter(existsSync),
    ...listFiles(join(dir, "lab"), true).filter((f) => /\.(txt|json|md)$/.test(f)),
  ];
  const parts = [];
  for (const f of files) {
    const buf = readFileSync(f);
    if (isText(buf)) parts.push(buf.toString("utf8"));
  }
  if (parts.length === 0) throw new UsageError("CCDD_RESEARCH holds no corpus files");
  const text = parts.join("\n");
  return { text, files: parts.length, mb: (text.length / 1e6).toFixed(1) };
}

/** Return every `name` and command alias from the data files that exist. */
function loadCoverageEntries() {
  const files = listFiles(join(root, "data"), false).filter((f) => f.endsWith(".json"));
  const entries = new Set();
  for (const f of files) {
    const data = JSON.parse(readFileSync(f, "utf8"));
    const rows = Array.isArray(data) ? data : (Object.values(data).find(Array.isArray) ?? []);
    for (const row of rows) {
      if (typeof row?.name === "string") entries.add(row.name);
      if (Array.isArray(row?.aliases))
        for (const a of row.aliases) if (typeof a === "string") entries.add(a);
    }
  }
  return { files: files.map((f) => relative(root, f)), entries: [...entries] };
}

function loadPrivacyPatterns() {
  if (!existsSync(PRIVACY_FILE)) {
    console.error(`warning: ${relative(root, PRIVACY_FILE)} not found; checking UUIDs only`);
    return [];
  }
  const data = JSON.parse(readFileSync(PRIVACY_FILE, "utf8"));
  if (!Array.isArray(data) || !data.every((p) => typeof p === "string")) {
    throw new UsageError(`${relative(root, PRIVACY_FILE)} must be a JSON array of strings`);
  }
  return data;
}

function lineCol(text, index) {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  return `${line}:${index - before.lastIndexOf("\n")}`;
}

function parseOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    options: { html: { type: "string" }, only: { type: "string" } },
  });
  const only = values.only
    ? values.only
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : CHECKS;
  const unknown = only.filter((c) => !CHECKS.includes(c));
  if (unknown.length)
    throw new UsageError(`unknown check: ${unknown.join(", ")} (expected ${CHECKS.join(",")})`);
  return { html: values.html ? resolve(values.html) : join(root, "index.html"), only };
}

function run(argv) {
  const opts = parseOptions(argv);
  if (!existsSync(opts.html))
    throw new UsageError(`${opts.html} not found; run node tools/build.mjs first`);
  // <wbr> hints split identifiers in generated tables; drop them before matching.
  const html = readFileSync(opts.html, "utf8").replace(/<wbr>/g, "");
  const lines = [`lint: ${relative(process.cwd(), opts.html) || opts.html}`];
  let findings = 0;
  const report = (title, items) => {
    findings += items.length;
    lines.push(`${title}`);
    for (const item of items) lines.push(`  ${item}`);
  };

  if (opts.only.includes("ids")) {
    const dir = process.env.CCDD_RESEARCH;
    if (!dir)
      throw new UsageError("CCDD_RESEARCH is not set; it must point at the research directory");
    const corpus = loadCorpus(dir);
    const ids = extractIdentifiers(html);
    const unmatched = checkIdentifiers(ids, corpus.text).toSorted(
      (a, b) =>
        a.slideId.localeCompare(b.slideId) ||
        a.kind.localeCompare(b.kind) ||
        a.value.localeCompare(b.value),
    );
    const exempt = ids.filter((i) => i.undocumented).length;
    report(
      `ids: ${unmatched.length} unmatched of ${ids.length} identifiers (${exempt} undocumented exempt; corpus ${corpus.files} files, ${corpus.mb} M chars)`,
      unmatched.map((u) => `${u.slideId || "(no slide)"}  ${u.kind}  ${u.value}`),
    );
  }

  if (opts.only.includes("privacy")) {
    const patterns = loadPrivacyPatterns();
    // The report names a pattern by its position in the local file so that the private string itself is never printed.
    const hits = checkPrivacy(html, patterns);
    report(
      `privacy: ${hits.length} findings (${patterns.length} local patterns + UUID rule)`,
      hits.map((h) =>
        h.pattern === "UUID"
          ? `UUID at ${lineCol(html, h.index)}`
          : `pattern #${patterns.indexOf(h.pattern) + 1} at ${lineCol(html, h.index)}`,
      ),
    );
  }

  if (opts.only.includes("coverage")) {
    const { files, entries } = loadCoverageEntries();
    if (files.length === 0) {
      lines.push("coverage: skipped (no data/*.json yet)");
    } else {
      const missing = checkCoverage(html, entries);
      report(
        `coverage: ${missing.length} missing of ${entries.length} entries (${files.join(", ")})`,
        missing,
      );
    }
  }

  if (opts.only.includes("sources")) {
    const missing = checkSources(html);
    report(`sources: ${missing.length} content slides without .src`, missing);
  }

  lines.push(findings === 0 ? "OK: no findings" : `FAIL: ${findings} findings`);
  console.log(lines.join("\n"));
  return findings === 0 ? 0 : 1;
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (e) {
  if (!(e instanceof UsageError) && !String(e?.code).startsWith("ERR_PARSE_ARGS")) throw e;
  console.error(`lint: ${e.message}`);
  process.exitCode = 2;
}
