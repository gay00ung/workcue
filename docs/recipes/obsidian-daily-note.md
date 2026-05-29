# Recipe: Obsidian Daily Note

This recipe writes the WorkCue brief into an Obsidian daily note while preserving manual notes.

## Config

```yaml
version: 1
timezone: UTC
user:
  handles:
    - you
sources:
  obsidian:
    enabled: true
    vaultPath: /path/to/obsidian-vault
    include:
      - "**/*.md"
    exclude:
      - Archive/**
outputs:
  dailyNote:
    enabled: true
    path: /path/to/obsidian-vault/Daily/{{date}}.md
```

## Run

```bash
pnpm today --config .workcue/config.yml --date 2026-05-29
```

WorkCue updates only this managed block:

```markdown
<!-- workcue:start -->
...
<!-- workcue:end -->
```

Content outside the managed block is preserved.
