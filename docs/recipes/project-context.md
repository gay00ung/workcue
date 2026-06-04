# Recipe: Project Context

Project context lets WorkCue combine existing work items with the real repository they belong to. This is useful when your source of truth is a Notion board, Jira sprint, GitHub PR list, or Obsidian note, but the next action depends on the actual codebase state.

WorkCue does not turn the repository into a task database. It reads a small local summary and uses it as recommendation evidence.

## What WorkCue Reads

When `--project-path` or `projects[].repo.localPath` is configured, WorkCue reads:

- current git branch
- dirty worktree file names from `git status --short`
- recent commit subjects from `git log`
- common manifests such as `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, and `Dockerfile`
- docs file names such as `README.md`, `CHANGELOG.md`, and files under `docs/`
- TODO/FIXME/XXX marker locations

WorkCue does not include local absolute paths in brief markdown or sync JSON. It does not send repository contents to an LLM unless you explicitly build a separate workflow that does so.

## One-Off Run

```bash
pnpm today \
  --notion-board "https://www.notion.so/workspace/Tasks-0123456789abcdef0123456789abcdef" \
  --project-path /path/to/project \
  --project-remote https://github.com/example/project \
  --date 2026-05-29
```

`--project-remote` helps WorkCue match GitHub URLs and cards that mention the repository. If omitted, WorkCue tries to read `origin` from the local git repository.

## Reusable Config

```yaml
projects:
  - id: app
    name: App
    repo:
      localPath: /path/to/project
      remoteUrl: https://github.com/example/project
    match:
      keywords:
        - onboarding
        - billing
      labels:
        - frontend
      sourceUrls:
        - https://github.com/example/project
```

Then run:

```bash
pnpm today --config .workcue/config.yml --date 2026-05-29
```

## How Matching Works

WorkCue attaches project context to a work item when it finds evidence such as:

- a GitHub issue or PR URL from the same repository
- project names, labels, issue keys, or keywords shared by the work item and configured project
- a current branch, changed file, recent commit, or TODO marker that matches terms from the work item

The scoring signal is `project_context`. It is weaker than due dates and review blockers when the only evidence is a repo URL, and stronger when active branch or dirty worktree evidence exists.

## Privacy

- Keep `.workcue/config.yml` out of git when it contains private paths or links.
- Token values still belong in environment variables.
- Briefs and sync JSON summarize repo context with repository name, branch, relative file names, and counts.
- Page body reads for Notion are still out of scope in this preview.
