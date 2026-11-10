# Claude Code Deep Dive — shared fact ledger (target 2.1.321)

Every author reads this file before writing a chapter. When a note and this ledger disagree, follow the ledger. When this ledger and a docs page disagree, report the conflict. Do not fix the conflict silently.

## 0. Conventions

**Citation prefixes.** Paths are relative to the research root named in design §4. Never write that absolute path on a slide or in a commit, because it contains the username and a UUID.

- `docs/<page>:N`: docs mirror page `<page>.md`, line N. The public URL is `https://code.claude.com/docs/en/<page>`, with `__` replaced by `/`.
- `CL v<ver> L<n>`: `docs/changelog.md` line n, under release `<ver>`.
- `help:N`: `raw/help/root.txt` line N, the output of `claude --help` on 2.1.321.
- `init:N`: `raw/headless/safe_nousersettings_stream.redacted.json` line N. This is the safe-mode `-p` stream-json capture, run with no user settings.
- `notes/<file>:N`, `lab/...`, `raw/...`, and `machine §n` (= `machine.md`) are the other research files.

**Evidence tiers.**

- `[docs]`: a docs page.
- `[CL]`: the changelog.
- `[raw]`: a captured command output that was kept.
- `[note-run]`: a research agent ran it on 2.1.321, but no raw output was kept. Cite such a fact as `実機確認`, but do not invent verbatim output beyond what the note quotes.
- `[strings]`: a candidate from the binary's strings only.

**Badge rule (applies everywhere).**

1. An item on a docs reference page is a fact. It gets a badge only from §2.
2. An item stated only in the changelog is a fact. The footer reads `出典: changelog 2.1.x（リファレンス未掲載）`. It gets no `Undocumented` badge.
3. An item seen only in `--help` output or in an observed run gets the `Undocumented` badge plus `実機確認`.
4. An item seen only in binary strings gets the `Undocumented` badge and may appear only in Ch63 (candidate list) or Ch67. It must never appear as an instruction. Otherwise drop it. The identifier lint accepts anything in `machine.md`, so the lint cannot enforce this rule. Authors must follow it themselves (see the list in §3 R14).

**Status labels (§2).**

- `GA`: the current docs page carries no preview, beta, or experimental label.
- `Preview`: the docs say "research preview" or "preview".
- `Beta`: the docs say "beta" or "public beta".
- `Experimental`: the docs say "experimental".
- `Deprecated` and `Removed`: as the docs or the changelog state.
- When a launch label differs from the current page, use the current page and mention the drift in the notes.

## 1. Canonical facts

