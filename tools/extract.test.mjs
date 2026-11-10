import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reduceLinks, splitRow, deriveStatus } from "./extract.mjs";
import { validate } from "./apply-ja.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["settings", "env", "cli-flags", "cli-commands", "hook-events", "tools", "commands"];
const DOCS = "https://code.claude.com/docs/en/";

// data/full/ holds the English source text and exists only where tools/extract.mjs ran (not in CI).
const FULL = existsSync(join(root, "data", "full", "settings.json"));
const NEEDS_FULL = { skip: FULL ? false : "data/full/ is local only; run tools/extract.mjs" };

const load = (name) => {
  const file = join(root, "data", "full", `${name}.json`);
  assert.ok(existsSync(file), `data/full/${name}.json is missing; run tools/extract.mjs`);
  return JSON.parse(readFileSync(file, "utf8"));
};

await test("reduceLinks keeps link text and drops the URL", () => {
  assert.equal(
    reduceLinks("See [hooks](https://code.claude.com/docs/en/hooks.md#x) and [`a`](#a)"),
    "See hooks and `a`",
  );
});

await test("splitRow honors escaped pipes", () => {
  assert.deepEqual(splitRow("| `/advisor [model\\|off]` | Enable it |"), [
    "`/advisor [model|off]`",
    "Enable it",
  ]);
});

await test("deriveStatus reads only label-like markers about the entry itself", () => {
  assert.equal(deriveStatus("\\[DEPRECATED] Name of a model").status, "deprecated");
  assert.equal(deriveStatus("Only set when the deprecated `X` is also set").status, "ga");
  assert.equal(deriveStatus("Set `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` to 1").status, "ga");
  assert.equal(deriveStatus("(Research preview) MCP servers to listen to").status, "preview");
  assert.equal(deriveStatus("Agent teams are experimental and disabled").status, "experimental");
  assert.equal(deriveStatus("Removed in v2.1.91.", { allowRemoved: true }).status, "removed");
  assert.equal(deriveStatus("Removed in v2.1.91.").status, "removed");
});

await test("validate enforces one sentence, length, and known code spans", () => {
  const row = { name: "X", desc_en: "Set `FOO` to 1 to turn the feature on for every session." };
  assert.deepEqual(validate(row, "`FOO` を 1 にすると全セッションで機能が有効になる。"), []);
  assert.match(validate(row, "有効にする。全セッション。").join(), /more than one sentence/);
  assert.match(validate(row, "`BAR` を 1 にすると全セッションで機能が有効になる。").join(), /BAR/);
  const long = { name: "Y", desc_en: "x".repeat(100) };
  assert.match(validate(long, "短すぎる説明。").join(), /length/);
});

await test("row counts match the docs", NEEDS_FULL, () => {
  assert.equal(load("settings").length, 249);
  assert.equal(load("env").length, 402);
  assert.equal(load("hook-events").length, 33);
});

await test("every row has the shared fields", NEEDS_FULL, () => {
  for (const name of FILES) {
    for (const row of load(name)) {
      for (const key of ["name", "desc_en", "desc_ja", "status", "anchor"]) {
        assert.equal(typeof row[key], "string", `${name}: ${row.name} lacks ${key}`);
      }
    }
  }
});

await test("no row has an empty name or desc_en", NEEDS_FULL, () => {
  for (const name of FILES) {
    for (const row of load(name)) {
      assert.ok(row.name.trim(), `${name}: empty name`);
      assert.ok(row.desc_en.trim(), `${name}: ${row.name} has an empty desc_en`);
    }
  }
});

await test("names are unique within each file", NEEDS_FULL, () => {
  for (const name of FILES) {
    const names = load(name).map((r) => r.name);
    assert.equal(new Set(names).size, names.length, `${name}: duplicate names`);
  }
});

await test("every anchor points at the public docs", NEEDS_FULL, () => {
  for (const name of FILES) {
    for (const row of load(name)) {
      assert.ok(row.anchor.startsWith(DOCS), `${name}: ${row.name} anchor ${row.anchor}`);
    }
  }
});

