# WorkCue

Wake up to the right work.

WorkCue is a local-first morning planner for work scattered across existing tools. It does not replace your todo app or kanban board. It reads the places where work already lives, ranks what deserves attention today, and explains why.

## Demo

The Phase 0 demo runs with built-in fixture data. It does not require API tokens or external services.

```bash
pnpm install
pnpm demo --date 2026-05-29
```

You can also run the CLI package directly:

```bash
pnpm --filter workcue start today --demo --date 2026-05-29
```

To read local Obsidian tasks:

```bash
pnpm today -- --obsidian-vault /path/to/vault --date 2026-05-29
```

The Obsidian connector reads unchecked markdown tasks such as:

```markdown
- [ ] Review billing PR #work 📅 2026-05-30 🔼 [estimate:: 25m]
- [ ] Follow up with design #waiting [due:: 2026-05-31]
```

Example output:

```markdown
# WorkCue Morning Brief - 2026-05-29

Top recommendation: Review PR #184: Fix payment retry race condition

## Today's Focus

1. Review PR #184: Fix payment retry race condition
   Why now:
   - 사용자 리뷰가 요청된 항목입니다.
   - 현재 milestone에 포함된 작업입니다.
   - production 영향이 있는 작업입니다.
```

## Current Scope

- TypeScript and pnpm monorepo scaffold
- Core WorkItem, Signal, Recommendation, and Brief models
- Deterministic demo scoring
- Local Obsidian markdown task connector
- Markdown morning brief renderer
- CLI command: `workcue today --demo`
- CLI source option: `--obsidian-vault <path>`

## Product Principles

- No new todo app
- Read-first, write-later
- Deterministic scoring before optional LLM summaries
- Evidence on every recommendation
- Local-first and self-hostable by default
- Pluggable sources and outputs

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm --filter workcue start today --demo
```

The project harness lives in `.codex/harnesses/workcue-engineering/`. Local paths belong in `.codex/local.env`, which is ignored by Git. Use `.codex/local.example.env` as the template.
