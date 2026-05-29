# WorkCue Engineering Orchestrator

## Execution Mode

Codex role-contract orchestration for WorkCue engineering. Codex coordinates the roles, writes file handoffs, runs validation, updates Obsidian knowledge, and prepares Korean Git/PR handoff.

Architecture pattern: `supervisor-producer-reviewer`. Use available multi-agent tools for independent phases when present; otherwise execute the roles sequentially in this session.

## Roles

| Role | Contract | Primary output |
| --- | --- | --- |
| context-curator | `agents/context-curator.md` | `_workspace/context-curator.md` |
| change-planner | `agents/change-planner.md` | `_workspace/change-planner.md` |
| implementation-engineer | `agents/implementation-engineer.md` | `_workspace/implementation-engineer.md` |
| verification-reviewer | `agents/verification-reviewer.md` | `_workspace/verification-reviewer.md` |
| release-integrator | `agents/release-integrator.md` | `_workspace/release-integrator.md` |

## Workflow

### Phase 0: Context Check

1. Load `.codex/local.env` if present.
2. Confirm current repo path is `${WORKCUE_REPO}` or the current Git repository root.
3. Run `git status --short --branch` in the WorkCue repo.
4. Confirm the current branch follows the branch rule. If not, create an appropriate task branch before edits.
5. Check for existing `_workspace/` artifacts.
6. If this is a partial rerun, read only the relevant previous artifacts.
7. If this is a new run and `_workspace/` exists, archive old artifacts as `_workspace_YYYYMMDD_HHMMSS/`.
8. Read required context:
   - `.codex/harnesses/workcue-engineering/HARNESS.md`
   - `.codex/harnesses/workcue-engineering/orchestrator.md`
   - `${WORKCUE_PRODUCT_PLAN}`
   - `${WORKCUE_KB_ROOT}/daily/YYYY-MM-DD.md` if it exists
   - relevant files under `${WORKCUE_KB_ROOT}/domains/`
   - `${WORKCUE_KB_ROOT}/failures.md` if it exists

### Phase 1: Intake

Save the request, constraints, target files, success criteria, expected branch, and expected Obsidian files to `_workspace/00_input/request.md`.

Required intake fields:

| Field | Meaning |
| --- | --- |
| `request` | User request in original language |
| `branch` | Current or planned task branch |
| `scope` | Repo files and Obsidian files expected to change |
| `constraints` | Product, privacy, Git, PR, validation, and user constraints |
| `success_criteria` | Concrete completion checks |
| `risk` | Known risk before implementation |

### Phase 2: Role Execution

| Step | Action | Output |
| --- | --- | --- |
| Execute context-curator | Apply `context-curator` role contract | `_workspace/context-curator.md` |
| Execute change-planner | Apply `change-planner` role contract | `_workspace/change-planner.md` |
| Execute implementation-engineer | Apply `implementation-engineer` role contract | `_workspace/implementation-engineer.md` |
| Execute verification-reviewer | Apply `verification-reviewer` role contract | `_workspace/verification-reviewer.md` |
| Execute release-integrator | Apply `release-integrator` role contract | `_workspace/release-integrator.md` |

Role execution rules:

- `context-curator` must run before implementation work.
- `change-planner` must identify Obsidian logging updates before edits.
- `implementation-engineer` must keep changes scoped and preserve unrelated dirty work.
- `verification-reviewer` must record commands and failures exactly enough for rerun.
- `release-integrator` must prepare Korean commit messages and PR body, and must separate WorkCue repo commits from Obsidian vault commits.

### Phase 3: Synthesis

Read role outputs, resolve conflicts with source notes, and produce the final artifact requested by the user.

### Phase 4: Verification

Run validation appropriate to the current scope. Save results to `_workspace/verification.md`.

Always run for harness changes:

```bash
python3 "${CODEX_HARNESS_SKILL_ROOT:-$HOME/.codex/skills/codex-harness}/scripts/validate_harness.py" .codex/harnesses/workcue-engineering
```

Always inspect:

```bash
git status --short --branch
```

When a package manifest exists, add the project-specific checks named by the manifest, usually install, typecheck, lint, and tests.

### Phase 5: Handoff

1. Update Obsidian daily log with:
   - request
   - branch
   - changed files
   - commands
   - failures and fixes
   - result
   - reason for each meaningful change
   - next action
2. Update relevant domain files when reusable knowledge changed.
3. Commit WorkCue repo changes with the Korean commit convention.
4. Push the WorkCue branch.
5. Create a PR with Korean title/body and required sections: `TL;DR`, `맥락`, `변경사항`.
6. Commit and push WorkCue Obsidian knowledge file changes in the Obsidian vault repo, staging only files under `workcue/`.
7. Respond with changed files, validation evidence, PR link if created, Obsidian commit status, and residual risk.

## Retry Policy

- Retry deterministic command failures once after inspecting the error.
- Do not retry destructive commands without explicit user approval.
- If a role fails, continue only when the final response can clearly state the missing coverage.
- If GitHub push or PR creation fails, record the exact reason in the Obsidian daily log and final response.
- If Obsidian vault has unrelated dirty files, stage only the WorkCue files touched by the current task.

## Partial Rerun Policy

Rerun only the changed role, then rerun synthesis, verification, and Obsidian logging. If the changed role affects release output, rerun `release-integrator`.