| Fact                        | Value                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                                                                     | How slides phrase it                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version                     | 2.1.321, released 2026-11-09                                                                                                                                                                                                                                                                                                                                                                             | CL v2.1.321 L13–15; `claude --version` → `2.1.321 (Claude Code)` [raw, rerun 2026-11-10]; init:100                                                                                           | 「対象: Claude Code 2.1.321（2026-11-09 リリース）」                                                                                                                                                                                                                                                                                   |
| 2.1.x span                  | 260 releases, from 2.1.0 (2026-01-07) to 2.1.321                                                                                                                                                                                                                                                                                                                                                         | count of `**2.1.N**` headings in the changelog = 260; CL v2.1.0 L11282–11284                                                                                                                 | 「2.1.0（2026-01-07）から 2.1.321 まで 260 リリース」                                                                                                                                                                                                                                                                                  |
| Default model               | `default` resolves to Opus 5.5 on Pro, Max, Ultra, Team, Enterprise, the Anthropic API, Platform on AWS, Bedrock, and Agent Platform. It resolves to Sonnet 4.5 on Foundry. An organization default model overrides it. Fable is never the account default.                                                                                                                                              | docs/model-config:465–473, :481; `default`→`claude-opus-5-5` [note-run] notes/models-effort:31                                                                                               | 「既定モデル: claude-opus-5-5（Anthropic API・サブスクリプションの場合）」. Always name the account type.                                                                                                                                                                                                                              |
| Alias → ID (Anthropic API)  | `fable`→`claude-fable-5-2`; `opus`, `best`, `default`→`claude-opus-5-5`; `sonnet`→`claude-sonnet-5-5`; `opusplan`→`claude-sonnet-5-5` outside plan mode (`opus` inside plan mode); `haiku`→`claude-haiku-5-5`                                                                                                                                                                                            | table docs/model-config:30–40, fable :51; [note-run] notes/models-effort:29–39, lab/models-effort/handback.txt:6 (init events of dead-endpoint runs; no request served); haiku [raw] init:34 | Table title 「Anthropic API での解決（実機）」. The footnote says other providers differ (docs/model-config:44–49): on Platform on AWS, sonnet = 4.6 and haiku = 4.5. On Bedrock and Agent Platform, sonnet and haiku = 4.5. On Foundry, opus = 4.6, sonnet = 4.5, and haiku = 4.5. `fable` = Fable 5 in Claude apps gateway sessions. |
| Minimum versions            | Opus 5.5 ≥ 2.1.280, Sonnet 5.5 ≥ 2.1.284, Haiku 5.5 ≥ 2.1.293, Fable 5.2 ≥ 2.1.321                                                                                                                                                                                                                                                                                                                       | docs/model-config:63; docs/advisor:105; CL v2.1.321 L19                                                                                                                                      | State as given.                                                                                                                                                                                                                                                                                                                        |
| Haiku 5.5 limits (observed) | `contextWindow` 1000000, `maxOutputTokens` 128000                                                                                                                                                                                                                                                                                                                                                        | [raw] `raw/headless/json_result.redacted.json:48–49`                                                                                                                                         | 「実機: Haiku 5.5 は 1M / 出力 128K」                                                                                                                                                                                                                                                                                                  |
| Slash commands, init        | 55 = 36 commands + 19 skills. `terminal_slash_commands` holds 4.                                                                                                                                                                                                                                                                                                                                         | [raw] init:36 (`slash_commands`), init:109 (`skills`); machine §2.4                                                                                                                          | 「-p の init: 55（コマンド 36＋Skill 19）」                                                                                                                                                                                                                                                                                            |
| Slash commands, docs        | The table at docs/commands:52–172 has 121 rows: 94 built-in rows, which hold 95 names because L82 lists both `/design consent` and `/design revoke`; 20 Skill rows; 1 Workflow row (`/deep-research`, L80); 3 alias-only rows (`/cost` L77, `/review` L135, `/stats` L149); and 3 removed rows (`/pr-comments` L122, `/ultraplan` L161, `/vim` L168). **Current names: 116 = 95 built-in + 21 bundled.** | docs/commands:33–172; notes/commands-ui:24–32                                                                                                                                                | 「公式一覧の現行コマンド名 116（組み込み 95＋バンドル 21）」. Do not write "121 = 95 + 21".                                                                                                                                                                                                                                            |
| Documented aliases          | 24 in total. Marked "Alias": `/bg /share /reset /new /review /settings /app /checkup /quit /proactive`(→`/loop`) `/ios /android /allowed-tools /rc /update /continue /checkpoint /undo /routines`. Marked "Also available as": `/peers /tp /bashes`. Alias-only rows: `/cost /stats`.                                                                                                                    | docs/commands (grep `Alias`, `Also available as`)                                                                                                                                            | 「エイリアス 24」                                                                                                                                                                                                                                                                                                                      |
| Why 55 ≠ 116                | The init lists only the canonical names that this headless session can run. It omits aliases and commands tied to an interactive terminal, a surface, or a plan. The docs list every command on every surface.                                                                                                                                                                                           | notes/commands-ui:15–30; docs/agent-sdk__skills:168                                                                                                                                          | One sentence: 「init はその -p セッションで実行できる正式名だけを列挙し、docs は全サーフェスの全コマンドを列挙する」                                                                                                                                                                                                                   |
| Built-in tools              | The init lists 24 [raw] init:7. The docs table docs/tools-reference:21–66 has **46 rows: 45 current tools + `TaskOutput`** (L57, removed in v2.1.277). **Design §5a and 付録 E say "41". That number is wrong; use 46.**                                                                                                                                                                                 | as given                                                                                                                                                                                     | 「init 24 / docs 46（現行 45＋削除済み TaskOutput）」                                                                                                                                                                                                                                                                                  |
| `Task` vs `Agent`           | The docs name the tool `Agent` (renamed from `Task` in 2.1.63; `Task(...)` still works as an alias). The init lists `Task`.                                                                                                                                                                                                                                                                              | docs/sub-agents:507; [raw] init:7 list                                                                                                                                                       | 「ツール名は Agent（旧名 Task。-p の init は Task と表示）」                                                                                                                                                                                                                                                                           |
| Built-in agents             | The init lists 5: `claude`, `Explore`, `general-purpose`, `Plan`, `web-fetch` [raw] init:102. The docs list 6: Explore, Plan, general-purpose, `claude` (L77), `statusline-setup` (L78), `claude-code-guide` (L79).                                                                                                                                                                                      | docs/sub-agents:29–79                                                                                                                                                                        | `web-fetch` is `Undocumented`. `statusline-setup` appeared only in a normal run [note-run] machine §2.5. `claude-code-guide` appeared in no `-p` init.                                                                                                                                                                                 |
| Permission modes            | 6 modes: `default` (displayed as **Manual**), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. `--help` shows `manual` and not `default`. The init reports `default`. The rename to Manual came in 2.1.200.                                                                                                                                                                                | docs/permission-modes:17–26; help:151–154; [raw] init:35; CL v2.1.200 L6595                                                                                                                  | 「Manual（設定値は default）」. Mention `manual` as the CLI alias.                                                                                                                                                                                                                                                                     |
| Starting mode               | Interactive terminal and VS Code sessions start in `auto` (version: see R17). `-p` and the SDK start in `default` (with an exception, see R17).                                                                                                                                                                                                                                                          | docs/permission-modes:79–84; [raw] init:35                                                                                                                                                   | See R17.                                                                                                                                                                                                                                                                                                                               |
| Hook events                 | 33                                                                                                                                                                                                                                                                                                                                                                                                       | docs/hooks:1252–3858 (33 `###` headings); the lifecycle table docs/hooks:17–66 also has 33 rows                                                                                              | 「フックイベント 33」                                                                                                                                                                                                                                                                                                                  |
| Settings keys               | 249                                                                                                                                                                                                                                                                                                                                                                                                      | 249 `### ` headings in docs/settings-reference, equal to the 249 index rows at :13–268                                                                                                       | 「設定キー 249」                                                                                                                                                                                                                                                                                                                       |
| Env vars                    | 402                                                                                                                                                                                                                                                                                                                                                                                                      | 402 table rows in docs/env-vars:113–539 ("Variables")                                                                                                                                        | 「環境変数 402（リファレンス掲載分）」                                                                                                                                                                                                                                                                                                 |

## 2. Status labels (one per row)

