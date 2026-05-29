# Trigger Matrix

## Should Trigger

- Implement a WorkCue feature, connector, CLI command, scoring rule, MCP tool, output, or privacy change.
- Update WorkCue docs, README, architecture notes, CI, release config, or examples.
- Modify `.codex/harnesses/workcue-engineering/` or repo-level agent instructions.
- Add or update WorkCue Obsidian knowledge files.
- Commit, push, or open a PR for WorkCue.
- Investigate a validation failure or repeated implementation mistake.

## Should Not Trigger

- Answer a simple factual question unrelated to the project.
- Run a single shell command with no reusable workflow implications.
- Edit an unrelated document without domain-specific orchestration.
- Install global skills without explicit permission.
- Change files outside WorkCue without a WorkCue impact.

## Trigger Examples

| Request | Trigger | Required notes |
| --- | --- | --- |
| `GitHub connector MVP 구현` | yes | Read product plan, branch, update connector/domain log |
| `오늘 작업 로그 정리` | yes | Update daily Obsidian log and commit vault changes |
| `하네스 규칙 보강` | yes | Validate harness and update `domains/harness.md` |
| `현재 시간 알려줘` | no | Direct answer or shell command only |
| `다른 프로젝트 Gradle 빌드` | no | Outside WorkCue scope |
