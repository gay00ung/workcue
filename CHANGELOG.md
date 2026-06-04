# Changelog

## 0.1.0-alpha.3 - 2026-06-04

### Added

- Project repository context analyzer for local git repositories.
- `projects[]` config for repository path, remote URL, default branch, and matching hints.
- CLI and MCP project context inputs through `--project-path`, `--project-remote`, `projectPath`, and `projectRemote`.
- `project_context` scoring signal that links work items to repository evidence.
- Project Context recipe with privacy guidance.

### Changed

- Morning briefs can show concise repository context evidence without local absolute paths.
- Sync JSON now includes bounded project context summaries for matching work items.
- README badges now reflect the alpha.3 release and pnpm 11.x development baseline.

### Notes

- Repository scanning is read-only and summarizes branch, dirty state, recent commit subjects, manifest/docs files, and TODO/FIXME markers.
- Notion page body deep read is still not part of this alpha.
- Keep `.workcue/config.yml` out of git when it contains private project paths, board URLs, or private remotes.

## 0.1.0-alpha.2 - 2026-05-29

### Added

- Notion kanban database/data source connector preview.
- `sources.notion.boards` config for Notion board links, database IDs, and data source IDs.
- CLI and MCP Notion inputs through `--notion-board`, `notionBoard`, and `notionTokenEnv`.
- Notion kanban recipe with property mapping and privacy guidance.
- Project-aware in-progress recommendation evidence.

### Changed

- Release package set now includes `@workcue/connector-notion`.
- README install guidance now separates npm package installation from source checkout development.

### Notes

- This alpha includes Notion row property sync, but still does not read Notion page body blocks.
- Live Notion validation requires a user-owned integration token and a shared database/data source.

## 0.1.0-alpha.1 - 2026-05-29

### Added

- Installable CLI package metadata for `workcue`.
- Installable MCP server package metadata for `@workcue/mcp-server`.
- Public workspace package metadata for WorkCue core, config, runtime, connectors, output, cache, and LLM packages.
- Release smoke script covering CLI version/help, demo brief, JSON sync, explanation, Obsidian output, daily-note upsert, and MCP tool execution.
- Release pack script that creates package tarballs, rejects source/test/build metadata leakage, installs tarballs into a temporary prefix, and runs installed CLI smoke checks.
- Release guide for alpha package checks, publishing, tagging, and rollback.

### Changed

- Package entrypoints now point to `dist` output for publishable artifacts.
- CI now runs build, tests, public safety scan, release smoke, and package tarball smoke.
- Docker image now builds `dist` and runs the compiled CLI by default.

### Notes

- This is an alpha release. Use it for developer preview and local evaluation before production workflows.
- WorkCue remains read-first by default. Token values should stay in environment variables, not config files.