| Feature                                                    | Label        | Evidence                                                                                                                     | Note                                                                                                                            |
| ---------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Advisor                                                    | Experimental | docs/advisor:11                                                                                                              | Anthropic API only per the docs; see R1 for AWS                                                                                 |
| Agent Teams                                                | Experimental | docs/agent-teams:11                                                                                                          | It launched as "research preview" in CL v2.1.32 L10796; the current page wins                                                   |
| `--teammate-mode`                                          | Experimental | docs/agent-teams:123 ("experimental and doesn't appear in `claude --help`")                                                  |                                                                                                                                 |
| Agent view / background sessions (`--bg`, `claude agents`) | Preview      | docs/agent-view:21, :1147 (v2.1.139)                                                                                         |                                                                                                                                 |
| Dynamic workflows                                          | GA           | docs/workflows:9–11 (no label; all paid plans)                                                                               | Drift: "research preview" in docs/whats-new__2026-w22:27–28                                                                     |
| Channels                                                   | Preview      | docs/channels:11, :338–340                                                                                                   |                                                                                                                                 |
| Computer use, CLI                                          | Preview      | docs/computer-use:11 (macOS; Pro, Max, Ultra)                                                                                | Not available with `-p`                                                                                                         |
| Computer use, Desktop                                      | Preview      | docs/desktop:363 (macOS and Windows)                                                                                         | Not in the Linux app (docs/desktop:2276)                                                                                        |
| Fullscreen renderer                                        | Preview      | docs/fullscreen:11, :322–324                                                                                                 |                                                                                                                                 |
| Ultrareview / `/code-review ultra`                         | Preview      | docs/ultrareview:11                                                                                                          | `/ultrareview` is an alias when available                                                                                       |
| `/code-review` (local)                                     | GA           | docs/code-review-local (no label)                                                                                            |                                                                                                                                 |
| Routines / cloud scheduled tasks                           | Preview      | docs/routines:11, :261                                                                                                       |                                                                                                                                 |
| Fast mode: Fable 5.2, Opus 5.5                             | GA           | docs/fast-mode:11 ("is available")                                                                                           | CL v2.1.304 L1172 dropped the label on Opus 5.5                                                                                 |
| Fast mode: Opus 5                                          | Preview      | docs/fast-mode:11                                                                                                            |                                                                                                                                 |
| Fast mode: Opus 4.8                                        | Deprecated   | docs/fast-mode:19 (deprecated 2026-10-30; removed 2026-11-30)                                                                |                                                                                                                                 |
| Fast mode: Opus 4.7                                        | Removed      | docs/fast-mode:24 (removed 2026-07-24)                                                                                       |                                                                                                                                 |
| Claude in Chrome                                           | GA           | docs/whats-new__index:107 ("generally available on all direct Anthropic plans"); docs/chrome has no label                    |                                                                                                                                 |
| Remote Control                                             | GA           | docs/remote-control (no label)                                                                                               |                                                                                                                                 |
| Trusted Devices                                            | Beta         | docs/remote-control:255                                                                                                      |                                                                                                                                 |
| Artifacts                                                  | GA           | docs/artifacts:9–11 (plan note only)                                                                                         |                                                                                                                                 |
| Artifact templates                                         | Beta         | docs/artifacts:317                                                                                                           |                                                                                                                                 |
| Self-hosted environments                                   | Beta         | docs/self-hosted-environments:11, :43 (public beta; Team and Enterprise; off by default)                                     |                                                                                                                                 |
| iOS Simulator pane (Desktop)                               | Beta         | docs/desktop-ios-simulator:11                                                                                                |                                                                                                                                 |
| Desktop on Linux                                           | Beta         | docs/desktop-linux:5, :11                                                                                                    |                                                                                                                                 |
| JetBrains plugin                                           | Beta         | docs/jetbrains:40, :86 (plugin and settings named "Claude Code [Beta]")                                                      | The page body has no status sentence; the badge comes from the product name                                                     |
| Projects                                                   | Beta         | docs/claude-projects:11 (public beta; Pro, Max, Ultra)                                                                       |                                                                                                                                 |
| Claude Tag                                                 | Beta         | docs/claude-tag (HTML; "Public Beta" pill and keyword)                                                                       |                                                                                                                                 |
| Claude Code in Slack (legacy)                              | Deprecated   | docs/slack:7–12 (works only in workspaces not connected to Tag), :183–185 (retired in connected workspaces since 2026-10-05) |                                                                                                                                 |
| MCP tasks                                                  | Beta         | docs/mcp:503 (public beta, v2.1.304+)                                                                                        | See R20                                                                                                                         |
| Plugin evals (`claude plugin eval`)                        | GA           | docs/plugin-evals (no label)                                                                                                 | The manifest key `experimental.evals` sits in a container whose "shape may still change" (docs/plugins__manifest-reference:156) |
| Mods                                                       | GA           | docs/plugins__mods__overview:97 ("on by default"; terminal v2.1.287+)                                                        |                                                                                                                                 |
| Prompt hooks (`type: "prompt"`)                            | GA           | docs/hooks:404 (no label)                                                                                                    | Design §9 Ch28 marks prompt and agent hooks together; badge only the agent hooks                                                |
| Agent hooks (`type: "agent"`)                              | Experimental | docs/hooks:405, :4079                                                                                                        |                                                                                                                                 |
| `bashEditDiffEnabled` (the real key name)                  | GA           | docs/settings-reference:2718–2728; CL v2.1.269 L4092                                                                         |                                                                                                                                 |
| PowerShell tool                                            | Preview      | docs/tools-reference:519–521 ("during the preview")                                                                          | Opt-in on macOS, Linux, and WSL (:457)                                                                                          |
| Sandbox `network.tlsTerminate`                             | Experimental | docs/settings-reference:2293; docs/sandboxing:609                                                                            |                                                                                                                                 |
| OTel traces                                                | Beta         | docs/monitoring-usage:162 ("Traces (beta)")                                                                                  |                                                                                                                                 |
| Contribution metrics                                       | Beta         | docs/analytics:35 (public beta; Teams and Enterprise)                                                                        |                                                                                                                                 |
| GitLab CI/CD                                               | Beta         | docs/gitlab-ci-cd:11                                                                                                         |                                                                                                                                 |
| Auto mode                                                  | GA           | docs/permission-modes (no label)                                                                                             | Drift: "research preview" in docs/whats-new__2026-w13                                                                           |
| AGENTS.md                                                  | GA           | docs/memory:353–368 (v2.1.277+; built-in plugin `cc-plugin-agents-md`, init `plugins`)                                       |                                                                                                                                 |
| `/goal`                                                    | GA           | docs/goal, docs/commands:96 (no label)                                                                                       |                                                                                                                                 |
| Idle compaction                                            | GA           | settings-reference `idleCompaction` (no label); CL v2.1.302 L1249, v2.1.314 L592/L609                                        |                                                                                                                                 |
| `/design` skill                                            | GA           | docs/commands:81 (no label)                                                                                                  | Drift: "research preview" in docs/whats-new__index:45 and whats-new__2026-w34                                                   |
| `/agents` wizard                                           | Removed      | CL v2.1.198 L6672; docs/commands:54                                                                                          | See R23                                                                                                                         |
| `/vim`, `/pr-comments`, `/ultraplan`                       | Removed      | docs/commands:168, :122, :161                                                                                                |                                                                                                                                 |
| `TaskOutput` tool                                          | Removed      | docs/tools-reference:57 (v2.1.277)                                                                                           |                                                                                                                                 |
| OTel `claude_code.safety_event`                            | Removed      | CL v2.1.312 L738                                                                                                             | See R18                                                                                                                         |

