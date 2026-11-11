# Authoring guide

The Japanese edition lives in `src/content/docs/ja/<part>/<chapter>.mdx`, one MDX file per chapter.
Read `docs/ledger.md` (canonical facts, status labels, conflict rulings) before changing a fact, and `docs/review-guide.md` before reviewing one.

## Page structure

- Each part directory has an `index.mdx` overview (`sidebar.label: 概要`, `sidebar.order: 0`): the part summary and a `<CardGrid>` with one `<LinkCard>` per chapter. Add a card when you add a chapter.
- Frontmatter: `title`, `description` (the chapter summary), and `sidebar.order` (the chapter number). A chapter whose whole feature is not generally available adds `sidebar.badge` with the variant from the status table below.
- The page opens with the chapter summary, then one `##` section per topic.
- Each section starts with an anchor that other pages link to: `<span id="ch05-enable" />`. Keep existing ids; links across the site use them. When two sections merge, keep both anchors.
- Each section ends with its source line:

  ```mdx
  <div class="src">
    出典: [advisor#enable-the-advisor](https://code.claude.com/docs/en/advisor#enable-the-advisor) ·
    [changelog](https://code.claude.com/docs/en/changelog) 2.1.300 · 実機確認 2.1.321
  </div>
  ```

## Components and conventions

Import Starlight components once per page, right after the frontmatter:

```mdx
import { Badge, Steps } from "@astrojs/starlight/components";
```

| Need                              | Markup                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status of a non-GA feature        | `<Badge text="Experimental" variant="caution" size="small" class="badge experimental" />`. Use the ledger's label.                                                                                                                                                                                                   |
| Note, warning, conflict           | `:::note[補足]`, `:::caution[注意]`, `:::danger[食い違い]` … `:::`. A conflict quotes both readings and their sources.                                                                                                                                                                                               |
| A procedure the reader performs   | `<Steps>` around an ordered list. Precedence and evaluation orders stay plain ordered lists: they are rankings, not steps.                                                                                                                                                                                           |
| A directory layout                | `<FileTree>` around a nested list. Text after the name is a comment; `…` is a placeholder. Escape `<` as `&lt;`.                                                                                                                                                                                                     |
| The same example in two languages | `<Tabs syncKey="sdk-lang">` with one `<TabItem label="Python">` per language, so the reader's choice carries across pages.                                                                                                                                                                                           |
| Links to the chapters of a part   | `<CardGrid>` with `<LinkCard title description href />` (part overview pages and the landing page)                                                                                                                                                                                                                   |
| The contents of a named file      | A code block with `title="<path as the prose names it>"`                                                                                                                                                                                                                                                             |
| Output observed on the binary     | A code block with `title="実測 2.1.321" frame="terminal"`. Quote real output only; redact paths and IDs.                                                                                                                                                                                                             |
| Keys                              | `<kbd>Ctrl</kbd>+<kbd>O</kbd>`                                                                                                                                                                                                                                                                                       |
| An item seen only in the binary   | `<span class="undocumented">…</span>` with an Undocumented badge                                                                                                                                                                                                                                                     |
| A generated table                 | `<DataTable spec={{ data: "env", columns: [...] }} />` (see `src/components/DataTable.astro`)                                                                                                                                                                                                                        |
| A link to another chapter         | `[<page title>](/claude-code-deep-dive/ja/<part>/<chapter>/#<section id>)`. The text is the page title, as the sidebar shows it. Never "Ch12", "付録 A", a bare number, or 後述: the site shows no numbers. A link to a section names that section's heading. In plain text (`description`), write 「<page title>」. |

Status labels and badge variants:

| Label        | `variant` | `class`              |
| ------------ | --------- | -------------------- |
| Beta         | `note`    | `badge beta`         |
| Preview      | `tip`     | `badge preview`      |
| Experimental | `caution` | `badge experimental` |
| Undocumented | `default` | `badge undocumented` |
| Deprecated   | `danger`  | `badge deprecated`   |
| Removed      | `danger`  | `badge removed`      |

The `class` keeps the site's status style (a colored square and a word) and lets `tools/lint.mjs` find Undocumented items.

## Diagrams

Diagrams are Astro components in `src/components/diagrams/`, written in HTML and CSS without a diagram library. They use the site's color tokens, so they follow light and dark mode, and their text stays searchable and selectable.

- Draw only relationships the page already states and cites. A diagram restates sourced facts; it never adds one.
- The components hold no words of their own. Every label comes from the page as a prop or as slot content, so each locale writes its diagram in its own language. Identifiers (event names, keys, paths) stay verbatim in backticks.
- Import them per page: `import Stack from "../../../../components/diagrams/Stack.astro";`

| Component    | Use for                                                                             | Markup                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `<Diagram>`  | The frame of every diagram, with an optional `caption`                              | `<Diagram caption="…">…</Diagram>`                                                                          |
| `<Stack>`    | A precedence order drawn as layers, strongest first, with labels for both ends      | `<Stack high="強い" low="弱い">` around a Markdown ordered list (blank lines inside the tags)               |
| `<Cycle>`    | A repeating cycle (session, turn, loop) as a box; nest cycles to show inner loops   | `<Cycle title="ターン" repeat="セッション中に繰り返す">…</Cycle>`; omit `repeat` for a cycle that runs once |
| `<Phase>`    | One row inside a cycle: when (`label`) and what fires (inline Markdown on one line) | ``<Phase label="開始">`UserPromptSubmit` → `UserPromptExpansion`</Phase>``                                  |
| `<Loop>`     | Steps that repeat in order, with an arrow back to the first                         | `<Loop steps={["収集", "行動", "検証"]} back="…" />`                                                        |
| `<Flow>`     | An evaluation order in which each step decides or passes the call on                | `<Flow start="ツール呼び出し">` around a Markdown ordered list                                              |
| `<Groups>`   | Items grouped side by side (who coordinates, where it runs)                         | `<Groups>` around a nested Markdown list: group names at the top level, members nested                      |
| `<Sequence>` | Segments in a fixed order, with an example of what a change invalidates             | `<Sequence segments={[…]} start="…" end="…" changedFrom={2} example="…" keptLabel="…" redoneLabel="…" />`   |

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
