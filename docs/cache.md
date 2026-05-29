# WorkCue Local Cache

WorkCue can write normalized sync results to a local SQLite database.

```bash
pnpm --filter workcue start sync \
  --config .workcue/config.yml \
  --cache .workcue/workcue.sqlite
```

`workcue init` enables this cache in local config by default:

```yaml
cache:
  sqlite:
    enabled: true
    path: .workcue/workcue.sqlite
```

## What Is Stored

The cache stores normalized `WorkItem` records and sync metadata:

- item id
- source and source id
- status and title
- normalized payload
- sync timestamp

Connector raw payloads are not exposed through `workcue sync --json`, but the local SQLite cache stores the normalized payload needed for future offline and diff workflows.

## Current Limitations

- Cache writes happen during `workcue sync`, not every `workcue today`.
- The cache is a snapshot replacement, not an append-only history.
- Node.js 24 currently emits an `ExperimentalWarning` for built-in `node:sqlite`.
- Partial-source fallback is not implemented yet.

## Safety

`.workcue/` is ignored by Git. Keep cache files local unless you are sure generated work metadata is safe to share.