## 3. Conflict rulings

Format: the readings with their sources, then the ruling, then the slide treatment. "Callout" means a `食い違い` box that shows both readings and their sources.

**R1. Advisor on Claude Platform on AWS.**

- Reading A, unavailable: docs/advisor:11, :179; docs/claude-platform-on-aws:11; docs/feature-availability:110–118 (✗ in the AWS column), :247.
- Reading B, available: CL v2.1.300 L1398, "Added `/advisor` on Claude Platform on AWS; no advisor runs until you pick one".
- Observation: with `CLAUDE_CODE_USE_ANTHROPIC_AWS=1`, the init `slash_commands` includes `advisor` [note-run] notes/enterprise-ops:402.
- Ruling: the command exists on 2.1.321. Nobody has verified that the server-side advisor actually returns advice there.
- Slide: callout in Ch5 (Ch59 links to it). 「2.1.300 で /advisor が追加（changelog・実機の init に表示）/ docs は利用不可と記載。助言が実際に返るかは未検証」.

**R2. `/skill-doctor` version.**

- docs/skills:949 says "requires v2.1.252 or later".
- CL v2.1.261 L4466 says "Added `/skill-doctor`".
- docs/whats-new__2026-w36 covers v2.1.251–261, so it fits both readings.
- Ruling: unresolved.
- Slide: 「2.1.261 で追加（changelog）」 with a one-line callout: 「skills ページは v2.1.252 以降と記載」.

**R3. `--system-prompt-snapshot` version.**

- docs/cli-reference:134 says "Requires v2.1.257 or later".
- CL v2.1.267 L4317 says "Added `--system-prompt-snapshot off`".
- docs/cli-reference:177 says that before v2.1.265 the system prompt flags turned recording off "unless you passed `--system-prompt-snapshot on`". So the flag existed before 2.1.267.
- Ruling: the flag appeared around 2.1.257, and the `off` value came in 2.1.267. No changelog line introduces the flag itself.
- Slide: 「`off` は 2.1.267 から（changelog）。フラグ自体は docs 上 v2.1.257 以降」. Both readings fit together, so no callout is needed. help:233 documents `on|off`.

**R4. The `best` alias.**

- In 2.1.321 the docs say `best` = `opus`: docs/model-config:33, :1131 (the version-history row "v2.1.321: `best` resolves to the same model as `opus`. Earlier versions use the model `fable` resolves to").
- The changelog mentions `best` only in its Fable-era meaning: CL v2.1.257 L4710 and v2.1.301 L1351. No 2.1.321 line records the retarget.
- Observed: `--model best` → `claude-opus-5-5` [note-run]. `/model` usage lists `best` [note-run].
- Ruling: `best` → `claude-opus-5-5` is a fact.
- Slide: state it, with a footnote 「2.1.321 より前は fable と同じモデル（docs 版履歴）」.

**R5. `--effort` values.**

- `ultracode` is documented (docs/cli-reference:88; docs/model-config:659, :664, :669) and accepted. `--effort ultracode` gives `xhigh` with Ultracode on [note-run] notes/models-effort:399.
- `--help` lists only `low, medium, high, xhigh, max` (help:84–85).
- `--effort bogus` prints `Unknown --effort value 'bogus' — ignoring it and using the default effort…`, keeps running, and exits 0 [note-run] notes/models-effort:401, lab/models-effort/handback.txt:3. This matches the pre-2.1.203 behavior that docs/model-config:669 describes.
- Ruling: these are facts.
- Slide: state them, with a note 「`--help` の候補一覧には ultracode が無い」. No callout.

**R6. `fable[1m]`.**

- The `/model` usage text in `-p` lists `fable[1m]` [note-run] notes/models-effort:42.
- `--model 'fable[1m]'` → `claude-fable-5-2` [note-run].
- The docs alias table does not list it (docs/model-config:30–40).
- CL v2.1.311 L791 says the `[1m]` suffix "is still accepted" where it has no effect. Fable 5.2 is natively 1M (CL v2.1.321 L19).
- Ruling: the name is accepted and has no effect.
- Slide: keep it out of the alias table. One `Undocumented` note: 「`fable[1m]` も受け付けるが効果なし」.

**R7. Auto-mode fallback when the server does not review.**

- docs/permission-modes:382 says Claude Code "falls back to its own classifier requests". docs/auto-mode-classifier-billing:23 describes the same fallback.
- CL v2.1.319 L174 says that with telemetry or feature flags off, including behind LLM gateways, calls the server can't check "are asked about or denied, with no fallback to the built-in classifier". `CLAUDE_CODE_AUTO_MODE_SERVER=0` keeps the built-in classifier. Bedrock, Vertex, and Foundry are unchanged.
- Ruling: the changelog entry is newer and explicit, so it wins for the telemetry-off, flags-off, and gateway cases. The docs still describe the other cases.
- Slide: Ch24 states the 2.1.319 behavior, with a callout that cites both readings.

**R8. Error-reporting opt-out.**

- docs/data-usage:106 says `DISABLE_ERROR_REPORTING=1`. docs/data-usage:102 adds the blanket `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`.
- docs/network-config:246 says `DISABLE_ERROR_REPORTING` **or `DISABLE_TELEMETRY`**, and says "a server-side rollout gate" enables reports.
- The two pages also disagree on when error reporting is on. docs/data-usage:108–112 says Pro, Max, or Ultra; v2.1.198+; direct API; no ZDR or HIPAA.
- docs/env-vars:451 says `0` or `false` still opts out.
- Ruling: unresolved for `DISABLE_TELEMETRY`.
- Slide: Ch61 recommends `DISABLE_ERROR_REPORTING` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, which both pages accept. Add a callout on whether `DISABLE_TELEMETRY` also opts out.

**R9. `--permission-prompt-tool` and `--advisor`.**

