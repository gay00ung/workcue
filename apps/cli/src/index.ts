#!/usr/bin/env node
import { Command } from "commander";
import { syncObsidianVault } from "@workcue/connector-obsidian";
import { buildDemoWorkItems, createBrief, renderBriefMarkdown } from "@workcue/core";

const program = new Command();

program
  .name("workcue")
  .description("Local-first morning brief for work scattered across existing tools.")
  .version("0.0.0");

program
  .command("today")
  .description("Generate today's WorkCue brief.")
  .option("--demo", "Use built-in demo data. No tokens or external services required.")
  .option("--obsidian-vault <path>", "Read unchecked markdown tasks from a local Obsidian vault.")
  .option("--assignee <handle>", "Assignee handle to attach to local tasks.", "you")
  .option("--date <date>", "Brief date in YYYY-MM-DD format.", todayDate())
  .option("--top <count>", "Number of focus items to show.", parseInteger, 3)
  .action(
    async (options: { demo?: boolean; obsidianVault?: string; assignee: string; date: string; top: number }) => {
      const items = options.demo
        ? buildDemoWorkItems(options.date)
        : options.obsidianVault
          ? await syncObsidianVault({
              vaultPath: options.obsidianVault,
              assignee: options.assignee
            })
          : undefined;

      if (!items) {
        console.error("No sources are configured yet. Run with --demo or --obsidian-vault <path>.");
        process.exitCode = 1;
        return;
      }

      if (items.length === 0) {
        console.error("No open work items found.");
        process.exitCode = 1;
        return;
      }

      const brief = createBrief(items, {
        date: options.date,
        topFocusItems: options.top,
        userHandles: [options.assignee],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      process.stdout.write(renderBriefMarkdown(brief));
    }
  );

program.parseAsync().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }
  return parsed;
}
