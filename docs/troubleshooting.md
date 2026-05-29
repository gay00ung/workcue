# Troubleshooting

## `npm install workcue` fails inside a WorkCue checkout

Symptom:

```text
npm error Cannot read properties of null (reading 'matches')
```

This can happen when `npm install` is run inside this source repository after pnpm has created `node_modules`. WorkCue development uses pnpm workspaces, and npm can misread pnpm's symlinked dependency tree.

Use one of these flows instead:

```bash
# Develop from source
pnpm install
pnpm today --demo
```

```bash
# Install the published CLI outside this source checkout
npm install -g workcue@alpha
workcue today --demo
```

```bash
# Or run without global install
npx workcue@alpha today --demo
```

If a package lock was created accidentally in this repository, remove it before continuing with pnpm. The repository tracks `pnpm-lock.yaml`, not `package-lock.json`.

## WorkCue checkout 안에서 `npm install workcue`가 실패하는 경우

증상:

```text
npm error Cannot read properties of null (reading 'matches')
```

이 오류는 pnpm이 만든 `node_modules`가 있는 source repository 안에서 `npm install`을 실행할 때 발생할 수 있습니다. WorkCue 개발 환경은 pnpm workspace를 기준으로 하며, npm이 pnpm의 symlink 기반 dependency tree를 잘못 해석할 수 있습니다.

source에서 개발할 때는 다음 명령을 사용합니다.

```bash
pnpm install
pnpm today --demo
```

배포된 CLI package를 설치할 때는 WorkCue source checkout 밖에서 실행합니다.

```bash
npm install -g workcue@alpha
workcue today --demo
```

또는 global install 없이 실행합니다.

```bash
npx workcue@alpha today --demo
```

실수로 이 repository 안에 `package-lock.json`이 생겼다면 pnpm으로 이어가기 전에 제거합니다. 이 repository는 `package-lock.json`이 아니라 `pnpm-lock.yaml`을 추적합니다.
