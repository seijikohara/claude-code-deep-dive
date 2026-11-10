# Claude Code Deep Dive

[日本語](README.ja.md)

A reference site on every feature of Claude Code **2.1.321**: commands, settings, extension points, multi-agent features, platforms, enterprise operation, and experimental options.
Each fact comes from the official documentation, the changelog, or a run of the installed binary.

The site is published at <https://seijikohara.github.io/claude-code-deep-dive/>.

## Editions

| Edition  | Status                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------- |
| Japanese | Complete: 76 chapters, fact-reviewed                                                               |
| English  | In preparation. The site already routes English as the primary language and Japanese under `/ja/`. |

## What the reference covers

- Part 0: Introduction
- Part I: Fundamentals: the agent loop, models and effort, fast mode, Advisor, context management, sessions, checkpoints, memory
- Part II: Operation: every slash command, keyboard input, keybindings, status line, output styles, display
- Part III: Settings and safety: settings files, keys, environment variables, built-in tools, permissions, permission modes, auto mode, sandboxing, diagnostics
- Part IV: Extensions: hooks, skills, MCP, plugins and marketplaces, mods, channels, artifacts
- Part V: Parallel work: subagents, agent view, agent teams, cross-session messaging, dynamic workflows, worktrees, scheduled tasks
- Part VI: Automation: headless mode, the Agent SDK, CI/CD, code review
- Part VII: Platforms: Desktop, web and cloud sessions, Remote Control, IDEs, Chrome, Slack, Claude Tag, Projects
- Part VIII: Enterprise: installation, authentication, managed settings, cloud providers, gateways, monitoring and costs
- Part IX: Summary: status board, timeline, recent releases, renames and removals, docs-versus-binary conflicts
- Part X: Complete appendices: all 249 settings keys, 402 environment variables, CLI flags and subcommands, 33 hook events, and 46 built-in tools

## How the reference is checked

- Every section names its sources: docs pages with anchors, changelog versions, and `実機確認 2.1.321` (verified on 2.1.321) where a fact was observed on the binary.
- Features that are not generally available carry a status label: Beta, Preview, Experimental, Undocumented, Deprecated, or Removed.
- Where the docs, the changelog, and the binary disagree, the page shows both readings.
- An independent reviewer checked every chapter against the sources.
- `tools/lint.mjs --site dist` checks the built site: identifiers against the research corpus, private data, coverage of the appendix tables, a source line per section, and internal links.

## Development

Built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/).

Requirements: Node.js 26 (see `.nvmrc`) and pnpm 12 (see `packageManager` in `package.json`).

```sh
pnpm install
pnpm dev          # local site at http://localhost:4321/claude-code-deep-dive/
pnpm build        # static site in dist/
pnpm check        # format, lint, type check, and unit tests
```

Site checks:

```sh
pnpm build && pnpm lint:site    # privacy, appendix coverage, sources, internal links
CCDD_RESEARCH=/path/to/research node tools/lint.mjs --site dist   # also checks identifiers
```

The identifier check (`--only=ids`) and data extraction (`tools/extract.mjs`) need a local research corpus (`CCDD_RESEARCH`) that mirrors the official docs. The corpus is not committed.

## Repository layout

| Path                             | Contents                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/content/docs/`              | Starlight pages: the English home at the root, and the Japanese edition under `ja/`, one MDX file per chapter |
| `src/components/DataTable.astro` | Renders the generated tables (appendix, command catalog) from `data/`                                         |
| `src/styles/site.css`            | Site theme on top of Starlight                                                                                |
| `data/`                          | Appendix tables (names, Japanese summaries, statuses, docs anchors)                                           |
| `tools/`                         | Site lint, and the data extraction and translation tools                                                      |
| `docs/`                          | Authoring and review guides, the shared fact ledger, and the original design and plan                         |

## Deployment

`.github/workflows/deploy.yml` builds the site with Astro and deploys it to GitHub Pages.
Deployment stays off until the repository variable `DEPLOY_PAGES` is set to `true`.

## License

The repository uses two licenses:

- Source code (components, scripts, configuration): [MIT License](LICENSE)
- Written content (reference pages, appendix data, documents): [CC BY 4.0](LICENSE-content). The content summarizes, translates, and quotes parts of Anthropic's public Claude Code documentation; that material remains subject to Anthropic's terms.

## Disclaimer

This is an unofficial reference. It is not affiliated with or endorsed by Anthropic.
