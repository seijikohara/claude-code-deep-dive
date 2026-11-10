#!/usr/bin/env node
// Validate Japanese description batches and merge them into data/full/*.json,
// then write the publishable data/*.json without the English source text.
// A batch file is data/ja/<data-name>.<nn>.json holding {"<row name>": "<desc_ja>"}.
// Usage:
//   node tools/apply-ja.mjs --check data/ja/env.01.json   validate only
//   node tools/apply-ja.mjs [batch ...]                    validate, then merge (default: every data/ja/*.json)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, resolve } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const JA = /[぀-ヿ一-鿿]/;
const MIN = 25;
const MAX = 70;
// A short English source cannot yield 25 characters without added facts, so it gets a lower floor.
const SHORT_SOURCE = 80;
const SHORT_MIN = 8;

/** Return the visible length: every character except the backtick marks. */
export const visibleLength = (s) => [...s.replace(/`/g, "")].length;

/** Return the problems with one translation, or an empty list. */
export function validate(row, ja) {
  const errors = [];
  if (typeof ja !== "string" || !ja.trim()) return ["empty"];
  const len = visibleLength(ja);
  const min = row.desc_en.length < SHORT_SOURCE ? SHORT_MIN : MIN;
  if (len < min || len > MAX) errors.push(`length ${len} outside ${min}-${MAX}`);
  if (!JA.test(ja.replace(/`[^`]*`/g, ""))) errors.push("no Japanese text");
  if (!ja.endsWith("。")) errors.push("must end with 。");
  if ((ja.match(/。/g) ?? []).length > 1) errors.push("more than one sentence");
  if ((ja.match(/`/g) ?? []).length % 2) errors.push("unbalanced backticks");
  const known = [row.name, ...(row.aliases ?? []), row.desc_en, row.summary_en ?? ""].join("\n");
  for (const m of ja.matchAll(/`([^`]+)`/g)) {
    if (!known.includes(m[1])) errors.push(`code span \`${m[1]}\` is not in the name or desc_en`);
  }
  if (/\/Users\/|\/home\//.test(ja)) errors.push("contains a home path");
  return errors;
}

function loadBatch(file) {
  const target = basename(file).replace(/\.\d+\.json$/, "");
  if (target === basename(file))
    throw new Error(`${file}: name must look like <data-name>.<nn>.json`);
  return { target, entries: JSON.parse(readFileSync(file, "utf8")) };
}

function main(argv) {
  const check = argv.includes("--check");
  let files = argv.filter((a) => a !== "--check").map((a) => resolve(a));
  if (!files.length) {
    const dir = join(root, "data", "ja");
    files = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".json"))
          .toSorted()
          .map((f) => join(dir, f))
      : [];
  }
  const data = new Map();
  const load = (name) => {
    if (!data.has(name))
      data.set(name, JSON.parse(readFileSync(join(root, "data", "full", `${name}.json`), "utf8")));
    return data.get(name);
  };

  let bad = 0;
  let ok = 0;
  for (const file of files) {
    const { target, entries } = loadBatch(file);
    const rows = new Map(load(target).map((r) => [r.name, r]));
    for (const [name, ja] of Object.entries(entries)) {
      const row = rows.get(name);
      const errors = row ? validate(row, ja) : [`no row named ${name} in data/${target}.json`];
      if (errors.length) {
        bad++;
        console.log(`${basename(file)}\t${name}\t${errors.join("; ")}\t${ja}`);
        continue;
      }
      ok++;
      row.desc_ja = ja;
    }
  }
  console.log(`${ok} valid, ${bad} invalid`);
  if (!check) {
    for (const [name, rows] of data) {
      writeFileSync(
        join(root, "data", "full", `${name}.json`),
        `${JSON.stringify(rows, null, 2)}\n`,
      );
      writeFileSync(
        join(root, "data", `${name}.json`),
        `${JSON.stringify(rows.map(slim), null, 2)}\n`,
      );
      const empty = rows.filter((r) => !r.desc_ja).length;
      console.log(`data/${name}.json: ${rows.length - empty}/${rows.length} rows have desc_ja`);
    }
  }
  process.exit(bad ? 1 : 0);
}

// Fields that quote the docs verbatim. They stay in data/full/ (local) and are not published.
const VERBATIM_FIELDS = [
  "desc_en",
  "summary_en",
  "help_desc",
  "scope_note",
  "type",
  "default",
  "example",
];

/** Return a copy of `row` without the verbatim docs text. */
export function slim(row) {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !VERBATIM_FIELDS.includes(k)));
}

if (import.meta.main) main(process.argv.slice(2));