await test("advisorModel has a description and a scope", NEEDS_FULL, () => {
  const row = load("settings").find((r) => r.name === "advisorModel");
  assert.ok(row, "advisorModel is missing");
  assert.ok(row.desc_en.length > 0);
  assert.ok(row.scope.length > 0);
  assert.equal(row.anchor, `${DOCS}settings-reference#advisormodel`);
});

await test("ANTHROPIC_API_KEY is in env", NEEDS_FULL, () => {
  assert.ok(load("env").some((r) => r.name === "ANTHROPIC_API_KEY"));
});

await test("commands.json holds the expected slash commands", NEEDS_FULL, () => {
  const rows = load("commands");
  const names = new Set(rows.map((r) => r.name));
  for (const n of ["/advisor", "/compact", "/code-review"]) assert.ok(names.has(n), n);
  for (const r of rows) assert.ok(r.name.startsWith("/"), r.name);
  for (const r of rows) for (const a of r.aliases) assert.ok(a.startsWith("/"), a);
});

await test("commands.json folds alias-only rows into their targets", NEEDS_FULL, () => {
  const rows = load("commands");
  const names = new Set(rows.map((r) => r.name));
  for (const alias of ["/cost", "/stats", "/review"]) assert.ok(!names.has(alias), alias);
  const usage = rows.find((r) => r.name === "/usage");
  assert.deepEqual(
    usage.aliases.toSorted((a, b) => a.localeCompare(b)),
    ["/cost", "/stats"],
  );
  const review = rows.find((r) => r.name === "/code-review");
  assert.deepEqual(review.aliases, ["/review"]);
});

await test("commands.json kinds and removed rows match the docs markers", NEEDS_FULL, () => {
  const rows = load("commands");
  const count = (pred) => rows.filter(pred).length;
  assert.equal(
    count((r) => r.kind === "bundled-skill"),
    20,
  );
  assert.equal(
    count((r) => r.kind === "bundled-workflow"),
    1,
  );
  assert.equal(
    count((r) => r.removed),
    3,
  );
  assert.equal(
    count((r) => !r.removed),
    116,
  );
  const aliases = rows.flatMap((r) => r.aliases);
  assert.equal(new Set(aliases).size, 24);
});

await test("hook events carry can_block", NEEDS_FULL, () => {
  const rows = load("hook-events");
  assert.ok(rows.every((r) => typeof r.can_block === "boolean"));
  assert.equal(rows.find((r) => r.name === "PreToolUse").can_block, true);
});

await test("every row has a Japanese description", NEEDS_FULL, () => {
  for (const name of FILES) {
    const empty = load(name)
      .filter((r) => !r.desc_ja.trim())
      .map((r) => r.name);
    assert.deepEqual(empty, [], `${name}: rows without desc_ja`);
  }
});

await test("every Japanese description passes the batch rules", NEEDS_FULL, () => {
  for (const name of FILES) {
    for (const row of load(name)) {
      assert.deepEqual(validate(row, row.desc_ja), [], `${name}: ${row.name}: ${row.desc_ja}`);
    }
  }
});

await test("cli flags and commands record where each entry appears", NEEDS_FULL, () => {
  for (const name of ["cli-flags", "cli-commands"]) {
    for (const r of load(name)) {
      assert.equal(typeof r.in_docs, "boolean");
      assert.equal(typeof r.in_help, "boolean");
      assert.ok(r.in_docs || r.in_help, `${name}: ${r.name} has no source`);
    }
  }
  assert.ok(load("cli-flags").some((r) => r.name === "--print" && r.in_docs && r.in_help));
  for (const name of ["cli-flags", "cli-commands"]) {
    for (const r of load(name))
      if (r.in_help) assert.ok(r.help_desc, `${name}: ${r.name} lacks help_desc`);
  }
});
