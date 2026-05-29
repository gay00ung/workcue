# Recipe: Notion Kanban

This recipe lets WorkCue read the Notion board where your work already lives and turn its cards into ranked WorkCue recommendations. WorkCue does not create a new board and does not read Notion page body content in this preview.

## What WorkCue Reads

WorkCue reads database/data source rows and normalizes these properties when present:

- title
- status
- due date
- priority
- assignee
- project
- labels
- estimate

Default property names are `Name`, `Status`, `Due`, `Priority`, `Owner`, `Project`, `Tags`, and `Estimate`. You can override them in config.

## Notion Setup

1. Create a Notion internal integration.
2. Copy the integration token into an environment variable.
3. Share the Notion database/page with the integration.
4. Copy the database or data source link.

Official references:

- [Create integrations with the Notion API](https://developers.notion.com/docs/create-a-notion-integration)
- [Query a data source](https://developers.notion.com/reference/query-a-data-source)

## One-Off Run

```bash
export NOTION_TOKEN="secret_..."
pnpm today \
  --notion-board "https://www.notion.so/workspace/Tasks-0123456789abcdef0123456789abcdef" \
  --date 2026-05-29
```

## Reusable Config

Create a local config file:

```bash
pnpm --filter workcue dev init \
  --output .workcue/config.yml \
  --notion-board "https://www.notion.so/workspace/Tasks-0123456789abcdef0123456789abcdef"
```

Then run:

```bash
pnpm doctor --config .workcue/config.yml
pnpm today --config .workcue/config.yml --date 2026-05-29
```

## Property Mapping

If your board uses different property names, edit `.workcue/config.yml`:

```yaml
sources:
  notion:
    enabled: true
    tokenEnv: NOTION_TOKEN
    boards:
      - url: https://www.notion.so/workspace/Tasks-0123456789abcdef0123456789abcdef
        titleProperty: Task
        statusProperty: Stage
        dueProperty: Deadline
        priorityProperty: Impact
        assigneeProperty: 담당자
        projectProperty: Project
        labelsProperty: Tags
        estimateProperty: Estimate
```

## Recommendation Behavior

- `Status` values like `In progress` or `Doing` become active work.
- `Review` or `QA` becomes review work.
- `Blocked` and `Waiting` reduce priority unless other signals are stronger.
- `Done` and `Cancelled` are synced but excluded from recommendations.
- `Due`, `Priority`, `Project`, and `Estimate` become ranking evidence.

## Privacy

- Token values must stay in environment variables.
- Do not commit `.workcue/config.yml` if it contains private Notion links.
- WorkCue does not read page body blocks in this preview.
