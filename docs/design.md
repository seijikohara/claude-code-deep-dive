# Claude Code Deep Dive — deck design

Status: draft for approval (2026-11-10)

## 1. Intent

The deck is a Japanese reference for developers who already use Claude Code every day and have advanced development skills.
The deck explains every feature of the installed Claude Code **2.1.321**: commands, settings, extension points, multi-agent features, platforms, enterprise operation, and experimental options.
A reader opens the deck to learn the exact syntax, the precedence rules, the limits, and the edge cases of a feature.
The reader does not need a presenter.

## 2. Decisions taken by the user

| Topic          | Decision                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Audience       | Developers who already use Claude Code, with advanced development skills                                       |
| Language       | Japanese body text. Command names, settings keys, env vars, flags, and code stay in their original form        |
| Use            | A self-contained reading deck and a reference. Slides carry the detail; speaker notes are not used for content |
| Volume         | 200 slides or more                                                                                             |
| Output         | This repository, published with GitHub Pages; a private claude.ai Artifact during drafting                     |
| Slash commands | Every built-in slash command and every bundled skill must appear                                               |
| Sources        | Official docs and observed behavior of 2.1.321 take priority over everything else                              |
| Theme          | Reveal.js `white`                                                                                              |

## 3. Goals, non-goals, anti-goals

Goals:

- Cover every documented feature of 2.1.321, at reference depth.
- Show the exact syntax for every command, flag, settings key, env var, and frontmatter field mentioned.
- Mark every feature's status: GA, Beta, Research preview, Experimental, Undocumented, Deprecated, Removed.
- Cite a source on every content slide. Mark facts verified on the installed binary.
- Show where the docs, the changelog, and the binary disagree.

Non-goals:

- Teaching general development concepts (git, CI, JSON, shells).
- Tutorials or step-by-step onboarding.
- Opinions or comparisons with other AI coding tools.
- Speaker notes or a talk script.

Anti-goals (failure even if the deck renders):

- Any fact taken from memory instead of the docs or the binary.
- Content clipped by the slide edge.
- A slash command missing from the catalog.
- Private data on a slide: the user's home path, username, email, account, organization, or the names of the user's installed plugins, MCP servers, or skills.
- A feature presented as stable when the docs mark it experimental or preview.

## 4. Constraints

