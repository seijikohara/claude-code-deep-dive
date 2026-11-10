import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, inlineText, badge, renderTable } from "./lib/html.mjs";

await test("escapeHtml escapes markup characters", () => {
  assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

await test("inlineText turns backtick spans into code and escapes the rest", () => {
  assert.equal(inlineText("set `A<B>` & go"), "set <code>A&lt;B&gt;</code> &amp; go");
});

await test("badge returns nothing for GA and a labelled span otherwise", () => {
  assert.equal(badge("ga"), "");
  assert.equal(badge("research preview"), '<span class="badge preview">Preview</span>');
  assert.equal(badge("experimental"), '<span class="badge experimental">Experimental</span>');
});

await test("renderTable escapes cells, keeps code columns, and renders the argument line", () => {
  const html = renderTable({
    columns: [
      { key: "name", label: "名前", code: true, sub: "args" },
      { key: "d", label: "説明" },
      { key: "ok", label: "可否" },
      { key: "status", label: "状態", badge: true },
    ],
    rows: [{ name: "<x>", args: "[a|b]", d: "a < b", ok: true, status: "beta" }],
  });
  assert.match(html, /<code>&lt;x&gt;<\/code><div class="sub"><code>\[a\|<wbr>b\]<\/code><\/div>/);
  assert.match(html, /a &lt; b/);
  assert.match(html, /<td>✓<\/td>/);
  assert.match(html, /badge beta/);
});
