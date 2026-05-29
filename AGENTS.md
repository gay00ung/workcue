# WorkCue Agent Instructions

All Codex work in this repo must use the project harness:

- Harness: `.codex/harnesses/workcue-engineering/HARNESS.md`
- Orchestrator: `.codex/harnesses/workcue-engineering/orchestrator.md`
- Product plan: `${WORKCUE_PRODUCT_PLAN}`
- Work log root: `${WORKCUE_KB_ROOT}`

Before editing, load local paths from `.codex/local.env` when present, then read the harness, the orchestrator, the product plan, the latest daily log, and relevant domain files. Create or confirm a task branch before changes.

Every task must update Obsidian work logs with request, branch, files, commands, failures, fixes, result, and reason for meaningful changes. Commit WorkCue repo changes and Obsidian vault changes separately.

Commit titles and bodies must be Korean with an approved prefix. Avoid sentence endings like `다`, `습니다`, `했다`, `하였다`; prefer noun phrases ending with `추가`, `수정`, `개선`, `정리`, `보강`, `검증`.

After completed work, push the branch and open a Korean PR when possible. PR bodies must include `TL;DR`, `맥락`, and `변경사항`.
