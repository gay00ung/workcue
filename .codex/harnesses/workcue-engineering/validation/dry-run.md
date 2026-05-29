# Dry Run

Scenario: "WorkCue README에 설치 전 demo 명령 설명 추가"

1. Confirm current branch is not `main`; otherwise create `docs/readme-demo-command`.
2. Create `_workspace/00_input/request.md`.
3. `context-curator` reads product plan, daily log, and docs domain log.
4. `change-planner` records planned README and Obsidian updates.
5. `implementation-engineer` edits only README and relevant Obsidian files.
6. `verification-reviewer` runs Markdown checks and `git status --short --branch`.
7. `release-integrator` prepares Korean commit, push, and PR body.
8. Run structural validation:

```bash
python3 "${CODEX_HARNESS_SKILL_ROOT:-$HOME/.codex/skills/codex-harness}/scripts/validate_harness.py" .codex/harnesses/workcue-engineering
```

9. Confirm the final response includes:
   - changed files
   - validation evidence
   - Obsidian log commit status
   - PR link or exact blocker
   - residual risk

## Structural Expectations

- `HARNESS.md` includes Obsidian, branch, commit, and PR rules.
- Every agent contract includes the required sections.
- Every skill has valid frontmatter.
- `validation/trigger-matrix.md` and `validation/dry-run.md` exist.
- `.github/PULL_REQUEST_TEMPLATE.md` contains `TL;DR`, `맥락`, `변경사항`.
