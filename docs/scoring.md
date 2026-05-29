# WorkCue Scoring

WorkCue ranks work items with deterministic signals before any optional LLM summary.

## Core Signals

Examples:

- `due_soon`
- `overdue`
- `assigned_to_me`
- `review_requested`
- `current_sprint`
- `high_priority`
- `stale`
- `blocking_others`
- `blocked`
- `waiting_external`
- `quick_win`
- `deep_work`

Each signal has a default weight in `@workcue/core`. The final item score is the sum of the signal weights.

## User Multipliers

Use `scoring.signalWeights` to multiply a signal weight without changing the default model:

```yaml
scoring:
  signalWeights:
    review_requested: 1.3
    due_soon: 1.2
    waiting_external: 0.7
```

Multipliers are non-negative numbers.

## Explanation

`workcue explain <item-id>` shows the rank, score, signal reasons, and suggested action.

```bash
pnpm --filter workcue start explain github:pr-184 --demo --date 2026-05-29
```

When a multiplier changes a signal, the signal evidence includes the default weight and multiplier.
