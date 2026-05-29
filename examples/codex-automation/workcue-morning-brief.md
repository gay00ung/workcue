# WorkCue Morning Brief Automation Prompt

Run WorkCue against the configured local sources and produce today's brief.

Requirements:

- Use the configured WorkCue repo and `.workcue/config.yml`.
- Run `pnpm today --config .workcue/config.yml`.
- If the command fails, report the failing command and the likely source.
- Do not print credential values or environment variable values.
- If the config writes to an Obsidian daily note, report the note path only when it is safe to show.
- If no work items are found, report that no open work items were detected.

Expected output:

- A short status line.
- The WorkCue markdown brief, or the error summary.
- The validation command used.
