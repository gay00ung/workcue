---
name: implementation-loop
description: "Plan, edit, and review scoped code changes in a dirty worktree without reverting user work. Use inside this harness when the task requires this capability."
---

# Implementation Loop

## Purpose

Plan, edit, and review scoped code changes in a dirty worktree without reverting user work.

## Procedure

1. Confirm the user request, target branch, and success criteria.
2. Read harness context, product plan, relevant Obsidian logs, and prior `_workspace/` artifacts.
3. Inspect existing repo files before choosing implementation style.
4. Make the smallest coherent change that satisfies the request.
5. Use `apply_patch` for manual file edits.
6. Avoid unrelated refactors, generated noise, and metadata churn.
7. Record meaningful change reasons for Obsidian logging.
8. Report assumptions, command evidence, and unresolved risk.

## Quality Bar

- Prefer project conventions and existing tools.
- Keep outputs structured and easy to merge with other role outputs.
- Do not hide partial failures; record them with enough detail for a rerun.
- If the repo is still empty, create only the requested foundation and avoid premature product implementation.