- Both flags are documented (docs/cli-reference:114 and :63; docs/settings-reference "Per-session overrides" under `advisorModel`).
- Neither has its own row in any `--help` capture. All five captures are byte-identical (`cmp`), 313 lines each.
- `--permission-prompt-tool` is named only inside the `--permission-prompts` text (help:157). `--advisor` appears nowhere in help.
- Ruling: both are facts (docs), hidden from help.
- Slide: state them, with the note 「`claude --help` には載らない」. No badge.

**R10. `--restricted` tool removal.**

- docs/cli-reference:125 and help:195–203 say it removes "built-in tools that run commands or code … and WebFetch".
- Observed init: `Bash`, `Monitor`, `CronCreate`, `RemoteTrigger`, and `Workflow` are gone, and `Glob` and `Grep` appear [note-run] notes/settings-env-tools:625. The Glob and Grep part matches docs/tools-reference:318.
- Ruling: these are facts, observed.
- Slide: Ch44 lists the removed tools with `実機確認` and adds 「docs は一般的な表現のみ」. No raw init was kept, so do not quote counts.

**R11. Tools absent from the init, and init-only names.** Each missing tool gets a reason only where the docs give one.

- `Glob` and `Grep`: absent by default on macOS, Linux, and WSL; searches go through `bfs`/`ugrep` in Bash (docs/tools-reference:313).
- `LSP`: inactive until a code-intelligence plugin is installed (:367).
- `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, and `TodoWrite`: default on certain models only (:615).
- `WebFetch`: an organization-policy gate exists for Team and Enterprise (:675–681). Its absence on this account is unexplained.
- `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode`, `Artifact`, `EndConversation`, and `SendFeedback`: the docs give no reason for their absence in `-p`. Slides say 「理由はドキュメントに記載なし」.
- `DesignSync`: in the init [raw] init:7, but not in tools-reference or any other docs page. `Undocumented`.
- `ReadMcpResourceDirTool`: **not** in the 24-tool baseline. It appears only when MCP servers are connected [note-run] machine §2.3. It is documented only in docs/agent-sdk__typescript:3957. Slides say 「SDK リファレンスのみ記載」.
- `web-fetch` agent: in the init [raw] init:102. Its definition in strings reads "Use this to fetch and read web pages / URLs when you do not have a direct WebFetch tool" [strings]. It is `Undocumented`. Do not claim that it causes the missing WebFetch tool.

**R12. `/loop` self-paced fallback.**

- docs/scheduled-tasks:130 says one fallback wakeup fires about 20 minutes later.
- CL v2.1.319 L184 says the loop now ends when a turn finishes without rescheduling, and `CLAUDE_CODE_LOOP_KEEPALIVE=1` restores the old behavior.
- Ruling: the changelog is newer and explicit, so it wins.
- Slide: Ch43 states the 2.1.319 behavior, with a callout citing docs/scheduled-tasks:130. The env var follows the changelog-only rule.

**R13. Hidden or undocumented CLI surface.**

The following are **documented** (in cli-reference unless noted) but missing from `claude --help`. They are facts with no badge; add 「`--help` 非表示」.

- `claude daemon logs|run|status|stop --any` (:32–35)
- `claude remote-control`/`rc` (:44)
- `claude self-hosted-runner` (:47)
- `--exec` (:92)
- `--teammate-mode` (:136; the value is validated, [note-run] notes/multi-agent:530)
- `--append-subagent-system-prompt[-file]` (:68–69; `-file` came in CL v2.1.261 L4465)
- `--rewind-files`: documented only in docs/agent-sdk__file-checkpointing:163–166, which says it "doesn't appear in `claude --help`". Not run in research, so no `実機確認`. Use it on SDK slides only.

The following is `Undocumented` with `実機確認`:

- `--file <specs...>`: appears **in `--help`** (help:100) but on no docs page.

`--resume-session-at` and `--resume-drops-turn` are strings-only. They may appear only in Ch63.

**`claude rc --help` prints help.** Captures `lab/platforms/rc-help.txt` and `rc-alias-help.txt` are identical. **machine §1.5 and §9.9 ("would start the feature") are overturned by this observed run.**

**R14. Env vars outside the reference.**

These are **changelog-only**. They are facts under badge rule 2, with the version in the footer, and they belong in Ch20:

- `CLAUDE_CODE_SUBAGENT_EFFORT` (CL v2.1.316 L521)
- `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` (v2.1.296 L1706)
- `CLAUDE_CODE_LOOP_KEEPALIVE` (v2.1.319 L184)
- `CLAUDE_CODE_DISABLE_ULTRATHINK` (v2.1.316 L518)
- `CLAUDE_CODE_DISABLE_MCP_TASKS` (v2.1.319 L176)

`CLAUDE_CODE_FORK_SUBAGENT` is **documented** (docs/env-vars:306). It is not a candidate. **This corrects the brief.**

These are **strings-only** and belong in Ch63 with `Undocumented`. Name them only; do not say what they do:

- `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE` (and `_RESTART`, `_RESTARTED_FROM`)
- `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS`
- `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL`
- `CLAUDE_CODE_COORDINATOR_MODE` and the other `CLAUDE_CODE_COORDINATOR_*` names
- `CLAUDE_CODE_PROACTIVE`. This is unrelated to the documented `/proactive` alias of `/loop`.
- `CLAUDE_CODE_WORKFLOWS`. The documented counterpart is `CLAUDE_CODE_DISABLE_WORKFLOWS` (docs/env-vars:280).

These other strings-only names also stay out of the main text:

- `mcp xaa`
- the hidden helper subcommands `apply-project-settings`, `import-conversations`, `edit-*`, `drop-worktree-registrations`, `sandbox install`, and `claude design-login` (the CLI subcommand; the slash command `/design-login` is documented at docs/commands:83 and stays in the catalog)
- `cc-plugin-easel`

**R15. Workflows and Agent Teams status; naming subagents.**

- Status: see §2. Workflows are GA, with a launch label of research preview. Agent Teams are Experimental, with a launch label of research preview.
- Naming, reading A: docs/sub-agents:970 says Claude can pass `name` "if you start a session with agent teams enabled".
- Naming, reading B: docs/agent-teams:462 says that with teams turned off, "Claude may still name subagents, and the name keeps working as a `SendMessage` address".
- Both pages agree that while teams are on, a named spawn from the main conversation becomes a teammate, unless it is a fork or passes `isolation` (docs/sub-agents:972; docs/agent-teams:58, :445).
- Slide: Ch39 states the agreed part, with a callout on whether naming requires teams.

**R16. Remote Control `--settings`, `/teleport`, and `/install-slack-app`.**

- `claude remote-control --settings <file>` is a fact: CL v2.1.321 L20 (newer and explicit) and the help in `lab/platforms/rc-help.txt`. The docs flag table (docs/remote-control:60–74) omits it. Slides say 「docs の表は未掲載」.
- `/teleport` pulls a session in only (docs/commands:157; docs/claude-code-on-the-web:84). The binary's description string "Send this session to the cloud, or resume one from claude.ai" is [strings]. State the docs reading. The strings text may appear only in Ch67, labeled as strings.
- `/install-slack-app`: state the docs text "Opens a browser to complete the OAuth flow" (docs/commands:105). Drop the strings detail about the Marketplace URL. It is not a real conflict.

**R17. Starting mode and `--cloud <id>`.**

- Docs: "v2.1.283 or later" puts interactive terminal and VS Code sessions on every plan and provider in auto (docs/permission-modes:11, :84, :331).
- Changelog:
  - v2.1.283 L3014 covers only third-party providers and telemetry-off sessions.
  - v2.1.284 L2901 covers every plan and provider.
- Slide, interactive case: 「2.1.284 以降すべてのプランで auto 開始（changelog）」, with a callout 「docs は v2.1.283 と記載」.
- `-p` sub-conflict: docs/permission-modes:82 says `-p` and the SDK start in `default`, and the raw init:35 agrees on first-party. CL v2.1.285 L2752 says `-p` and the Python SDK start in **auto** on third-party providers or with telemetry off.
- Slide, `-p` case: state `default` with the 2.1.285 exception in a callout. The exception is unverified.
- `--cloud`: help:64–66 says "attach to an existing one by session ID". docs/cli-reference:79 says an ID **queues a message, with `-p`**. docs/claude-code-on-the-web:477 says that without `-p` it prints "Attaching to an existing cloud session is not enabled for your account."
- Slide: Ch50 states the docs behavior, with a callout on the help wording. Unverified.

**R18. OTel, server-managed settings, Foundry, and auth precedence.**

- `claude_code.safety_event`:
  - Documented at docs/monitoring-usage:1053 and added in CL v2.1.307 L1031.
  - CL v2.1.312 L738 says the event is no longer sent.
  - It did not appear in a deny-rule run [note-run] notes/enterprise-ops:677.
  - Ruling: it is not emitted in 2.1.321. Badge it `Removed`, with a callout because the docs still list it.
- Server-managed settings: CL v2.1.316 L533 says that for Team and Enterprise logins they "apply without an approval prompt". docs/server-managed-settings:82, :270 still describe the dialog.
  - Ruling: the changelog wins.
  - Slide: callout. Unverified.
- Foundry: docs/microsoft-foundry:112 says "no startup model check, so requests fail". CL v2.1.314 L639 says the session falls back to an older model of the family.
  - Ruling: the changelog wins.
  - Slide: callout. Unverified.
- Auth precedence: step 1 of docs/authentication:250 names only `_BEDROCK`, `_VERTEX`, and `_FOUNDRY`. `CLAUDE_CODE_USE_MANTLE` and `CLAUDE_CODE_USE_ANTHROPIC_AWS` are documented (docs/env-vars:418, :421), and `claude auth status` reports `third_party` for both [note-run].
  - Slide: add them as 「docs の優先順位表には未記載」.
- Observed provider order (`apiProvider` in `claude auth status`; no requests were sent): **Bedrock > Foundry > Platform on AWS > Mantle > Vertex** [note-run] notes/enterprise-ops:342. The docs give only partial order: docs/claude-platform-on-aws:92 and docs/self-hosted-environments-configuration:607. Label it 「実機の表示上の選択順」.

**R19. Result schema, `--verbose`, and the GitLab page.**

- `subagent_stats`, `safety_stops`, and `model_usage_since_last_result` appear in no docs page.
  - [raw] `raw/headless/json_result.redacted.json:62` and `:86`; init file :308, :332, :347 (the last only in stream-json).
  - Mark them `Undocumented` and `実機確認`.
  - `terminal_reason`, `result_index`, `queued_turn_count`, and `ttft_ms` are documented in docs/agent-sdk__typescript.
- stream-json requires `--verbose`. Observed: `Error: When using --print, --output-format=stream-json requires --verbose` [raw] `lab/headless/nv.err:1`. The docs only show the flag in examples (docs/headless:199–202). This is a fact with `実機確認`.
- GitLab: docs/gitlab-ci-cd:426 cites `@anthropic-ai/claude-code`. **That is the current npm package of the CLI** (docs/setup:469). Only the _SDK_ package was renamed, to `@anthropic-ai/claude-agent-sdk` (docs/agent-sdk__migration-guide:19).
  - **The claim in notes/headless-ci-sdk:10 is overturned. There is no conflict, so drop the item.**

**R20. Mods, MCP tasks, the gateway retry, and plugin CLI extras.**

- Mods auto-enable: CL v2.1.321 L28 says mods that Claude writes turn on without asking in auto and bypass modes, and do not load in `dontAsk`. docs/plugins__mods__create:36 says Claude Code asks.
- `$.tool.call` and `$.mcp.call` raise no permission prompt: CL v2.1.321 L29. Deny rules and organization policy still apply. docs/plugins__mods__admin:177 says "under the session's permission rules".
- Ruling for both: the changelog is newer and explicit, so it wins.
- Slide: Ch33 states the 2.1.321 behavior, with callouts.
- Mod API names that appear only in the changelog (badge rule 2):
  - `prompt.change` hook (CL v2.1.300 L1401)
  - `virtualText` (L1394)
  - `$.ui.view({ agentId })` (L1396)
  - `decider: "person"` (CL v2.1.304 L1151)
  - **notes/mcp-plugins:867 says `$.ui.view` is documented. It is not: the mods pages contain only `$.ui.status`.**
- MCP tasks: docs/mcp:503 says public beta and v2.1.304+, and docs/env-vars:586 lists MCP tasks among the flag-fetch features. CL v2.1.319 L176 says MCP tasks work in the terminal without flag fetching, and `CLAUDE_CODE_DISABLE_MCP_TASKS=1` turns them off.
  - Ruling: the changelog wins. Slide: callout.
- Gateway retry: **not a conflict.** CL v2.1.304 L1166 introduced the retry, and CL v2.1.305 L1121 fixed its regression. docs/mcp:1848 says "v2.1.305 or later".
  - Slide: state v2.1.305.
- Plugin CLI items missing from the docs:
  - `Undocumented` with `実機確認` (help only): `plugin install --registry` and `plugin validate --profile directory`.
  - Badge rule 2: `plugin restore-set-aside` (CL v2.1.321 L50; help `raw/help/plugin_restore-set-aside.txt`), `plugin eval --disallow-tools` and the `disallowed_tools` case field (CL v2.1.299 L1509).
  - `--judge-model` default: docs/plugin-evals:214 says "the model for background tasks", and help says `haiku`. Present both readings with no callout; they are probably the same model.

**R21. Hooks and skills.**

- Exit 1 with valid JSON: the JSON decides (docs/hooks:797–801).
  - Observed: the deny was honored, but the stream `hook_response` reports `outcome: "error"`, `exit_code: 1` [raw] `lab/hooks/hook-events.stream.redacted.jsonl:40`.
  - Slide: a fact plus the observed nuance.
- Concurrency:
  - docs/hooks:407 caps prompt and agent hooks at 12 at once per event.
  - CL v2.1.312 L735 adds 24 at once per session, including subagents, plus 12 overdue hooks, and counts a `timeout` under 1 s as 1 s.
  - The two limits complement each other. State both.
- `--bare` and skills: docs/headless:37 says skill auto-discovery is skipped, except `--add-dir` `.claude/skills/` (:39). help:53–54 says "Skills still resolve via /skill-name".
  - Observed `--bare` init: 18 skills and 51 commands, with `schedule`, `ultrareview`, `usage-credits`, and `extra-usage` gone [note-run] notes/settings-env-tools:627, notes/commands-ui:49.
  - Ruling: bundled skills remain, and directory skills are skipped. Both statements are true.
- Skill classification across sources:
  - The docs mark 21 bundled: 20 Skill + 1 Workflow.
  - The init `skills` lists 19. It adds `schedule` and `plugin-authoring`. It lacks `artifact-capabilities`, `artifact-diagramming`, `claude-in-chrome`, and `slides`.
  - `/context` in `-p` also lists `init`, `security-review`, and `keybindings-help` as built-in skills [note-run] notes/commands-ui:224.
  - Slide: count by the docs marker. Show the init difference on one slide, and give no reasons.
- `scratchpad_dir` is documented as "absent when the session has no scratchpad" (docs/hooks:745). It was absent from every hook input in `-p` runs [raw] (no occurrence in the `lab/hooks` captures). This is a fact plus an observation.

**R22. `/btw`, recognized names, and the N/A message.**

- `-p "/btw …"` → `/btw isn't available in this environment.` [note-run] notes/commands-ui:496.
- CL v2.1.299 L1535 and L1653 mention `/btw` "in non-interactive sessions". Which surface that means is unknown.
- Slide: state the `-p` observation. Add a one-line callout that cites the changelog. Do not guess the surface.
- `/loops`, `/wellbeing`, `/cloud-plugins`, `/project`, `/session`, and `/use-case` are recognized (they return the N/A message) [note-run] but undocumented. They are `Undocumented` and belong only in Ch12 (hidden commands) or Ch67.
- `extra-usage` is documented as the old name of `/usage-credits` (docs/whats-new__2026-w21:29).
- `__remote-workflow` and `workflow-launch-exec` are init-only names. Mark them `Undocumented`, and use them only on the headless-reality slide.
- Spelling: slides use the docs form `/design consent` / `/design revoke` (docs/commands:82). The init shows `design-consent` / `design-revoke`; quote that form only on the init slide.
- The N/A message: per docs/agent-sdk__skills:168, it means "a built-in command that isn't available in the session". It also appears for the removed `/vim` and `/ultraplan` and for `/context` under `--disable-slash-commands` [note-run] notes/commands-ui:43, :50. **It does not prove that a command is interactive-only.**

