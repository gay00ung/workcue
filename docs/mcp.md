# WorkCue MCP Server

The WorkCue MCP server exposes the same local-first runtime used by the CLI.

## Tools

| Tool | Purpose | Writes files by default |
| --- | --- | --- |
| `workcue_sync` | Read sources and return normalized item summaries | No |
| `workcue_today` | Generate a morning brief | No |
| `workcue_explain` | Explain one item score and reasons | No |
| `workcue_doctor` | Check config readiness | No |

`workcue_today` writes configured markdown or daily-note outputs only when `writeOutputs` is true.

## Local Client Config

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

## Example Tool Calls

Demo brief:

```json
{
  "demo": true,
  "date": "2026-05-29",
  "top": 3
}
```

Configured sources:

```json
{
  "configPath": "/path/to/workcue/.workcue/config.yml",
  "date": "2026-05-29"
}
```

Explain one item:

```json
{
  "demo": true,
  "date": "2026-05-29",
  "itemId": "github:pr-184"
}
```

## Data Exposure

`workcue_sync` returns normalized item summaries and excludes connector `raw` payloads. Avoid sending generated briefs or sync JSON to shared channels if your source tools contain sensitive work.
