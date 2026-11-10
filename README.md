# Claude Code Deep Dive

[日本語](README.ja.md)

A reference slide deck on every feature of Claude Code **2.1.321**: commands, settings, extension points, multi-agent features, platforms, enterprise operation, and experimental options.
Each fact comes from the official documentation, the changelog, or a run of the installed binary.

The site will be published at <https://seijikohara.github.io/claude-code-deep-dive/> after every chapter passes its fact review.

## Editions

| Edition  | Status                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------- |
| Japanese | Being written (about 570 slides so far)                                                            |
| English  | In preparation. The site already routes English as the primary language and Japanese under `/ja/`. |

## What the deck covers

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

## How the deck is checked

- Every content slide names its sources: docs pages with anchors, changelog versions, and `実機確認 2.1.321` (verified on 2.1.321) where a fact was observed on the binary.
- Features that are not generally available carry a status label: Beta, Preview, Experimental, Undocumented, Deprecated, or Removed.
- Where the docs, the changelog, and the binary disagree, the slide shows both readings.
- `tools/check.mjs` renders every slide in headless Chrome and fails on clipped content, internal scrolling, or a missing source line.
- `tools/lint.mjs` checks identifiers against the research corpus, private data, coverage of the appendix tables, and source lines.

## Development

Requirements: Node.js 26 (see `.nvmrc`) and pnpm 12 (see `packageManager` in `package.json`).

```sh
pnpm install
pnpm dev          # local site at http://localhost:4321/claude-code-deep-dive/
pnpm build        # static site in dist/
pnpm check        # format, lint, type check, and unit tests
```

Deck tools:

```sh
pnpm deck:build                                   # standalone index.html and the claude.ai Artifact fragment
node tools/check.mjs --url=http://localhost:4321/claude-code-deep-dive/ja/deck/
node tools/lint.mjs --html dist/ja/deck/index.html --only=privacy,coverage,sources
```

The identifier check (`--only=ids`) and data extraction (`tools/extract.mjs`) need a local research corpus (`CCDD_RESEARCH`) that mirrors the official docs. The corpus is not committed.

## Repository layout

| Path                                      | Contents                                                            |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `src/chapters/`                           | Slide sources of the Japanese edition, one file per chapter         |
| `src/deck.css`                            | Deck theme on top of the reveal.js `white` theme                    |
| `src/pages/`, `src/layouts/`, `src/i18n/` | Astro pages: English home, Japanese home, and the Japanese deck     |
| `data/`                                   | Appendix tables (names, Japanese summaries, statuses, docs anchors) |
| `tools/`                                  | Deck renderer, standalone build, lint, layout check, and data tools |
| `docs/`                                   | Design, plan, authoring guide, and the shared fact ledger           |

## Deployment

`.github/workflows/deploy.yml` builds the site with Astro and deploys it to GitHub Pages.
Deployment stays off until the repository variable `DEPLOY_PAGES` is set to `true`.

## Disclaimer

This is an unofficial reference. It is not affiliated with or endorsed by Anthropic.