- Target version: 2.1.321 (released 2026-11-09). Default model observed: `claude-opus-5-5`.
- Research inputs (already collected, English): `$CCDD_RESEARCH/notes/*.md` (12 domain files), `$CCDD_RESEARCH/machine.md`, the docs mirror `$CCDD_RESEARCH/docs/*.md`.
  The research root is a local, unpublished directory referenced as `$CCDD_RESEARCH` (it mirrors Anthropic's docs, so it is not committed).
- Reconciliation rule:
  - A docs fact that matches the binary, or a behavior observed on the binary, goes in as fact.
  - A binary-only item goes in only with the `Undocumented` badge, or is dropped.
  - A docs-only item absent from 2.1.321 is dropped.
  - A conflict appears on the slide with both readings and the source of each.
- Artifact page contract (confirmed from the artifact-design skill, 2026-11-10):
  - Scripts load only from pinned CDN URLs (cdnjs preferred, jsDelivr allowed). Stylesheets load only from Google Fonts. All other CSS must be inline.
  - The published file is wrapped in its own `<!doctype>/<head>/<body>` skeleton, so the Artifact build must be a fragment: `<title>`, `<style>`, the font `<link>`, the deck markup, and the scripts.
  - A single-theme page is allowed when it sets every color explicitly. The white theme qualifies.
  - `window.open` and print are blocked, so the Notes plugin (pop-up speaker view) is excluded.
  - Only a plain `#name` passes into the Artifact link from outside. Reveal's `#/…` hashes still work inside the page.
- The claude.ai "Slides" Artifact type is not used, because the user asked for Reveal.js.

## 5. Decisions taken by the builder (Claude) — review these

1. **Slide count: about 450.** The 12 research domains proposed 584 slides; merging overlaps gives the outline in section 9.
2. **Reveal.js 6.0.2** (released 2026-09-10) from `cdnjs.cloudflare.com/ajax/libs/reveal.js/6.0.2/`. Plugins: Highlight, Search, Zoom. Notes plugin is omitted.
3. **White theme, always.** The page stays white in dark-mode browsers because the user asked for `white`.
4. **CSS inlined at build time:** `reset.css`, `reveal.css`, and `theme/white.css`. The four embedded Source Sans Pro `@font-face` rules (base64 WOFF) are stripped, and the fonts come from Google Fonts instead:
   - Body and headings: "Source Sans 3" for Latin text and "Noto Sans JP" for Japanese.
   - Code: "Source Code Pro".
5. **Headings keep their case.** The theme's `text-transform: uppercase` is overridden, because command and key names are case-sensitive.
6. **Canvas 1600×900** (16:9), base font around 26–28px, so a slide can hold a 10-row table or a 20-line code block.
7. **Navigation:** each chapter is a vertical stack, and chapters run left to right. `hash: true` gives every slide a stable URL. `slideNumber: 'c/t'` and the progress bar are on. Search uses Ctrl+Shift+F.
8. **A clickable table of contents** links to every chapter, and each part has a divider slide.
9. **No overflow by design.** Authors split content across slides instead of shrinking text. A scrollable region is allowed only inside appendix tables, and it is marked visibly.
10. **Code blocks are written raw and escaped by the build script**, so authors never hand-escape `<`, `>`, `&`.
11. **Code blocks use a light syntax palette written inline.** Reveal 6 ships only dark Highlight themes (monokai, zenburn), which clash with `white`.
12. **The theme's `pre code { max-height: 400px; overflow: auto }` is overridden.** Otherwise a long code block scrolls silently inside its box and the overflow check never sees it.
13. **Docs language for the design and build files:** English. The slides are Japanese.

## 5a. Accuracy and consistency controls

The research notes are model output. They are inputs, not truth. These controls apply before and after authoring.

1. **Shared fact ledger** (`docs/ledger.md`), written before authoring starts. Every author reads it.
   - Canonical numbers and how to phrase them: 55 slash commands in the headless init vs 116 current command names in the docs (95 built-in + 21 bundled), 24 tools in the init vs 46 in the docs (45 current + removed `TaskOutput`), `Task` vs `Agent`.
   - The alias table and the default model.
   - One status label per feature.
   - A ruling on each flagged conflict. An observed run beats a binary-strings inference.
   - One owner chapter per overlapping topic: auto-compact window → Ch6, scheduled tasks → Ch43, managed settings → Ch58, Advisor → Ch5, permission modes → Ch23, `/code-review` and ultrareview → Ch47. Other chapters link to the owner instead of repeating it.
2. **Identifier lint** (`tools/lint-ids.mjs`). The lint extracts every flag (`--x`), env var (`UPPER_CASE`), settings key in code, `/command`, and hook event from the slides. Each one must match the docs mirror, the raw `--help` captures, or `machine.md`. An unmatched identifier fails the build unless the slide marks it `Undocumented`.
3. **Per-chapter fact review.** A reviewer agent checks each chapter's claims against the docs mirror and the lab outputs, not against the notes. The reviewer reports errors; the author fixes them.
4. **Slash-command coverage is generated and asserted.** `data/commands.json` is built from the notes catalog (name, aliases, args, purpose, status, source). The catalog slides are generated from that file. The check asserts that every name and alias appears in `index.html`.

## 5b. Privacy controls

- The build fails if `index.html` contains:
  - the user's home path, username, email, or hostname;
  - the names of the user's installed plugins, MCP servers, or skills;
  - any UUID.
- User-specific numbers stay off the slides, for example the number of MCP tools or plugin commands loaded on this machine, or the `auto` mode set in the user's settings.
- Lab output is quoted only after redaction.

## 6. Slide conventions

Every content slide has:

- A title (`h2`) in Japanese, with code names left as they are.
- A status badge next to the title when the feature is not GA: `Beta`, `Preview`, `Experimental`, `Undocumented`, `Deprecated`, `Removed`.
- A source footer: `出典:` followed by docs page links (`https://code.claude.com/docs/en/<page>`), changelog versions, and `実機確認` when the fact was verified on 2.1.321.
- A `食い違い` callout when the docs, the changelog, and the binary disagree.

Reusable components (CSS classes): `.cols-2`, `.cols-3`, `.card`, `table.compact`, `kbd`, `.badge.*`, `.callout.note`, `.callout.warn`, `.callout.conflict`, `.src` (footer), `.lab` (observed-output block), `.part-divider`, `.chapter-title`.

Japanese style: plain engineering Japanese; one idea per bullet; concrete nouns; no marketing tone.

## 7. Technical design

Layout:

```
claude-code-deep-dive/
  docs/design.md          this file
  src/template.html       <head>, fonts, init script, placeholders for CSS and slides
  src/deck.css            custom theme layer and components
  src/chapters/NN-*.html  one file per chapter: one vertical <section> stack
  vendor/                 reveal.js 6.0.2 CSS, downloaded once and pinned
  tools/build.mjs         assembles index.html: inlines CSS, escapes code blocks, numbers chapters, builds the TOC
  tools/check.mjs         loads index.html in a headless browser and reports overflow, console errors, slide count, missing sources
  index.html              build output (published as the Artifact)
```

Build pipeline:

1. `node tools/build.mjs` writes two outputs from the same sources:
   - `index.html`, a full HTML document for local viewing.
   - `dist/artifact.html`, a fragment for the Artifact skeleton.
2. `tools/check.mjs` (Playwright or the Chrome DevTools MCP tools) navigates to every slide at 1600×900, because Reveal hides distant slides. A slide fails when:
   - its content height exceeds the slide height;
   - any descendant's scroll size exceeds its client size, horizontally or vertically;
   - it lacks a `.src` footer (dividers and the title are exempt).
     The check also reports console errors and the slide count.
3. `tools/lint-ids.mjs` and the command-coverage assertion run (section 5a).
4. The privacy check runs (section 5b).
5. The Artifact is published from `dist/artifact.html`.

## 8. Authoring process

- Authoring fans out by chapter group (about 12 groups). Each author reads only its domain notes plus this design.
- Each author writes chapter files that follow the conventions and the component set.
- Before fan-out, a pilot proves the template with the densest real slides: a slash-command catalog slide, the hook events table, a long code slide, a Japanese-heavy slide, and a conflict callout. The pilot is also published to the Artifact, to prove fonts, the CDN, and keyboard handling on the hosted page.
- After fan-out: build, check layout, lint identifiers, review facts per chapter, check privacy, then publish.

## 9. Outline (about 450 slides)

Counts are targets; an author may move ±2 slides inside a chapter.
`notes:` names the research file in `$CCDD_RESEARCH/notes/` (or `machine.md`).

### Part 0. 導入 (6) — notes: machine.md, changelog-timeline

1. タイトル
2. この資料の読み方: 対象 2.1.321・情報源・検証方法・バッジ凡例
3. 全体マップ: パートと章（リンク付き目次）
4. 2.1.x の 1 年: 2.1.0 → 2.1.321、260 リリース
5. 実機で見る 2.1.321: 既定モデル・ツール 24・コマンド 55 ほか
6. 拡張ポイントの全体図: CLAUDE.md / Skills / Hooks / MCP / Subagents / Plugins / Mods

### Part I. 基礎の深掘り (73)

Ch1 仕組み (5) — notes: context-sessions-memory

- エージェントループとハーネス / 起動時にコンテキストへ載るもの / 機能別のコンテキストコスト / `/context` の読み方（実測） / 自動注入される system reminder

Ch2 モデル選択 (13) — notes: models-effort

- 全体像 / エイリアスの解決結果（実測） / プロバイダ別エイリアス / モデル ID・コンテキスト長・最小バージョン / 価格表 / メインモデルの優先順位（実測） / `/model` ピッカーと再開時のモデル / `ANTHROPIC_DEFAULT_*_MODEL` によるピン留め / `modelOverrides`・`modelPicker`・許可リスト / `opusplan` / サブエージェントのモデル解決 / フォールバックモデル / Fable を使うときの注意と 1M コンテキスト

Ch3 Effort と思考 (9) — notes: models-effort

- レベルとモデル別既定値 / 解決順序 / `/effort` サブコマンド / `modelSettings` と上限 / effort が効く場面・送られない場合 / `ultrathink` / `ultracode` / adaptive・fixed thinking と思考制御 / サブエージェントと Skill の effort

Ch4 Fast mode (4) — notes: models-effort

- 基本と対応モデル / 料金と課金 / 持続性とモデル切替 / 組織設定・ゲートウェイ・廃止予定

Ch5 Advisor `Experimental` (5) — notes: models-effort, commands-ui

- Advisor とは / 有効化 / ペアリング表 / 呼び出しと表示 / コスト・キャッシュ・他手段との比較

Ch6 コンテキスト管理 (11) — notes: context-sessions-memory, models-effort

- `/clear`・`/compact`・rewind 要約・自動圧縮の比較 / `/compact` の内部とキャッシュコスト / auto-compact window の設定経路と優先順位 / 書式・バリデーション（実測）とモデル別既定 / 無効化・スラッシング・サーキットブレーカー / アイドル圧縮 / 圧縮で残るもの・消えるもの / Pre/PostCompact の発火順（実測） / ツール結果のクリア / プロンプトキャッシュの層と prefix 一致 / キャッシュを壊すもの・TTL・無効化変数・ヒット確認

Ch7 セッション (9) — notes: context-sessions-memory

- トランスクリプトの実体と格納場所 / 再開の入口 / 再開で復元されるもの・権限モード / ピッカー・名前・`/rename` / 分岐: `/branch`・`--fork-session`・`/fork`・`/subtask` / 保持期間と永続化制御 / ヘッドレスで使えるコマンド（実測） / `/goal` の使い方と内部動作 / `/goal` vs `/loop` vs Stop フック

Ch8 チェックポイント (3) — notes: context-sessions-memory

- 仕組みと保持 / `/rewind` メニュー / 追跡されない変更と SDK

Ch9 メモリ (10) — notes: context-sessions-memory

- 2 系統: CLAUDE.md と auto memory / CLAUDE.md のスコープと読み込み順 / オンデマンド読み込みとサイズ上限 / `@path` インポート / `.claude/rules` と `paths` / ロード順の実測（InstructionsLoaded） / AGENTS.md / `--add-dir`・`claudeMdExcludes`・managed CLAUDE.md / auto memory / `/memory` と廃止された `#`

Ch10 `.claude` ディレクトリ (2) — notes: context-sessions-memory

- プロジェクトの `.claude` / `~/.claude` とアプリデータ・`purge`

Ch11 ベストプラクティスと大規模リポジトリ (2) — notes: context-sessions-memory

### Part II. 操作 (46)

Ch12 スラッシュコマンド完全ガイド (22) — notes: commands-ui (Slash command catalog), machine.md

- 全体像: 種類と件数 / 解析・連結・キューイング / メニュー照合と非表示コマンド / 組み込み・Skill・Workflow の違い
- カタログ (12): セッション・コンテキスト ×2 / モデル・挙動 ×2 / 設定・拡張 ×3 / 並列・リモート ×2 / UI・アカウント・その他 ×3. Every built-in command appears in exactly one row.
- バンドル Skill 一覧 ×2 / 改名・削除の歴史 / ヘッドレスでの実態（実測） / 情報源の突き合わせ / `/config` の主要キー

Ch13 キーボードと入力 (9) — notes: commands-ui

- 制御キー / Ctrl・Option キー / readline 編集 / 入力プレフィックスと複数行 / シェルモード / キューイングと履歴検索 / 貼り付け / Vim モード / `/btw`・トランスクリプト・フォーカス・`/diff`

Ch14 キーバインド (3) / Ch15 ステータスライン (4) / Ch16 出力スタイル (2) / Ch17 表示とアクセシビリティ (6: フルスクリーン ×2・ターミナル設定とテーマ・音声入力・スクリーンリーダー・ディープリンク) — notes: commands-ui

### Part III. 設定と安全 (70)

Ch18 設定ファイル (12) — notes: settings-env-tools

- 全体像 / OS 別パス / `settings.local.json` の位置 / 管理配布 4 方式 / 優先順位 / managed 内の順序 / env・flag はキー単位 / 厳しい値が勝つ例外 / マージ規則（実測） / trust-gated キー / `--settings` と `--setting-sources`（実測） / ホットリロード・壊れた設定・`$schema`

Ch19 設定キー早見表 (4) / Ch20 環境変数 (7) / Ch21 組み込みツール (5) — notes: settings-env-tools, machine.md

Ch22 権限ルール (14) — notes: permissions-security

- 権限の層 / 確認プロンプトと保存先 / `/permissions` / 評価順 deny→ask→allow / スコープ間の優先と managed-only / Hooks・Mods との関係 / 構文とパラメータルール / Bash ワイルドカード照合表 / 複合コマンドとラッパー / Bash ルールが一致しないもの・読み取り専用・リダイレクト / Read・Edit のパスアンカー / 深さ・否定・symlink / WebFetch・MCP・Agent・Skill・Cd / 作業ディレクトリとワークスペース信頼

Ch23 パーミッションモード (8) / Ch24 Auto mode (6) / Ch25 サンドボックス (6) / Ch26 セキュリティ (4) / Ch27 診断 (4) — notes: permissions-security, settings-env-tools, enterprise-ops

### Part IV. 拡張 (91)

Ch28 Hooks (27) — notes: hooks-skills-channels Part A

- 全体像 / ライフサイクル / イベント一覧 ×3 / 定義場所・マージ・重複排除 / matcher 規則と対象値 / `if` フィールド / 共通フィールドとタイムアウト / command・http・mcp_tool / prompt・agent (`Experimental`) / 入力 JSON / 終了コード判定表と exit 2 の効果 / JSON 出力 / decision control 早見表 / `additionalContext` / PreToolUse ×2 / PermissionRequest / PostToolUse / Stop・SubagentStop / SessionStart・Setup・ModelSwitch / ファイル・CWD・Worktree・Elicitation / 表示系イベント / async・onFailure・並列 / frontmatter フックと環境変数 / セキュリティ・管理・デバッグ / 実機検証

Ch29 Skills (13) — notes: hooks-skills-channels Part B
Ch30 MCP (18) — notes: mcp-plugins Part A
Ch31 プラグイン (16) — notes: mcp-plugins Parts B–C
Ch32 マーケットプレイス (6) — notes: mcp-plugins Part C
Ch33 Mods (4) — notes: mcp-plugins Part E
Ch34 Channels `Preview` (4) / Ch35 Artifacts (3) — notes: hooks-skills-channels

### Part V. 並列化 (39) — notes: multi-agent

Ch36 並列化の全体像 (2) / Ch37 サブエージェント (13) / Ch38 Agent View とバックグラウンド `Preview` (5) / Ch39 Agent Teams `Experimental` (5) / Ch40 セッション間メッセージング (2) / Ch41 Dynamic Workflows (5) / Ch42 Worktree (3) / Ch43 スケジュール実行 (4)

### Part VI. 自動化 (34) — notes: headless-ci-sdk

Ch44 ヘッドレス `-p` (12) / Ch45 Agent SDK (12) / Ch46 CI/CD (5) / Ch47 コードレビュー (5)

### Part VII. プラットフォーム (38) — notes: platforms

Ch48 サーフェス (4) / Ch49 Remote Control とモバイル (5) / Ch50 クラウドセッション (9) / Ch51 セルフホスト環境 `Beta` (1) / Ch52 Desktop (7) / Ch53 IDE (5) / Ch54 Chrome と Computer use (3) / Ch55 Projects・Slack・Claude Tag (4)

### Part VIII. エンタープライズ (32) — notes: enterprise-ops

Ch56 インストールと更新 (5) / Ch57 認証 (6) / Ch58 管理設定 (6) / Ch59 クラウドプロバイダ (5) / Ch60 ネットワークとゲートウェイ (5) / Ch61 監視・コスト・分析 (5)

### Part IX. まとめと付録 (24) — notes: changelog-timeline, all

Ch62 実験的・プレビュー機能一覧 (2) / Ch63 未公開の実験フラグ候補 (1) / Ch64 タイムライン (6) / Ch65 直近 25 リリース (4) / Ch66 改名・廃止・削除 (2) / Ch67 ドキュメントと実機の食い違い (2) / Ch68 アップグレードチェックリスト (1) / 付録: CLI フラグ一覧 (3)・サブコマンド一覧 (2)・参考資料 (1)

Main deck total: 6 + 73 + 46 + 70 + 91 + 39 + 34 + 38 + 32 + 24 = **453**.

### Part X. 全件付録 (about 46) — approved by the user on 2026-11-10

The appendix tables are generated mechanically from the docs mirror, not from the notes, so that no entry is missed.
`tools/extract-*.mjs` writes `data/*.json` with each entry's name, its English description, its docs anchor, and its status.
Agents then add a short Japanese description to each entry in batches. The build generates the table slides from the JSON, at about 18 rows per slide.

- 付録 A: 設定キー全件 (249 keys, about 14 slides) — source: settings-reference
- 付録 B: 環境変数全件 (402 variables, about 23 slides) — source: env-vars
- 付録 C: CLI フラグ全件 (about 4 slides) — sources: cli-reference, `claude --help`
- 付録 D: Hook イベント全件 (33 events, 2 slides) — source: hooks
- 付録 E: 組み込みツール全件 (46 tools: 45 current + removed `TaskOutput`, 4 slides) — source: tools-reference

The coverage check asserts that every entry in each JSON file appears in `index.html`.

Grand total: about **500** slides.

## 9a. Housekeeping

- Headless lab runs during research left 289 session transcripts in 26 directories under `~/.claude/projects/` (all derived from the scratchpad path, about 34 MB). The user approved deleting them after the deck is finished.
- Every further `claude -p` run uses `--no-session-persistence`.

## 10. Left to the builder

- Visual details inside the white theme: accent color, badge colors, table styling.
- Slide-level wording, and the split of a chapter's content across its slide budget.
- Which verified lab output to quote, after redaction.
