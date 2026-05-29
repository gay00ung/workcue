# WorkCue Automation

WorkCue can run from cron, launchd, GitHub Actions, or an agent automation. The recommended pattern is:

1. Keep `.workcue/config.yml` local or private.
2. Store credential values in environment variables.
3. Write the brief to a markdown file or Obsidian daily note.
4. Review failures instead of silently ignoring them.

WorkCue currently fails fast when a configured source fails. Disable unstable sources until partial-source fallback is implemented.

## Prerequisites

Create a local config:

```bash
pnpm --filter workcue start init \
  --output .workcue/config.yml \
  --markdown-output ./briefs/{{date}}.md
```

Check the config:

```bash
pnpm --filter workcue start doctor --config .workcue/config.yml
```

Run once manually:

```bash
pnpm today --config .workcue/config.yml --date 2026-05-29
```

## Cron

Install dependencies in the repo, then add a weekday morning cron entry:

```cron
0 9 * * 1-5 cd /path/to/workcue && pnpm today --config .workcue/config.yml >> .workcue/workcue.log 2>&1
```

If your config writes to `outputs.dailyNote.path` or `outputs.markdown.path`, no extra output flag is required.

## macOS launchd

Copy `examples/launchd/dev.workcue.morning-brief.plist`, replace `/path/to/workcue`, and load it:

```bash
launchctl load ~/Library/LaunchAgents/dev.workcue.morning-brief.plist
```

Use launchd when the machine is a personal Mac that should run WorkCue even when no terminal is open.

## GitHub Actions

Use `examples/github-actions/morning-brief.yml` when your sources are reachable from GitHub-hosted runners. This is usually suitable for GitHub and Jira, but not for local-only Obsidian vaults.

The example expects a CI-safe config file such as `workcue.config.yml` to be committed. That config should contain environment variable names, not credential values.

Store secrets as repository or environment secrets:

- `WORKCUE_GITHUB_TOKEN`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`

The example writes the generated markdown as an artifact. Committing generated briefs back to a repo is intentionally not the default.

## Codex Automation

Use `examples/codex-automation/workcue-morning-brief.md` as the prompt body for an agent automation. Prefer local execution when WorkCue needs access to local files such as an Obsidian vault.

The automation should report source failures with the failing source name and should not paste credential values into output.

## Safety

- Do not commit `.workcue/config.yml` if it contains local paths.
- Do not put token values in config files, command arguments, PRs, issues, or generated briefs.
- Prefer environment variables for secrets.
- For GitHub Actions, treat generated markdown artifacts as potentially sensitive.
- For Obsidian daily notes, WorkCue only updates the managed block between `<!-- workcue:start -->` and `<!-- workcue:end -->`.

## Troubleshooting

Run source sync without a brief:

```bash
pnpm --filter workcue start sync --config .workcue/config.yml --json
```

Explain one item:

```bash
pnpm --filter workcue start explain github:pr-184 --config .workcue/config.yml
```

Check MCP locally:

```bash
pnpm --filter @workcue/mcp-server exec tsx -e 'import { runTodayTool } from "./src/server.ts"; (async () => console.log(await runTodayTool({ demo: true })))();'
```
