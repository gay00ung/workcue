# WorkCue

<p align="center">
  <a href="README.md"><img alt="Language English" src="https://img.shields.io/badge/lang-English-2563eb?style=for-the-badge"></a>
  <a href="README.ko.md"><img alt="Language Korean" src="https://img.shields.io/badge/lang-%ED%95%9C%EA%B5%AD%EC%96%B4-16a34a?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Local first" src="https://img.shields.io/badge/local--first-yes-0f766e?style=for-the-badge">
  <img alt="MCP ready" src="https://img.shields.io/badge/MCP-ready-7c3aed?style=for-the-badge">
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-111827?style=for-the-badge">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220?style=for-the-badge">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ed?style=for-the-badge">
  <img alt="License Apache 2.0" src="https://img.shields.io/badge/license-Apache--2.0-64748b?style=for-the-badge">
</p>

<p align="center">
  <img src="assets/workcue-hero.png" alt="WorkCue morning brief hero" width="100%">
</p>

Wake up to the right work.

WorkCue is a local-first morning planner for work scattered across existing tools. It does not replace your todo app or kanban board. It reads the places where work already lives, ranks what deserves attention today, and explains why.

## Demo

The Phase 0 demo runs with built-in fixture data. It does not require API tokens or external services.

```bash
pnpm install
pnpm demo --date 2026-05-29
```

You can also run the CLI package directly:

```bash
pnpm --filter workcue start today --demo --date 2026-05-29
```

To read local Obsidian tasks:

```bash
pnpm today --obsidian-vault /path/to/vault --date 2026-05-29
```

To inspect normalized source items without generating a brief:

```bash
pnpm --filter workcue start sync --demo --date 2026-05-29
```

To write synced items to a local SQLite cache:

```bash
pnpm --filter workcue start sync --demo --date 2026-05-29 --cache .workcue/workcue.sqlite
```

To explain one ranked work item:

```bash
pnpm --filter workcue start explain github:pr-184 --demo --date 2026-05-29
```

The Obsidian connector reads unchecked markdown tasks such as:

```markdown
- [ ] Review billing PR #work 📅 2026-05-30 🔼 [estimate:: 25m]
- [ ] Follow up with design #waiting [due:: 2026-05-31]
```

To write a brief to a markdown file:

```bash
pnpm today --obsidian-vault /path/to/vault --output ./briefs/2026-05-29.md
```

To upsert a WorkCue-managed block into an existing daily note:

```bash
pnpm today --obsidian-vault /path/to/vault --daily-note /path/to/vault/Daily/2026-05-29.md
```

Only the `<!-- workcue:start -->` to `<!-- workcue:end -->` block is replaced on later runs. Other note content is preserved.

Example output:

```markdown
# WorkCue Morning Brief - 2026-05-29

Top recommendation: Review PR #184: Fix payment retry race condition

## Today's Focus

1. Review PR #184: Fix payment retry race condition
   Why now:
   - 사용자 리뷰가 요청된 항목입니다.
   - 현재 milestone에 포함된 작업입니다.
   - production 영향이 있는 작업입니다.
```

## Current Scope

- TypeScript and pnpm monorepo scaffold
- Core WorkItem, Signal, Recommendation, and Brief models
- Deterministic demo scoring
- Local Obsidian markdown task connector
- GitHub Issues and PR connector package
- Jira issue connector package
- Markdown morning brief renderer
- Markdown file output
- Obsidian daily note upsert
- MCP stdio server with `workcue_sync`, `workcue_today`, `workcue_explain`, and `workcue_doctor`
- Local SQLite cache for sync results
- Dockerfile for local container runs
- CLI commands: `workcue sync`, `workcue explain`, `workcue today --demo`
- CLI source option: `--obsidian-vault <path>`

## Product Principles

- No new todo app
- Read-first, write-later
- Deterministic scoring before optional LLM summaries
- Evidence on every recommendation
- Local-first and self-hostable by default
- Pluggable sources and outputs

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm --filter workcue start today --demo
```

## Local Config

Create a local config file:

```bash
pnpm --filter workcue start init --output .workcue/config.yml
```

Use local Obsidian and output paths:

```bash
pnpm --filter workcue start init \
  --output .workcue/config.yml \
  --obsidian-vault /path/to/vault \
  --markdown-output ./briefs/{{date}}.md \
  --daily-note /path/to/vault/Daily/{{date}}.md
```

Check the config:

```bash
pnpm --filter workcue start doctor --config .workcue/config.yml
```

Run from config:

```bash
pnpm today --config .workcue/config.yml --date 2026-05-29
```

GitHub config stores an environment variable name, not the token value:

```yaml
sources:
  github:
    enabled: true
    tokenEnv: GITHUB_TOKEN
    owner: your-org
    repos:
      - your-repo
    user: your-github-login
```

Jira config also stores environment variable names, not credential values:

```yaml
sources:
  jira:
    enabled: true
    baseUrl: https://your-domain.atlassian.net
    emailEnv: JIRA_EMAIL
    tokenEnv: JIRA_API_TOKEN
    jql:
      - assignee = currentUser() AND statusCategory != Done
```

Local config generated by `workcue init` enables SQLite cache by default:

```yaml
cache:
  sqlite:
    enabled: true
    path: .workcue/workcue.sqlite
```

You can tune deterministic scoring with signal multipliers:

```yaml
scoring:
  signalWeights:
    review_requested: 1.3
    due_soon: 1.2
    waiting_external: 0.7
```

LLM summaries are disabled by default. To enable an OpenAI-compatible endpoint or Ollama, configure `llm.enabled` and keep API key values in environment variables:

```yaml
llm:
  enabled: true
  provider: openai-compatible
  baseUrl: https://api.openai.com
  model: model-name
  apiKeyEnv: OPENAI_API_KEY
```

## MCP Server

WorkCue ships a local MCP server so Codex, Claude Desktop, Cursor, and other MCP clients can ask for the same morning brief without WorkCue becoming a new todo database.

Available tools:

- `workcue_sync`: reads configured sources and returns normalized work items without raw connector payloads.
- `workcue_today`: generates a brief from demo data, an Obsidian vault, or configured sources.
- `workcue_explain`: explains the deterministic score and recommendation reasons for one work item.
- `workcue_doctor`: checks config readiness without fetching external work items.

Run the stdio server locally:

```bash
pnpm mcp
```

Example MCP client config:

```json
{
  "mcpServers": {
    "workcue": {
      "command": "pnpm",
      "args": ["--dir", "/path/to/workcue", "mcp"]
    }
  }
}
```

Example tool arguments:

```json
{
  "demo": true,
  "date": "2026-05-29",
  "top": 3
}
```

Use `configPath` to point the MCP server at a local `.workcue/config.yml`. Credential values stay in environment variables such as `GITHUB_TOKEN`, `JIRA_EMAIL`, and `JIRA_API_TOKEN`; WorkCue config stores only their variable names.

More docs:

- [Automation](docs/automation.md)
- [Local cache](docs/cache.md)
- [Docker](docs/docker.md)
- [LLM summaries](docs/llm.md)
- [MCP server](docs/mcp.md)
- [Scoring](docs/scoring.md)
- [Obsidian daily note recipe](docs/recipes/obsidian-daily-note.md)
- [GitHub PR review radar recipe](docs/recipes/github-pr-review-radar.md)

The project harness lives in `.codex/harnesses/workcue-engineering/`. Local paths belong in `.codex/local.env`, which is ignored by Git. Use `.codex/local.example.env` as the template.
