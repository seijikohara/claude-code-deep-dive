import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  extractIdentifiers,
  checkIdentifiers,
  checkPrivacy,
  checkCoverage,
  checkSources,
} from "./lib/lint-rules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(here, "fixtures", name), "utf8");
const deck = fixture("lint-deck.html");
const HOOKS = { hookEvents: ["PreToolUse", "PostToolUse"] };

const find = (ids, kind, value) => ids.find((i) => i.kind === kind && i.value === value);
const values = (ids, kind) => ids.filter((i) => i.kind === kind).map((i) => i.value);

await test("flags env vars commands are extracted from code", () => {
  const ids = extractIdentifiers(deck, HOOKS);
  assert.deepEqual(find(ids, "flag", "--model"), {
    kind: "flag",
    value: "--model",
    slideId: "s-basic",
    undocumented: false,
  });
  assert.ok(find(ids, "flag", "--add-dir"));
  assert.ok(find(ids, "env", "CLAUDE_CODE_USE_BEDROCK"));
  assert.ok(find(ids, "env", "ANTHROPIC_API_KEY"));
  assert.ok(find(ids, "command", "/compact"));
  assert.ok(find(ids, "hook", "PreToolUse"));
});

await test("text outside code, paths, scripts and styles yield no identifiers", () => {
  const ids = extractIdentifiers(deck, HOOKS);
  const all = ids.map((i) => i.value);
  for (const v of [
    "--not-in-code",
    "CLAUDE_CODE_PROSE_ONLY",
    "--style-flag",
    "--script-flag",
    "/etc",
  ]) {
    assert.equal(all.includes(v), false, `${v} must not be extracted`);
  }
  assert.deepEqual(values(ids, "command"), ["/compact"]);
});

await test("settings key in a JSON block is extracted", () => {
  const ids = extractIdentifiers(deck, HOOKS);
  assert.deepEqual(values(ids, "setting").toSorted(), ["defaultMode", "env", "permissions"]);
  assert.equal(find(ids, "setting", "defaultMode").slideId, "s-json");
  assert.ok(find(ids, "env", "MAX_THINKING_TOKENS"));
  assert.equal(find(ids, "setting", "notInJsonBlock"), undefined);
});

await test("hook events are skipped without a hook list", () => {
  const ids = extractIdentifiers(deck, { hookEvents: [] });
  assert.equal(values(ids, "hook").length, 0);
});

await test("unknown CLAUDE_CODE_NOT_A_REAL_VAR is reported", () => {
  const ids = extractIdentifiers(deck, HOOKS);
  const corpus = "Set CLAUDE_CODE_USE_BEDROCK=1 and CLAUDE_CODE_NOT_A_REAL_VARIANT.";
  const unmatched = checkIdentifiers(ids, corpus);
  assert.ok(
    unmatched.some(
      (u) => u.value === "CLAUDE_CODE_NOT_A_REAL_VAR" && u.slideId === "s-fake" && u.kind === "env",
    ),
  );
  assert.equal(
    unmatched.some((u) => u.value === "CLAUDE_CODE_USE_BEDROCK"),
    false,
  );
});

await test("undocumented badge exempts an identifier", () => {
  const ids = extractIdentifiers(deck, HOOKS);
  assert.equal(find(ids, "env", "CLAUDE_CODE_SECRET_KNOB").undocumented, true);
  assert.equal(find(ids, "flag", "--secret-flag").undocumented, true);
  assert.equal(find(ids, "flag", "--hidden-flag").undocumented, true);
  assert.equal(find(ids, "flag", "--visible-flag").undocumented, false);
  const unmatched = checkIdentifiers(ids, "").map((u) => u.value);
  for (const v of ["CLAUDE_CODE_SECRET_KNOB", "--secret-flag", "--hidden-flag"]) {
    assert.equal(unmatched.includes(v), false, `${v} must be exempt`);
  }
  assert.ok(unmatched.includes("--visible-flag"));
});

await test("a badge outside the h2 does not exempt the slide", () => {
  const ids = extractIdentifiers(deck, HOOKS);
  assert.equal(find(ids, "env", "CLAUDE_CODE_LEGEND_VAR").undocumented, false);
});

await test("flags match exactly and commands match with or without the slash", () => {
  const ids = [
    { kind: "flag", value: "--foo", slideId: "a", undocumented: false },
    { kind: "flag", value: "--bar", slideId: "a", undocumented: false },
    { kind: "command", value: "/compact", slideId: "b", undocumented: false },
    { kind: "command", value: "/add", slideId: "b", undocumented: false },
  ];
  const corpus = 'claude --foo-bar x\n| `--bar` | yes |\n{"name": "compact"}\nuse /add-dir here';
  assert.deepEqual(
    checkIdentifiers(ids, corpus).map((u) => u.value),
    ["--foo", "/add"],
  );
});

await test("UUID is reported as private", () => {
  const html = `<p>session 123e4567-E89B-42d3-a456-426614174000 by Alice</p>`;
  const found = checkPrivacy(html, ["alice", ""]);
  assert.ok(found.some((f) => f.pattern === "UUID" && f.index === html.indexOf("123e4567")));
  assert.ok(found.some((f) => f.pattern === "alice" && f.index === html.indexOf("Alice")));
  assert.equal(found.length, 2);
});

await test("missing command is reported", () => {
  const html = `<td><code>/compact</code></td><td><code>/add-dir</code></td><td>a &lt; b</td>`;
  assert.deepEqual(checkCoverage(html, ["/compact", "/add", "/add-dir", "/rewind", "a < b"]), [
    "/add",
    "/rewind",
  ]);
});

await test("divider slides need no source", () => {
  assert.deepEqual(checkSources(deck), ["s-nosrc"]);
  assert.deepEqual(checkSources(fixture("lint-clean.html")), []);
});

const runLintCli = (html) =>
  spawnSync(
    process.execPath,
    [join(here, "lint.mjs"), "--html", join(here, "fixtures", html), "--only=sources"],
    {
      encoding: "utf8",
    },
  );

await test("CLI exits 1 with a grouped report on findings", () => {
  const run = runLintCli;
  const bad = run("lint-deck.html");
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stdout, /sources/i);
  assert.match(bad.stdout, /s-nosrc/);
  const good = run("lint-clean.html");
  assert.equal(good.status, 0, good.stdout + good.stderr);
});
