# Data files

The JSON files in this directory feed the generated catalog and appendix slides (design §9, Part X) and the coverage lint.
`tools/extract.mjs` builds them mechanically from the docs mirror and the raw `claude --help` captures of Claude Code 2.1.321.
Agents then add the Japanese descriptions in batches (see [Japanese descriptions](#japanese-descriptions)).

## Files

| File                | Rows | Source                                                                                                                       | One row per                                      |
| :------------------ | ---: | :--------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------- |
| `settings.json`     |  249 | `docs/settings-reference.md`                                                                                                 | `### \`key\`` heading                            |
| `env.json`          |  402 | `docs/env-vars.md`, table under `## Variables`                                                                               | table row                                        |
| `cli-flags.json`    |   83 | `docs/cli-reference.md`, `## CLI flags` table, merged with `raw/help/root.txt`                                               | flag (63 in both, 17 docs only, 3 help only)     |
| `cli-commands.json` |   69 | `docs/cli-reference.md`, `## CLI commands` table, merged with the `Commands:` blocks of every `raw/help/*.txt`               | command (23 in both, 13 docs only, 33 help only) |
| `hook-events.json`  |   33 | `docs/hooks.md`, event table under `## Hook lifecycle`                                                                       | event                                            |
| `tools.json`        |   46 | `docs/tools-reference.md`, `Tool / Description / Permission required` table                                                  | tool                                             |
| `commands.json`     |  119 | `docs/commands.md`, `## All commands` table; `raw/headless/safe_nousersettings_stream.redacted.json`; `notes/commands-ui.md` | slash command (116 current + 3 removed)          |

Paths in the Source column are relative to the research root in `$CCDD_RESEARCH`.
The plan expected 41 tools; the 2.1.321 docs table has 46 rows.

## Shared fields

Every row has these fields:

| Field     | Meaning                                                                                                                                      |
| :-------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | The identifier, verbatim (`advisorModel`, `ANTHROPIC_API_KEY`, `--print`, `claude mcp add`, `PreToolUse`, `Bash`, `/compact`)                |
| `desc_en` | The English description from the source, with markdown links reduced to their text and bold markers removed. Code spans keep their backticks |
| `desc_ja` | One Japanese sentence written from `desc_en`                                                                                                 |
| `status`  | `ga`, `preview`, `beta`, `experimental`, `deprecated`, or `removed` (see [Status](#status))                                                  |
| `anchor`  | Public docs URL, with a fragment where the docs give one                                                                                     |

## Per-file fields

- `settings.json`
  - `category`: the enclosing `## ` heading. It matches the index table's Topic column for every key.
  - `scope`: the short label from the `* **Scope**:` bullet, such as `Any file`, `Managed`, `User or managed`, `Global config`. `scope_note` holds the rest of the bullet, if any.
  - `type`, `default`: the `* **Type**:` and `* **Default**:` bullets, links reduced. A type that ends with `one of:` lists the values from its sub-bullets.
  - `summary_en`: the key's one-line description from the Settings index table.
  - `desc_en` is the first paragraph. When the section opens with a `> [!WARNING]` callout, the callout text comes first. When the paragraph ends with `:` and introduces a list, the list items follow it, separated by `;` (`idleCompaction`, `strictPluginOnlyCustomization.hooks`, `disableDesktopLocalSessions`).
  - `taskOutputMaxChars` has no Scope, Type, or Default bullets. Its `scope` comes from the index table; `type` and `default` are empty.
  - `anchor` uses the fragment from the index table link, for example `#attribution-commit`.
- `env.json`: `desc_en` is the Purpose cell. Every `anchor` is `env-vars#variables`, because the docs give no per-variable fragment.
- `cli-flags.json`
  - `aliases`: the other spellings, from the docs cell and the help line (`--print` has `-p`).
  - `args`: the argument placeholder, such as `<model>`.
  - `example`: the docs Example cell.
  - `in_docs`, `in_help`: whether the flag is in the docs table and in `claude --help`.
  - `help_desc`: the help text, joined onto one line.
  - A help-only flag (`--brief`, `--file`, `--help`) uses its help text as `desc_en`.
  - The docs `### System prompt flags` table repeats five flags and is not read.
- `cli-commands.json`
  - Fields are the same as `cli-flags.json`.
  - `name` stops at the first argument, so `claude attach <id|name>` becomes `claude attach` with `args: "<id|name>"`.
  - Invocation forms such as `claude -p "query"` keep the whole cell as `name`.
  - `in_docs` means "in the cli-reference `## CLI commands` table", not "documented". Help-only commands such as `claude mcp add` and `claude plugin install` are covered on other docs pages (`mcp`, `plugins/cli-reference`). Do not badge them `Undocumented` on that basis.
  - `in_help` is true when the command appears in the `Commands:` block of `claude --help` or of a nested capture such as `claude mcp --help`. The parent comes from each capture's `Usage:` line. `help` entries are skipped.
- `hook-events.json`
  - `can_block` is true when the summary row says "Can block": `UserPromptExpansion`, `PreToolUse`, `PreModelSwitch`.
  - The flag reflects only that summary row, not the per-event exit-code and decision-control sections of `hooks.md`.
- `tools.json`
  - `permission`: the "Permission required" cell (`Yes` 14, `No` 32).
  - `anchor` uses the tool's own section (`#bash-tool-behavior`) when the row links to one or a `## <Tool> tool` heading exists. Otherwise it is the page URL.
- `commands.json`
  - `aliases`: from "Alias:", "Aliases:", "Also available as", and "`/x` and `/y` are aliases" in the row, plus the three alias-only rows (`/cost`, `/stats` → `/usage`; `/review` → `/code-review`). There are 24 aliases in total.
  - Alias-only rows are folded into their targets and are not separate rows.
  - History such as `/bug`'s "were aliases of `/feedback`" is not folded.
  - `args`: the argument part of the command cell. The docs row `/design consent`, `/design revoke` becomes two rows.
  - `kind`: `bundled-skill` (20) when the Purpose cell starts with **Skill**, `bundled-workflow` (1, `/deep-research`) when it starts with **Workflow**, otherwise `builtin` (98). The **Skill**/**Workflow** marker is removed from `desc_en`.
  - `removed`: true for `/pr-comments`, `/ultraplan`, `/vim`, whose rows open with "Removed".
  - `in_init`: whether the name is in the `slash_commands` array of the safe-mode `system/init` capture. `/design consent` matches `design-consent`. 52 rows match. The init names `__remote-workflow`, `workflow-launch-exec`, and `extra-usage` have no docs row.
  - `headless`: the `` `-p` probe `` cell of the slash command catalog in `notes/commands-ui.md`, copied verbatim.

## Status

`status` comes only from explicit markers in the entry's own description. Code spans are removed first, so an identifier such as `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` never matches.

| Marker                                                                                  | Status         |
| :-------------------------------------------------------------------------------------- | :------------- |
| "research preview"                                                                      | `preview`      |
| "public beta" or "(beta)"                                                               | `beta`         |
| "Experimental" opening a sentence, "(experimental)", or "is/are experimental"           | `experimental` |
| "[DEPRECATED]", "(deprecated)", "Deprecated" opening a sentence, or "is/are deprecated" | `deprecated`   |
| A description that opens with "Removed" (`commands.json` only)                          | `removed`      |
| none of the above                                                                       | `ga`           |

"The deprecated `X`" describes another key, so it does not count.
`tools/extract.mjs` prints every non-`ga` assignment and every near miss for review.

Current non-`ga` rows:

- settings: 4 `deprecated`, 1 `experimental`.
- env: 2 `deprecated`, 1 `experimental`, 1 `preview`, 1 `beta`.
- cli-flags: 1 `preview`, 1 `deprecated`.
- commands: 3 `removed`.

`CLAUDE_CODE_PROPAGATE_TRACEPARENT` is `beta` only because its row ends with "See Traces (beta)".

Entries outside `commands.json` whose description opens with "Removed in vX" stay `ga` under the rule:

- settings: `taskOutputMaxChars`, `permissionExplainerEnabled`, `teammateDefaultModel`.
- env: 7 variables, such as `TASK_MAX_OUTPUT_LENGTH`.
- tools: `TaskOutput`.
- cli-flags: `--enable-auto-mode`.

The extraction log lists all of them.

## Japanese descriptions

- `data/ja/<data-name>.<nn>.json` holds one batch, `{"<name>": "<desc_ja>"}`, of at most about 70 rows.
- `node tools/apply-ja.mjs --check <batch>` validates a batch. `node tools/apply-ja.mjs` validates every batch and merges it into the data files.
- The rules:
  - one sentence ending in `。`;
  - 25–70 characters, not counting backtick marks;
  - the floor drops to 8 when `desc_en` is under 80 characters, so a short source is not padded;
  - every code span appears in the row's `name`, `aliases`, `desc_en`, or `summary_en`.
- Batches apply in file-name order, so a later batch overrides an earlier one. Three corrective batches exist:
  - `settings.05.json` fixes three settings (`enableArtifact`, `idleCompaction`, `terminalProgressBarEnabled`) whose first paragraph does not say what the key does. Those rows follow `summary_en`.
  - `env.07.json` and `commands.03.json` fix three rows whose wording went beyond `desc_en`.
- 49 rows have a `desc_ja` under 25 characters, all from short sources.
- Translators shortened long sources to their main point. They added no facts.
- Rerunning `tools/extract.mjs` keeps each `desc_ja` whose `desc_en` did not change. It drops and logs any `desc_ja` whose source changed.

## Regenerate and test

```sh
CCDD_RESEARCH=<research root> node tools/extract.mjs   # fails with a message when CCDD_RESEARCH is unset
node tools/apply-ja.mjs                                # re-apply the Japanese batches if needed
node --test tools/extract.test.mjs
```

`cli-flags.json` contains the docs example UUID `550e8400-e29b-41d4-a716-446655440000` (the `--session-id` example).
