# Release Guide

This guide prepares WorkCue for `v0.1.0-alpha.2` developer preview releases. It avoids local paths, token values, private vault data, and generated briefs in Git.

## Release Standard

A release candidate is acceptable only when all checks pass:

```bash
pnpm install --frozen-lockfile
pnpm release:check
```

`pnpm release:check` runs:

- clean build output
- TypeScript build
- test suite
- public safety scan
- compiled CLI and MCP smoke checks
- tarball pack checks
- temporary install smoke for `workcue`

## Package Set

Publish these packages with the same version:

- `@workcue/core`
- `@workcue/config`
- `@workcue/output-markdown`
- `@workcue/connector-github`
- `@workcue/connector-jira`
- `@workcue/connector-notion`
- `@workcue/connector-obsidian`
- `@workcue/llm`
- `@workcue/cache-sqlite`
- `@workcue/runtime`
- `@workcue/mcp-server`
- `workcue`

All package tarballs are generated under `.release/tarballs/`, which is ignored by Git.

## Manual Publish

Use the alpha dist tag until the project has production adoption evidence:

```bash
pnpm release:check
pnpm -r publish --tag alpha --access public
```

Use an npm account with two-factor authentication enabled. Do not put npm tokens in committed files, docs, issues, PR bodies, or generated briefs.

## Git Tag

After publish succeeds:

```bash
git tag v0.1.0-alpha.2
git push origin v0.1.0-alpha.2
```

Release notes should include:

- TL;DR
- install command
- supported sources and outputs
- privacy posture
- known alpha limitations
- verification command: `pnpm release:check`

## Rollback

If a publish issue is found before adoption:

```bash
npm deprecate workcue@0.1.0-alpha.2 "Use the next alpha release."
```

Apply the same deprecation message to affected `@workcue/*` packages. Do not force-delete package versions unless there is a credential or legal exposure issue.

## Known Alpha Limits

- GitHub, Jira, and Notion connectors need real workspace credentials for live source validation.
- The SQLite cache uses Node.js built-in SQLite support and requires Node 24 or newer.
- WorkCue is read-first. Write-back to source tools is intentionally not part of this alpha.