**R23. The `/agents` wizard was removed in 2.1.198.**

- CL v2.1.198 L6672: "Removed the `/agents` wizard; ask Claude to create or manage subagents, or edit `.claude/agents/` directly".
- docs/commands:54: it prints a reminder; on v2.1.197 and earlier it opened the UI.
- CL v2.1.281 L3245 removed the leftover menu entry.
- `/agents` is still in the init [raw] init:36 list. In `-p` it prints the reminder [note-run] notes/commands-ui:60. The strings show `isHidden` and a "(removed)" description [strings] machine §2.4.
- Slide: Ch66 owns the removal; Ch37 links to it.

**R24. Sonnet 5.5 cache-read price.**

- CL v2.1.284 L2884 gives $0.20/Mtok.
- CL v2.1.296 L1715 changes Claude Code's cost figures (`/cost`, status line, `--max-budget-usd`, SDK) to **$0.10/Mtok (was $0.20)**.
- Ruling: use $0.10, as of 2.1.296.
- Slide: 「キャッシュ読み取り $0.10/Mtok（2.1.296 で訂正。2.1.284 の告知は $0.20）」. Write prices as Claude Code's cost-calculation rates. The docs pages carry no Sonnet 5.5 price table.

## 4. Owner chapters

The owner chapter explains a topic in full. Every other chapter links to it and spends at most one line on it.

