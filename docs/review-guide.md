# Fact review guide

Every chapter passes a fact review before the site is published. The reviewer did not write the chapter.

## Inputs

- The chapter pages under `src/content/docs/ja/` named in your assignment.
- `docs/ledger.md` (canonical facts, status labels, conflict rulings) and `docs/authoring-guide.md` (markup and style rules).
- The research root `$CCDD_RESEARCH`:
  - `docs/*.md`: the docs mirror. The public URL is `https://code.claude.com/docs/en/<page>`.
  - `docs/changelog.md`
  - `raw/**`, `lab/**`, `machine.md`: observed output from 2.1.321.
- The research notes (`notes/*.md`) are model-written. Never accept a fact because a note says it.

## What to check in every section

1. **Identifiers:** every flag, env var, settings key, command, hook event, field name and file path exists with this exact spelling in the docs mirror, the changelog, or an observed capture.
2. **Values:** defaults, limits, counts, version numbers, model IDs and prices match the source.
3. **Behavior:** each claim about what happens says what the source says. Watch for overstated, reversed, or merged conditions.
4. **Status:** badges match ledger §2. A non-GA feature presented without its badge is an error.
5. **Conflicts:** a `callout conflict` quotes both readings correctly and names their sources.
6. **Observed output:** text in a `.lab` block matches a capture under `raw/` or `lab/`, or a run you repeat yourself. Redaction must not change meaning.
7. **Sources:** the footer links point to the pages the slide actually relies on. Anchors exist in the docs mirror (`grep -n '^#' docs/<page>.md`).
8. **Japanese:** a sentence must not contradict the source through translation. Do not restyle prose that is correct.
9. **Practice guide only (`ja/guide/`):** each recommendation is attributed to its source, not stated as the site's advice. A tier-2 recommendation (Anthropic Engineering blog, claude.dev blog, anthropics GitHub) has a supporting docs link, and that page really supports it. Nothing listed in the best-practices "What you can stop doing" table is recommended. Tier-1b and tier-2 text is paraphrased, not copied. The tier-2 pages are saved under `$CCDD_RESEARCH/external/`.

## What to do

- Fix clear errors in place with minimal edits: a wrong value, a misspelled identifier, a missing badge, a wrong anchor. Keep the slide's structure.
- When a fix needs judgment (the source is ambiguous, or a claim must be removed), make the conservative change: soften the claim to what the source supports, or remove it. List it in your report.
- When you cannot verify a claim, mark the slide's footer with `出典未確認` text only if the claim stays. Prefer removing unverifiable claims.
- Never add new content beyond what a fix needs.
- New observed runs: run them in `$CCDD_RESEARCH/lab/review-<group>/` with `--no-session-persistence --setting-sources project`, prefer `--model haiku`, and never run anything that changes user settings, installs software, or calls billed services.

## Checks after editing

```bash
pnpm build
CCDD_RESEARCH=/path/to/research node tools/lint.mjs --site dist
```

The lint must report no findings.

## Report

At most 250 words:

- the number of claims checked;
- the errors you fixed, each as section id, before, after, and evidence;
- judgment calls;
- claims you could not verify.
