# WorkCue Engineering Harness

## Purpose

WorkCue 개발을 반복 가능하게 수행하기 위한 Codex 전용 하네스다. 이 하네스는 WorkCue가 "기존 업무 도구 위에 얹는 로컬 우선 AI morning brief layer"라는 제품 원칙을 유지하게 하고, 모든 작업의 맥락, 실패, 개선, 결과, 변경 이유를 Obsidian knowledge base에 누적해 다음 작업자가 같은 실수를 반복하지 않게 만든다.

이 하네스는 코드 구현만 다루지 않는다. 제품 판단, 아키텍처 결정, 커넥터 설계, 검증 실패, 커밋/브랜치/PR 운영, Obsidian 기록까지 WorkCue 개발 생애주기 전체를 관리한다.

## Environment Assumptions

- WorkCue repo: `${WORKCUE_REPO}` or the current Git repository root.
- WorkCue product knowledge base: `${WORKCUE_KB_ROOT}`.
- Product plan: `${WORKCUE_PRODUCT_PLAN}` or `${WORKCUE_KB_ROOT}/workcue-product-plan.md`.
- Obsidian vault Git repo: `${WORKCUE_OBSIDIAN_REPO}` when the knowledge base is stored in a separate vault repo.
- WorkCue remote: the configured `origin` for the current repository.
- Obsidian remote: the configured `origin` for `${WORKCUE_OBSIDIAN_REPO}` when present.
- The repo may start empty. Audit manifests before assuming Node, pnpm, Docker, or CI exists.
- The Obsidian repo may be dirty with unrelated user changes. Stage and commit only WorkCue knowledge files touched by the current task.
- Local absolute paths, usernames, personal remotes, and secrets must stay out of tracked harness files. Put local values in `.codex/local.env`, which is gitignored. Use `.codex/local.example.env` as the public template.

## Architecture

Pattern: `supervisor-producer-reviewer`

Codex acts as the supervisor. Each role is a reusable contract, not a guaranteed separate runtime worker. When multi-agent tooling is unavailable, one Codex session executes the roles in order and writes file-based handoffs.

## Roles

| Role | Responsibility |
| --- | --- |
| context-curator | Load WorkCue product context, Obsidian work history, user constraints, and prior failures before implementation. |
| change-planner | Convert the request into a scoped branch plan with artifacts, risks, validation, and documentation updates. |
| implementation-engineer | Make focused repository changes that follow WorkCue architecture and preserve unrelated user work. |
| verification-reviewer | Run structural and project-specific validation, inspect failures, and propose fixes without hiding risk. |
| release-integrator | Prepare Korean commit messages, Obsidian logs, push steps, and pull request content. |

## Skills

| Skill | Use |
| --- | --- |
| obsidian-work-log | Maintain date-based and domain-based WorkCue knowledge files in the Obsidian vault for every task, including decisions, failures, improvements, results, and reasons. |
| git-branch-pr-flow | Apply WorkCue branch naming, Korean commit message, push, and pull request rules for all work. |
| workcue-product-context | Use the WorkCue product plan and local-first architecture constraints as required project context. |
| implementation-loop | Plan, edit, and review scoped code changes in a dirty worktree without reverting user work. |
| verification-loop | Select and run validation commands that match the risk and blast radius of a change. |

## Non-Negotiable Rules

1. Read context before edits.
   - Read this `HARNESS.md`, `orchestrator.md`, the relevant role contract, and the relevant skill files.
   - Read `${WORKCUE_PRODUCT_PLAN}`.
   - Read the current daily Obsidian log and relevant domain files under `${WORKCUE_KB_ROOT}/domains/`.

2. Work on a branch.
   - Create or confirm a task branch before editing.
   - Never work directly on `main` unless the user explicitly asks.
   - Branch names follow `type/short-kebab-summary`, for example `harness/workcue-codex-rules`, `feature/github-connector`, `fix/obsidian-parser`.

3. Record every task in Obsidian.
   - Add a date-based entry under `daily/YYYY-MM-DD.md`.
   - Add or update a domain file under `domains/` when the lesson should be reused.
   - Record request, branch, changed files, commands, failures, fixes, result, reason for each change, and next action.

4. Keep commits Korean and concise.
   - Commit format: `<prefix>: <한국어 제목>`
   - Body must be Korean when present.
   - Title and body must avoid sentence endings like `다`, `습니다`, `했다`, `하였다`.
   - Prefer noun phrases ending with words such as `추가`, `수정`, `개선`, `정리`, `보강`, `분리`, `검증`.
   - Allowed prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `harness`, `ci`, `build`, `release`.

5. Push and open a PR after completed work.
   - Push the task branch.
   - Create a PR in Korean when GitHub auth and remote allow it.
   - PR body must include `TL;DR`, `맥락`, `변경사항`.
   - Include validation evidence and residual risk.

6. Commit Obsidian WorkCue logs.
   - When WorkCue Obsidian files are added or changed, commit only those files in the Obsidian vault repo.
   - Use the same Korean commit convention.
   - Push after commit when possible.
   - Do not stage unrelated dirty vault files.

7. Preserve local user work.
   - Never run destructive Git commands such as `git reset --hard` or `git checkout --` without explicit user approval.
   - If unrelated files are dirty, ignore them.
   - If unrelated dirty files block the task, explain the blocker and request direction.

8. Product scope guardrail.
   - WorkCue must not become another todo app or kanban board.
   - Preserve the product principle: existing work tools stay the source of truth; WorkCue provides the morning intelligence layer.
   - Ranking must remain evidence-based and deterministic before optional LLM summaries.

## Required Artifact Paths

| Artifact | Path |
| --- | --- |
| Harness package | `.codex/harnesses/workcue-engineering/` |
| Run handoffs | `_workspace/` |
| Product plan | `${WORKCUE_PRODUCT_PLAN}` |
| Daily work logs | `${WORKCUE_KB_ROOT}/daily/YYYY-MM-DD.md` |
| Domain knowledge | `${WORKCUE_KB_ROOT}/domains/*.md` |
| Failure registry | `${WORKCUE_KB_ROOT}/failures.md` |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` |
| Repo-level agent pointer | `AGENTS.md` |

## Triggers

- Any WorkCue code, docs, harness, CI, release, architecture, connector, scoring, MCP, LLM, privacy, or output work.
- Any request that changes WorkCue Obsidian knowledge files.
- Any request to audit, evolve, or rerun a prior WorkCue workflow.
- Any request to commit, push, or open a PR for WorkCue.

## Change Log

| Date | Change | Target | Reason |
| --- | --- | --- | --- |
| 2026-05-29 | WorkCue 하네스 초기 구축 | all | 빈 레포에서 반복 개발 규칙, Obsidian 기록, Git/PR 운영을 고정하기 위해 추가 |
