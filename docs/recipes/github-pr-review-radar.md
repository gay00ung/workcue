# Recipe: GitHub PR Review Radar

This recipe prioritizes assigned issues and pull requests where your review is requested.

## Config

```yaml
version: 1
timezone: UTC
user:
  handles:
    - your-github-login
sources:
  github:
    enabled: true
    tokenEnv: GITHUB_TOKEN
    owner: your-org
    repos:
      - your-repo
    user: your-github-login
```

## Run

```bash
GITHUB_TOKEN=... pnpm today --config .workcue/config.yml
```

## Inspect

```bash
pnpm --filter workcue start sync --config .workcue/config.yml --json
```

Then explain a specific item:

```bash
pnpm --filter workcue start explain github:pr-184 --config .workcue/config.yml
```

Do not commit token values. The config stores `tokenEnv`, not the token itself.
