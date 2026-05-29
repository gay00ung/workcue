---
name: verification-loop
description: "Select and run validation commands that match the risk and blast radius of a change. Use inside this harness when the task requires this capability."
---

# Verification Loop

## Purpose

Select and run validation commands that match the risk and blast radius of a change.

## Procedure

1. Identify changed file types and expected checks.
2. For harness changes, run the codex-harness validator.
3. For docs-only changes, verify Markdown structure enough to catch broken fences and missing required sections.
4. For code changes, run package-manager checks once manifests exist.
5. Inspect `git status --short --branch` for unexpected files.
6. Record failures, fixes, skipped checks, and residual risk in `_workspace/verification-reviewer.md` and Obsidian.

## Harness Validation

```bash
python3 "${CODEX_HARNESS_SKILL_ROOT:-$HOME/.codex/skills/codex-harness}/scripts/validate_harness.py" .codex/harnesses/workcue-engineering
```

## Markdown Fence Check

Use a lightweight fence-balance check for large Markdown edits:

```bash
awk 'function f(s){if(match(s,/^`{3,}/))return RLENGTH;return 0}{l=f($0);if(l>0){if(o==0){o=l;s=NR}else if(l>=o){o=0;s=0}}}END{if(o!=0)print "UNMATCHED",s,o;else print "balanced"}' <file>
```

## Quality Bar

- Prefer project conventions and existing tools.
- Keep outputs structured and easy to merge with other role outputs.
- Do not hide partial failures; record them with enough detail for a rerun.
- A skipped validation must include a concrete reason, not just "not run".
