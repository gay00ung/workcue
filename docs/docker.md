# WorkCue Docker

The Docker image runs the same local-first CLI in a container. It does not bake local config files, env files, tokens, or Obsidian vault data into the image.

## Build

```bash
docker build -t workcue:local .
```

## Demo

```bash
docker run --rm workcue:local
```

## Run With Config

Mount a local config directory and pass credentials through environment variables:

```bash
docker run --rm \
  -v "$PWD/.workcue:/app/.workcue:ro" \
  -v "$PWD/briefs:/app/briefs" \
  -e GITHUB_TOKEN \
  -e JIRA_EMAIL \
  -e JIRA_API_TOKEN \
  workcue:local today --config .workcue/config.yml
```

If your config writes `outputs.markdown.path` to `./briefs/{{date}}.md`, the generated brief is written to the mounted `briefs` directory.

## Obsidian Vaults

For local Obsidian vaults, mount the vault explicitly:

```bash
docker run --rm \
  -v "$PWD/.workcue:/app/.workcue:ro" \
  -v "/path/to/obsidian-vault:/vault" \
  workcue:local today --config .workcue/config.yml
```

In the container config, use `/vault` as the Obsidian vault path.

## Safety

- `.dockerignore` excludes `.workcue`, `.env`, `.codex/local.env`, workspaces, build output, and `node_modules`.
- Pass token values as environment variables at runtime.
- Do not copy private vaults into the image.
- Treat generated briefs as potentially sensitive.
