# Obsidian Knowledge Base Contract

## Canonical Root

`${WORKCUE_KB_ROOT}`

## Required Files

| File | Purpose |
| --- | --- |
| `workcue-product-plan.md` | Product and technical foundation |
| `daily/YYYY-MM-DD.md` | Chronological work log |
| `domains/harness.md` | Harness and operating rules |
| `domains/git-flow.md` | Branch, commit, push, PR rules |
| `domains/architecture.md` | Architecture decisions |
| `domains/connectors.md` | Connector decisions and lessons |
| `domains/scoring.md` | Ranking and signal decisions |
| `domains/privacy.md` | Privacy, token, LLM, telemetry decisions |
| `domains/release.md` | Release and launch decisions |
| `failures.md` | Reusable failure registry |

## Daily Log Requirements

Every task entry must include request, branch, changed files, changed reason, commands, failures, improvements, result, and next action.

## Domain Log Requirements

Domain files only store reusable decisions and lessons. Avoid copying every daily detail into domain files.

## Git Handling

The Obsidian vault is a separate repo. Stage only `workcue/` paths touched by the task. Never stage unrelated vault changes.
