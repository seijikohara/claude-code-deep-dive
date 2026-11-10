# Authoring guide

Read this guide, `docs/design.md`, and `docs/ledger.md` before writing any slide.
The reference implementation is `src/chapters/p1-c05-advisor.html`; copy its patterns.

## 1. Files and ids

- One file per chapter: `src/chapters/p<part>-c<NN>-<slug>.html`, e.g. `p1-c02-models.html`. Part dividers use `c00`, e.g. `p1-c00-part.html`. The appendix part uses `pX`.
- Files sort by name; the sort order is the deck order.
- The outer `<section>` is the chapter stack:
  `<section id="ch02" data-part="Part I 基礎の深掘り" data-chapter="Ch2" data-title="モデル選択">`
- Slide ids: `ch02-<slug>`, lowercase ASCII with hyphens, unique in the deck. Ids become URLs (`#/ch02-aliases`).
- Exact `data-part` strings:
  - `Part 0 導入`
  - `Part I 基礎の深掘り`
  - `Part II 操作`
  - `Part III 設定と安全`
  - `Part IV 拡張`
  - `Part V 並列化`
  - `Part VI 自動化`
  - `Part VII プラットフォーム`
  - `Part VIII エンタープライズ`
  - `Part IX まとめ`
  - `Part X 全件付録`

## 2. Slide skeleton

```html
<section id="ch02-aliases">
  <h2>エイリアスの解決結果 <span class="badge preview">Preview</span></h2>
  ... content ...
  <footer class="src">
    出典:
    <a href="https://code.claude.com/docs/en/model-config#model-aliases"
      >model-config#model-aliases</a
    >
    · <a href="https://code.claude.com/docs/en/changelog">changelog 2.1.321</a> · 実機確認 2.1.321
  </footer>
</section>
```

- The first inner section is the chapter title slide (`class="chapter-title"`) with `<p class="chapter-label">05</p>` (the chapter number, two digits), `<h1>`, `<p class="chapter-summary">`, and `<!--CHAPTER-TOC-->`. The build fills the TOC and adds the running head (chapter number and name) to every other slide. Never write a kicker or eyebrow label yourself.
- Part dividers: `<section id="part2" class="part-divider" data-part="Part II 操作"><p class="part-label">II</p><h1>…</h1><p>…</p><!--PART-TOC--></section>`.
- `h2` is the slide title in Japanese; identifiers stay verbatim inside `<code>`.
- Badges go in the `h2` when the whole slide's feature is non-GA: `beta`, `preview`, `experimental`, `undocumented`, `deprecated`, `removed`. Use the ledger's status label; never invent one.
- Every content slide ends with `<footer class="src">`. List docs pages as links with their anchors, changelog versions as text, and `実機確認 2.1.321` when you or the research verified the fact on the binary.

## 3. Components

| Need                      | Markup                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two or three columns      | `<div class="cols-2">…</div>`, `<div class="cols-3">…</div>`                                                                                                   |
| Group with a heading      | `<div class="card"><h3>…</h3>…</div>` (no box: heading and space only)                                                                                         |
| Table                     | plain `<table>` (21px); `class="dense"` (18px) for 8+ rows                                                                                                     |
| Smaller text              | `class="small"` on `ul`/`p` (21px)                                                                                                                             |
| Note / warning / conflict | `<div class="callout note">`, `callout warn`, `callout conflict` (label is automatic)                                                                          |
| Observed output           | `<div class="lab"><pre data-lang="text">…</pre></div>`: a dark terminal panel labelled 実測 2.1.321 automatically. Use it only for real output from the binary |
| Keys                      | `<kbd>Ctrl</kbd>+<kbd>O</kbd>`                                                                                                                                 |
| Code                      | `<pre data-lang="json">RAW TEXT</pre>`; add `class="compact"` for 16px                                                                                         |
| Generated table           | `<!--TABLE {"data":"commands","filter":{…},"columns":[…],"rowsPerSlide":16,"title":"…","id":"…","src":"…"}-->` (see `tools/build.mjs`)                         |
| Link to another chapter   | `<a href="#/ch06-autocompact">Ch6</a>`                                                                                                                         |

Code blocks are raw: paste code exactly and never escape `<`, `>`, `&` yourself. A code block must not contain `</pre>`.

## 4. Density budget (1600×900 canvas)

The usable area below the title is about 650px high. The design is spacious on purpose; split rather than cram.

- Body bullets (25px, line-height 1.65): about 14 lines. `small` bullets (21px): about 17 lines.
- A plain table: about 10 single-line rows. A `dense` table: about 13. Cells wrap, so long cells count as 2 lines.
- Code (18px): about 22 lines; `compact` (16px): about 26 lines.
  When content does not fit, split it into two slides with `(1/2)` / `(2/2)` titles. Never shrink text below these classes and never use `scroll-y` outside the appendix.

## 5. Writing rules (Japanese)

- Plain engineering Japanese. One idea per sentence. Concrete nouns, no vague この/それ when a noun is clearer.
- Bullets in です・ます. Table cells in short plain form (体言止め or である form without the copula).
- Identifiers, flags, settings keys, env vars, commands, file paths, and error messages stay verbatim in `<code>`.
- Quote observed output exactly. Shorten long output with `…` only, and redact IDs, paths, and account data.
- Write paths as `~/.claude/...`. Never a real home path or user name.
- No marketing tone, no opinions, no comparisons with other tools.
- Design rules (the user asked for a modern, clean deck with no AI-slop tells): no emoji, no decorative labels or eyebrows above headings, no ALL-CAPS labels, no colored highlight on a single word in a title, no arrows appended to links, no boxes around groups. Status lives only in the badge. Emphasis uses `<strong>` sparingly.

## 6. Accuracy rules

- Every fact comes from the docs mirror, the changelog, or an observed run. The notes are a map to those sources, not a source. Before writing a fact, grep the docs mirror (`$CCDD_RESEARCH/docs/<page>.md`) to confirm it.
- Follow `docs/ledger.md` for canonical numbers, status labels, conflict rulings, and owner chapters. If you find a new conflict, show it in a `callout conflict` with both readings and their sources, and report it.
- Items found only in the binary carry `Undocumented` (badge in the h2, or `<span class="undocumented">` around the item inside a mixed slide).
- Topics owned by another chapter get one sentence and a link, not a repeat.
- New observed runs: run them in `$CCDD_RESEARCH/lab/<your-group>/` with `--no-session-persistence --setting-sources project`, prefer `--model haiku`, and never run commands that change user settings, install anything, or call billed services (`ultrareview`, cloud sessions).

## 7. Checks before you report back

Several authors work at the same time, so never write `index.html` or `dist/`. Build only your own files into your own output:

```bash
export CCDD_RESEARCH=/path/to/research   # local research root (not committed)
node tools/build.mjs --only=p1-c02,p1-c03 --out=build/<group>.html
node tools/lint.mjs --html=build/<group>.html --only=ids,privacy,sources
node tools/check.mjs --html=build/<group>.html
```

All three must pass for your chapters. Fix overflow by splitting slides, not by shrinking fonts. Edit only the chapter files assigned to you; never edit `tools/`, `data/`, `docs/`, `src/deck.css`, or another author's file. Report the slide count per chapter, the conflicts you found, and anything you could not verify.
