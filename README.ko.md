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

업무 도구는 그대로, 오늘 할 일만 자동으로.

WorkCue는 Jira, GitHub, Obsidian 같은 기존 업무 도구에 흩어진 일을 읽고 오늘 집중해야 할 작업을 근거와 함께 추천하는 로컬 우선 morning planner다. 새로운 todo 앱이나 칸반 보드를 만들지 않는다. 이미 쓰는 업무 시스템을 source of truth로 유지하고, 그 위에 아침 브리핑 레이어를 얹는다.

## Demo

내장 fixture만으로 실행할 수 있다. API token이나 외부 서비스가 필요 없다.

```bash
pnpm install
pnpm demo --date 2026-05-29
```

CLI package를 직접 실행할 수도 있다.

```bash
pnpm --filter workcue start today --demo --date 2026-05-29
```

로컬 Obsidian vault의 unchecked task를 읽으려면:

```bash
pnpm today --obsidian-vault /path/to/vault --date 2026-05-29
```

brief를 만들기 전에 정규화된 source item만 확인하려면:

```bash
pnpm --filter workcue start sync --demo --date 2026-05-29
```

sync 결과를 로컬 SQLite cache에 저장하려면:

```bash
pnpm --filter workcue start sync --demo --date 2026-05-29 --cache .workcue/workcue.sqlite
```

특정 추천 항목의 점수 근거를 설명하려면:

```bash
pnpm --filter workcue start explain github:pr-184 --demo --date 2026-05-29
```

Obsidian connector는 이런 markdown task를 읽는다.

```markdown
- [ ] Review billing PR #work 2026-05-30 [estimate:: 25m]
- [ ] Follow up with design #waiting [due:: 2026-05-31]
```

brief를 markdown 파일로 저장하려면:

```bash
pnpm today --obsidian-vault /path/to/vault --output ./briefs/2026-05-29.md
```

기존 Obsidian daily note에 WorkCue block만 upsert하려면:

```bash
pnpm today --obsidian-vault /path/to/vault --daily-note /path/to/vault/Daily/2026-05-29.md
```

반복 실행 시 `<!-- workcue:start -->`부터 `<!-- workcue:end -->` 사이의 managed block만 교체된다. 사용자가 직접 작성한 note 내용은 보존된다.

예시 출력:

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

## 현재 범위

- TypeScript와 pnpm 기반 monorepo
- WorkItem, Signal, Recommendation, Brief core model
- deterministic demo scoring
- Obsidian markdown task connector
- GitHub Issues/PR connector
- Jira issue connector
- Markdown morning brief renderer
- Markdown file output
- Obsidian daily note upsert
- MCP stdio server: `workcue_sync`, `workcue_today`, `workcue_explain`, `workcue_doctor`
- sync 결과용 로컬 SQLite cache
- 로컬 container 실행용 Dockerfile
- CLI commands: `workcue sync`, `workcue explain`, `workcue today --demo`

## 제품 원칙

- 새로운 todo 앱을 만들지 않는다.
- 초기 버전은 read-first, write-later 원칙을 지킨다.
- optional LLM summary보다 deterministic scoring을 먼저 수행한다.
- 모든 추천에는 evidence가 있어야 한다.
- local-first와 self-hostable을 기본으로 한다.
- source와 output은 pluggable하게 확장한다.

## 개발

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm --filter workcue start today --demo
```

## 로컬 설정

로컬 config 파일 생성:

```bash
pnpm --filter workcue start init --output .workcue/config.yml
```

Obsidian과 output path를 함께 설정:

```bash
pnpm --filter workcue start init \
  --output .workcue/config.yml \
  --obsidian-vault /path/to/vault \
  --markdown-output ./briefs/{{date}}.md \
  --daily-note /path/to/vault/Daily/{{date}}.md
```

config 점검:

```bash
pnpm --filter workcue start doctor --config .workcue/config.yml
```

config 기반 실행:

```bash
pnpm today --config .workcue/config.yml --date 2026-05-29
```

GitHub config는 token 값이 아니라 환경변수 이름만 저장한다.

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

Jira config도 credential 값이 아니라 환경변수 이름만 저장한다.

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

`workcue init`으로 생성되는 local config는 SQLite cache를 기본으로 켠다.

```yaml
cache:
  sqlite:
    enabled: true
    path: .workcue/workcue.sqlite
```

deterministic scoring은 signal multiplier로 조정할 수 있다.

```yaml
scoring:
  signalWeights:
    review_requested: 1.3
    due_soon: 1.2
    waiting_external: 0.7
```

LLM summary는 기본적으로 꺼져 있다. OpenAI-compatible endpoint나 Ollama를 켜려면 `llm.enabled`를 설정하고 API key 값은 환경변수에 둔다.

```yaml
llm:
  enabled: true
  provider: openai-compatible
  baseUrl: https://api.openai.com
  model: model-name
  apiKeyEnv: OPENAI_API_KEY
```

## MCP Server

WorkCue는 Codex, Claude Desktop, Cursor 같은 MCP client에서 같은 morning brief를 조회할 수 있도록 로컬 MCP server를 제공한다.

제공 tools:

- `workcue_sync`: source를 읽고 raw connector payload 없는 normalized item summary를 반환
- `workcue_today`: demo data, Obsidian vault, configured sources에서 morning brief 생성
- `workcue_explain`: 특정 work item의 deterministic score와 추천 근거 설명
- `workcue_doctor`: 외부 source fetch 없이 config readiness 점검

stdio server 실행:

```bash
pnpm mcp
```

MCP client config 예시:

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

tool arguments 예시:

```json
{
  "demo": true,
  "date": "2026-05-29",
  "top": 3
}
```

`configPath`로 로컬 `.workcue/config.yml`을 지정할 수 있다. `GITHUB_TOKEN`, `JIRA_EMAIL`, `JIRA_API_TOKEN` 같은 credential 값은 환경변수에 두고, WorkCue config에는 환경변수 이름만 저장한다.

## 문서

- [Automation](docs/automation.md)
- [Local cache](docs/cache.md)
- [Docker](docs/docker.md)
- [LLM summaries](docs/llm.md)
- [MCP server](docs/mcp.md)
- [Scoring](docs/scoring.md)
- [Obsidian daily note recipe](docs/recipes/obsidian-daily-note.md)
- [GitHub PR review radar recipe](docs/recipes/github-pr-review-radar.md)

프로젝트 하네스는 `.codex/harnesses/workcue-engineering/`에 있다. 로컬 경로는 Git에 올라가지 않는 `.codex/local.env`에만 둔다. 공개 template은 `.codex/local.example.env`를 사용한다.
