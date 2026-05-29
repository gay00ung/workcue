---
name: git-branch-pr-flow
description: "Apply WorkCue branch naming, Korean commit message, push, and pull request rules for all work. Use inside this harness when the task requires this capability."
---

# Git Branch Pr Flow

## Purpose

Apply WorkCue branch naming, Korean commit message, push, and pull request rules for all work.

## Procedure

1. Inspect branch and dirty state before editing.
2. Create or confirm a task branch before file changes.
3. Keep each commit focused. Commit WorkCue repo and Obsidian vault repo separately.
4. Use Korean commit title and body with the approved prefix.
5. Push the task branch.
6. Create a PR in Korean when remote and authentication allow it.
7. Record commit, push, and PR status in Obsidian.

## Branch Rule

Format:

```text
<type>/<short-kebab-summary>
```

Allowed types:

- `feature`
- `fix`
- `docs`
- `harness`
- `chore`
- `refactor`
- `test`
- `ci`
- `release`

Examples:

- `harness/workcue-codex-rules`
- `feature/github-connector`
- `fix/obsidian-task-parser`
- `docs/scoring-contract`

## Commit Rule

Format:

```text
<prefix>: <한국어 제목>

<한국어 설명>
```

Allowed prefixes:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `harness`
- `ci`
- `build`
- `release`

Style:

- Title and body must be Korean except technical names and paths.
- Avoid endings such as `다`, `습니다`, `했다`, `하였다`.
- Prefer noun phrase endings: `추가`, `수정`, `개선`, `정리`, `보강`, `분리`, `검증`.
- Keep the title under 72 characters when possible.

Good:

```text
harness: WorkCue 개발 하네스 규칙 추가

- Obsidian 기록 경로와 daily/domain 로그 규칙 정리
- 한국어 커밋과 PR 생성 규칙 보강
```

Bad:

```text
docs: WorkCue 하네스를 추가했다
```

## PR Rule

PR title follows the commit title style.

PR body must include:

```markdown
## TL;DR

## 맥락

## 변경사항

## 검증

## 남은 위험
```

`TL;DR`, `맥락`, `변경사항` are mandatory. `검증` and `남은 위험` are strongly expected.

## Quality Bar

- Prefer project conventions and existing tools.
- Keep outputs structured and easy to merge with other role outputs.
- Do not hide partial failures; record them with enough detail for a rerun.
- Never rewrite or squash unrelated user work.
