# Authoring guide

The Japanese edition lives in `src/content/docs/ja/<part>/<chapter>.mdx`, one MDX file per chapter.
Read `docs/ledger.md` (canonical facts, status labels, conflict rulings) before changing a fact, and `docs/review-guide.md` before reviewing one.

## Page structure

- Frontmatter: `title`, `description` (the chapter summary), and `sidebar.order` (the chapter number). A chapter whose whole feature is not generally available adds `sidebar.badge`.
- The page opens with the chapter summary, then one `##` section per topic.
- Each section starts with an anchor that other pages link to: `<span id="ch05-enable" />`. Keep existing ids; links across the site use them.
- Each section ends with its source line:

  ```mdx
  <div class="src">
    出典: [advisor#enable-the-advisor](https://code.claude.com/docs/en/advisor#enable-the-advisor) ·
    [changelog](https://code.claude.com/docs/en/changelog) 2.1.300 · 実機確認 2.1.321
  </div>
  ```

## Components and conventions

| Need                            | Markup                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status of a non-GA feature      | `<span class="badge experimental">Experimental</span>` (also `beta`, `preview`, `undocumented`, `deprecated`, `removed`). Use the ledger's label. |
| Note, warning, conflict         | `:::note[補足]`, `:::caution[注意]`, `:::danger[食い違い]` … `:::`. A conflict quotes both readings and their sources.                            |
| Output observed on the binary   | A code block with `title="実測 2.1.321" frame="terminal"`. Quote real output only; redact paths and IDs.                                          |
| Keys                            | `<kbd>Ctrl</kbd>+<kbd>O</kbd>`                                                                                                                    |
| An item seen only in the binary | `<span class="undocumented">…</span>` with an Undocumented badge                                                                                  |
| A generated table               | `<DataTable spec={{ data: "env", columns: [...] }} />` (see `src/components/DataTable.astro`)                                                     |
| A link to another chapter       | `/claude-code-deep-dive/ja/<part>/<chapter>/#<section id>`                                                                                        |

## Writing rules

- Plain engineering Japanese, one idea per sentence. Bullets in です・ます; table cells in short plain form.
- Identifiers, flags, settings keys, env vars, commands, paths, and messages stay verbatim in backticks.
- Every fact comes from the docs mirror, the changelog, or an observed run. Never write from memory.
- Write paths as `~/.claude/...`. Never a real home path, user name, or account detail.
- No marketing tone, no opinions, no emoji.

## Checks

```sh
pnpm build
pnpm lint:site
CCDD_RESEARCH=/path/to/research node tools/lint.mjs --site dist   # adds the identifier check
```
