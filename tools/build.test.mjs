import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { escapeHtml, escapeRawBlocks, chunk, renderTableSlides, buildToc } from "./lib/html.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

await test("vendor white.css has no embedded fonts", () => {
  assert.equal(read("vendor/white.css").includes("url(data:font/woff"), false);
});

await test("deck.css keeps the Japanese fallback stack", () => {
  const css = read("src/deck.css");
  assert.match(css, /Noto Sans JP/);
  assert.match(css, /Hiragino Sans/);
});

await test("deck.css removes the code block max-height", () => {
  assert.match(read("src/deck.css"), /pre code[^{]*\{[^}]*max-height:\s*none/);
});

await test("escapeHtml escapes markup characters", () => {
  assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

await test("escapeRawBlocks escapes < and &", () => {
  const out = escapeRawBlocks(`<pre data-lang="json">{"a": "<b> & c"}</pre>`, "x.html");
  assert.equal(
    out,
    `<pre><code class="language-json" data-trim>{"a": "&lt;b&gt; &amp; c"}</code></pre>`,
  );
});

await test("escapeRawBlocks moves class to pre and line numbers to code", () => {
  const out = escapeRawBlocks(
    `<pre data-lang="bash" class="compact" data-line-numbers="1-2">a</pre>`,
    "x.html",
  );
  assert.equal(
    out,
    `<pre class="compact"><code class="language-bash" data-trim data-line-numbers="1-2">a</code></pre>`,
  );
});

await test("escapeRawBlocks keeps a script tag inert", () => {
  const out = escapeRawBlocks(`<pre data-lang="html"><script>alert(1)</script></pre>`, "x.html");
  assert.equal(out.includes("<script>"), false);
});

await test("escapeRawBlocks rejects nested </pre>", () => {
  const src = `<section>\n<pre data-lang="html">\n<pre data-lang="x">a</pre>\n</pre>\n</section>`;
  assert.throws(() => escapeRawBlocks(src, "ch.html"), /ch\.html:2: .*<\/pre>/);
});

await test("chunk splits 41 rows into 18/18/5", () => {
  const sizes = chunk(
    Array.from({ length: 41 }, (_, i) => i),
    18,
  ).map((c) => c.length);
  assert.deepEqual(sizes, [18, 18, 5]);
});

await test("renderTableSlides titles slides (1/3)…(3/3)", () => {
  const html = renderTableSlides({
    id: "apx-tools",
    title: "組み込みツール",
    columns: [{ key: "name", label: "名前" }],
    rows: Array.from({ length: 41 }, (_, i) => ({ name: `T${i}` })),
    rowsPerSlide: 18,
    src: '<a href="https://code.claude.com/docs/en/tools-reference">tools-reference</a>',
  });
  assert.match(html, /組み込みツール \(1\/3\)/);
  assert.match(html, /組み込みツール \(3\/3\)/);
  assert.equal((html.match(/<footer class="src">/g) || []).length, 3);
  assert.match(html, /id="apx-tools-3"/);
});

await test("renderTableSlides escapes cell text but keeps code spans", () => {
  const html = renderTableSlides({
    id: "t",
    title: "t",
    columns: [
      { key: "name", label: "n", code: true },
      { key: "d", label: "d" },
    ],
    rows: [{ name: "<x>", d: "a < b" }],
    rowsPerSlide: 10,
    src: "s",
  });
  assert.match(html, /<code>&lt;x&gt;<\/code>/);
  assert.match(html, /a &lt; b/);
});

await test("buildToc links every chapter", () => {
  const toc = buildToc([
    { id: "ch01", part: "Part I", title: "仕組み" },
    { id: "ch02", part: "Part I", title: "モデル選択" },
  ]);
  assert.match(toc, /href="#\/ch01"/);
  assert.match(toc, /href="#\/ch02"/);
});

await test("build writes a full document and an artifact fragment", () => {
  execFileSync("node", [join(root, "tools/build.mjs")], { cwd: root, stdio: "pipe" });
  const full = read("index.html");
  const frag = read("build/artifact.html");
  assert.match(full, /^<!doctype html>/i);
  assert.equal(/<!doctype|<html[\s>]|<body[\s>]|<head[\s>]/i.test(frag), false);
  assert.match(frag, /^<title>/);
  for (const html of [full, frag]) {
    assert.match(html, /reveal\.js\/6\.0\.2\/reveal\.min\.js/);
    assert.equal(
      /<link[^>]+stylesheet[^>]+href="(?!https:\/\/fonts\.googleapis\.com)/.test(html),
      false,
    );
  }
  assert.ok(existsSync(join(root, "build/artifact.html")));
});
