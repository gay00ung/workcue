#!/usr/bin/env node
import { Command } from "commander";
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
  .option("--date <date>", "Brief date in YYYY-MM-DD format.", todayDate())
  .option("--top <count>", "Number of focus items to show.", parseInteger, 3)
  .action((options: { demo?: boolean; date: string; top: number }) => {
    if (!options.demo) {
      console.error("No sources are configured yet. Run with --demo for the Phase 0 demo.");
      process.exitCode = 1;
      return;
    }

    const items = buildDemoWorkItems(options.date);
    const brief = createBrief(items, {
      date: options.date,
      topFocusItems: options.top,
      userHandles: ["you"],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    process.stdout.write(renderBriefMarkdown(brief));
  });

program.parse();

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