| Topic                                                                                                                                                     | Owner          | Linkers                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------- |
| Auto-compact window (`autoCompactWindow`, `/autocompact`, `--autocompact`, env vars), idle compaction, the observed Pre/PostCompact order, prompt caching | Ch6            | Ch2, Ch28                                                 |
| Scheduled tasks: `/loop`, `Cron*`, `ScheduleWakeup`, `/schedule` and routines, Desktop scheduled tasks                                                    | Ch43           | Ch7 (`/goal` vs `/loop` comparison only), Ch52            |
| Managed settings (delivery, managed-only keys, server-managed settings)                                                                                   | Ch58           | Ch18 (precedence only), Ch22                              |
| Advisor (including R1)                                                                                                                                    | Ch5            | Ch2, Ch59                                                 |
| Permission modes (list, Manual naming, starting mode, R17)                                                                                                | Ch23           | Ch24, Ch44                                                |
| Auto mode classifier, server review, billing (R7)                                                                                                         | Ch24           | Ch23                                                      |
| `/code-review`, `/review`, ultrareview, `claude ultrareview`, GitHub Code Review                                                                          | Ch47           | Ch12                                                      |
| `/usage`, `/cost`, `/stats`, `/usage-credits` (`/extra-usage`), cost display                                                                              | Ch61           | Ch12 (catalog row)                                        |
| `/fast` and fast mode pricing                                                                                                                             | Ch4            | Ch2                                                       |
| Model pricing, aliases, subagent model resolution                                                                                                         | Ch2            | Ch4, Ch37                                                 |
| Effort levels, `ultracode` flag and toggle, subagent effort                                                                                               | Ch3            | Ch41 (what Ultracode does), Ch37                          |
| Conversation branching: `/branch`, `--fork-session`, `/fork`, `/subtask`                                                                                  | Ch7            | Ch37 (owns fork _subagents_, `CLAUDE_CODE_FORK_SUBAGENT`) |
| Background sessions, `--bg`, `/background`, `claude agents`/`attach`/`logs`/`stop`/`rm`/`respawn`, `claude daemon`                                        | Ch38           | Ch7, Ch44                                                 |
| Remote Control: `claude remote-control` flags, `/remote-control`, Trusted Devices, mobile push                                                            | Ch49           | Ch38, Ch52                                                |
| Cloud sessions: `--cloud`, `--teleport`, `/teleport`, `/remote-env`                                                                                       | Ch50           | Ch49                                                      |
| Bundled skills list, the 55-vs-116 explanation, hidden commands                                                                                           | Ch12           | Ch29, Part 0 slide 5                                      |
| Skill mechanics, `/skill-doctor` (R2)                                                                                                                     | Ch29           | Ch12                                                      |
| Built-in tools, `Task`/`Agent` naming, R11                                                                                                                | Ch21 (+付録 E) | Ch44, Ch37                                                |
| Headless init and result schema, isolation modes `--bare`/`--safe-mode`/`--restricted` (R10, R19, R21 bare)                                               | Ch44           | Ch26, Ch27, Part 0                                        |
| Settings precedence and merge                                                                                                                             | Ch18           | Ch19, Ch58                                                |
| Env vars, including changelog-only ones (R14)                                                                                                             | Ch20 (+付録 B) | all                                                       |
| Strings-only candidates                                                                                                                                   | Ch63           | none                                                      |
| Hook events, exit codes, concurrency (R21)                                                                                                                | Ch28 (+付録 D) | Ch6, Ch33                                                 |
| MCP tasks (R20)                                                                                                                                           | Ch30           | Ch38                                                      |
| Mods behavior and API (R20)                                                                                                                               | Ch33           | Ch22, Ch31                                                |
| Plugin CLI, including `eval` and `validate` extras                                                                                                        | Ch31           | Ch32                                                      |
| Marketplaces, `extraKnownMarketplaces`, `restore-set-aside`                                                                                               | Ch32           | Ch58                                                      |
| Cross-session messaging, `/list-agents`/`/peers`, `SendMessage`                                                                                           | Ch40           | Ch37, Ch39                                                |
| `/goal`, and `/goal` vs `/loop` vs Stop hooks                                                                                                             | Ch7            | Ch43, Ch28                                                |
| Agent teams, `--teammate-mode`, naming (R15)                                                                                                              | Ch39           | Ch37                                                      |
| CLAUDE.md, AGENTS.md                                                                                                                                      | Ch9            | Ch1                                                       |
| `/btw` (R22)                                                                                                                                              | Ch13           | Ch44                                                      |
| Auth precedence, observed provider order (R18)                                                                                                            | Ch57           | Ch59                                                      |
| Provider specifics (Bedrock, Vertex, Foundry, Platform on AWS, Mantle)                                                                                    | Ch59           | Ch2, Ch57                                                 |
| OTel, telemetry, error-reporting opt-out (R8, R18)                                                                                                        | Ch61           | Ch26, Ch58                                                |
| Claude in Chrome, computer use                                                                                                                            | Ch54           | Ch52                                                      |
| Claude Tag, Slack (legacy), Projects, `/install-slack-app`                                                                                                | Ch55           | Ch48                                                      |
| Removals and renames (`/agents`, `/vim`, `TaskOutput`, Task→Agent, default→Manual)                                                                        | Ch66           | the feature chapters                                      |
| Status labels (summary of §2)                                                                                                                             | Ch62           | none                                                      |
| The full list of conflicts (summary of §3)                                                                                                                | Ch67           | none                                                      |

## 5. Privacy reminders (categories only; never copy values)

- The user's home path, username, hostname, email, organization name or ID, and account identifiers.
- The absolute research or scratchpad path. It contains the username and a UUID.
- Any UUID, session ID, request ID, `messaging_socket_path`, `cwd`, or memory path value from a capture.
- The names of the user's installed plugins, MCP servers, connectors, marketplaces, user-level skills, and plugin agents.
- User-specific numbers from normal runs: total tools, total commands or skills, agent count, MCP server count and statuses, plugin count, and costs. Use only the safe-mode baseline numbers in §1.
- The user's own configuration: the configured permission mode, `auth status` fields (auth method, plan or subscription, login expiry), and the contents of user settings.
- Any `*.private.*` file under `lab/`. Quote other lab output only after redaction (design §5b).
