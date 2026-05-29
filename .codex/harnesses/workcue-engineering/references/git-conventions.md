# Git Conventions

## Branch

`<type>/<short-kebab-summary>`

Allowed types: `feature`, `fix`, `docs`, `harness`, `chore`, `refactor`, `test`, `ci`, `release`.

## Commit

`<prefix>: <한국어 제목>`

Allowed prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `harness`, `ci`, `build`, `release`.

Rules:

- Korean title and body, except technical identifiers.
- Avoid endings like `다`, `습니다`, `했다`, `하였다`.
- Prefer noun phrase endings such as `추가`, `수정`, `개선`, `정리`, `보강`, `검증`.
- Commit WorkCue repo and Obsidian vault repo separately.

## Pull Request

PRs are Korean. Required sections:

- `TL;DR`
- `맥락`
- `변경사항`

Recommended sections:

- `검증`
- `남은 위험`
- `Obsidian 기록`
