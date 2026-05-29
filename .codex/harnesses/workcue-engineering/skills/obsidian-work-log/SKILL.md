---
name: obsidian-work-log
description: "Maintain date-based and domain-based WorkCue knowledge files in the Obsidian vault for every task, including decisions, failures, improvements, results, and reasons. Use inside this harness when the task requires this capability."
---

# Obsidian Work Log

## Purpose

Maintain date-based and domain-based WorkCue knowledge files in the Obsidian vault for every task, including decisions, failures, improvements, results, and reasons.

## Canonical Paths

- Vault repo: `${WORKCUE_OBSIDIAN_REPO}`
- WorkCue knowledge root: `${WORKCUE_KB_ROOT}`
- Product plan: `${WORKCUE_PRODUCT_PLAN}`
- Daily logs: `${WORKCUE_KB_ROOT}/daily/YYYY-MM-DD.md`
- Domain logs: `${WORKCUE_KB_ROOT}/domains/{domain}.md`
- Failure registry: `${WORKCUE_KB_ROOT}/failures.md`

## Procedure

1. Before implementation, read the product plan, latest daily log, relevant domain logs, and failure registry when present.
2. During the task, note decisions, reasons, commands, failures, fixes, and validation results.
3. After implementation, update `daily/YYYY-MM-DD.md` with a timestamped entry.
4. Update one or more domain files when the lesson affects future work.
5. Update `failures.md` when a failure is reusable or likely to recur.
6. In the Obsidian repo, stage only WorkCue knowledge files touched by the current task.
7. Commit with the Korean Git convention and push when possible.

## Daily Entry Template

```markdown
## HH:mm - <작업명>

- 요청:
- 브랜치:
- 변경 파일:
- 변경 이유:
- 실행 명령:
- 실패:
- 개선:
- 결과:
- 다음 작업:
```

## Domain File Rules

- `domains/harness.md`: 하네스 규칙, 역할, 검증, 운영 변경
- `domains/git-flow.md`: 브랜치, 커밋, 푸시, PR 규칙
- `domains/architecture.md`: 제품/기술 아키텍처 결정
- `domains/connectors.md`: GitHub, Jira, Obsidian, Notion, Linear, AFFiNE connector 교훈
- `domains/scoring.md`: ranking, signal, deterministic scoring 변경
- `domains/privacy.md`: 토큰, LLM, redaction, telemetry 결정
- `domains/release.md`: 배포, changelog, PR, versioning 결정

If a domain file does not exist, create it with a short heading and first decision entry.

## Commit Rule For Obsidian

Use the Obsidian vault repo, not the WorkCue repo:

```bash
git -C "$WORKCUE_OBSIDIAN_REPO" add <path-under-knowledge-root>
git -C "$WORKCUE_OBSIDIAN_REPO" commit -m "docs: <한국어 제목>"
git -C "$WORKCUE_OBSIDIAN_REPO" push
```

Never stage unrelated dirty vault files.

## Quality Bar

- Prefer project conventions and existing tools.
- Keep outputs structured and easy to merge with other role outputs.
- Do not hide partial failures; record them with enough detail for a rerun.
- Every task must leave enough Obsidian context for a future AI agent to continue without asking why a change was made.
