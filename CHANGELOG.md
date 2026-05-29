# Changelog

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
