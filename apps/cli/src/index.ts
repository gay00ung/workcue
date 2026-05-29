#!/usr/bin/env node
import { Command } from "commander";
import {
  createInitialConfig,
  defaultConfigPath,
  loadConfig,
  writeConfig,
  type InitConfigOptions
} from "@workcue/config";
import { runWorkCueToday, writeWorkCueOutputs, type RunWorkCueTodayOptions } from "@workcue/runtime";

const program = new Command();

program
  .name("workcue")
  .description("Local-first morning brief for work scattered across existing tools.")
  .version("0.0.0");

program
  .command("init")
  .description("Create a local WorkCue config file.")
  .option("--output <path>", "Config path to write.", defaultConfigPath())
  .option("--obsidian-vault <path>", "Local Obsidian vault path to enable.")
  .option("--markdown-output <path>", "Markdown output path. Supports {{date}}.")
  .option("--daily-note <path>", "Daily note output path. Supports {{date}}.")
  .action(async (options: { output: string; obsidianVault?: string; markdownOutput?: string; dailyNote?: string }) => {
    const initOptions: InitConfigOptions = {};
    if (options.obsidianVault) {
      initOptions.obsidianVault = options.obsidianVault;
    }
    if (options.markdownOutput) {
      initOptions.markdownOutput = options.markdownOutput;
    }
    if (options.dailyNote) {
      initOptions.dailyNote = options.dailyNote;
    }
    const config = createInitialConfig(initOptions);

    await writeConfig(options.output, config);
    process.stdout.write(`Wrote WorkCue config to ${options.output}\n`);
  });

program
  .command("doctor")
  .description("Check local WorkCue config and source readiness.")
  .option("--config <path>", "Config path to read.", defaultConfigPath())
  .action(async (options: { config: string }) => {
    const config = await loadConfig(options.config);
    const lines = ["WorkCue Doctor", "", `Config: OK ${options.config}`];

    if (config.sources.obsidian.enabled) {
      lines.push(
        config.sources.obsidian.vaultPath
          ? `Obsidian: configured ${config.sources.obsidian.vaultPath}`
          : "Obsidian: enabled but missing vaultPath"
      );
    } else {
      lines.push("Obsidian: disabled");
    }

    if (config.sources.github.enabled) {
      lines.push(
        config.sources.github.owner && config.sources.github.repos.length > 0 && config.sources.github.user
          ? `GitHub: configured ${config.sources.github.owner}/${config.sources.github.repos.join(",")}`
          : "GitHub: enabled but missing owner, repos, or user"
      );
    } else {
      lines.push("GitHub: disabled");
    }

    if (config.sources.jira.enabled) {
      lines.push(
        config.sources.jira.baseUrl && config.sources.jira.jql.length > 0
          ? `Jira: configured ${config.sources.jira.baseUrl}`
          : "Jira: enabled but missing baseUrl or JQL"
      );
    } else {
      lines.push("Jira: disabled");
    }

    lines.push(config.outputs.markdown.enabled ? "Markdown output: enabled" : "Markdown output: disabled");
    lines.push(config.outputs.dailyNote.enabled ? "Daily note output: enabled" : "Daily note output: disabled");

    process.stdout.write(`${lines.join("\n")}\n`);
  });

program
  .command("today")
  .description("Generate today's WorkCue brief.")
  .option("--config <path>", "Config path to read.")
  .option("--demo", "Use built-in demo data. No tokens or external services required.")
  .option("--obsidian-vault <path>", "Read unchecked markdown tasks from a local Obsidian vault.")
  .option("--output <path>", "Write the generated brief to a markdown file.")
  .option("--daily-note <path>", "Upsert the generated brief into a markdown daily note.")
  .option("--assignee <handle>", "Assignee handle to attach to local tasks.", "you")
  .option("--date <date>", "Brief date in YYYY-MM-DD format.", todayDate())
  .option("--top <count>", "Number of focus items to show.", parseInteger, 3)
  .action(
    async (options: {
      config?: string;
      demo?: boolean;
      obsidianVault?: string;
      output?: string;
      dailyNote?: string;
      assignee: string;
      date: string;
      top: number;
    }) => {
      const runOptions: RunWorkCueTodayOptions = {
        assignee: options.assignee,
        date: options.date,
        top: options.top
      };
      if (options.demo) {
        runOptions.demo = true;
      }
      if (options.config) {
        runOptions.configPath = options.config;
      }
      if (options.obsidianVault) {
        runOptions.obsidianVault = options.obsidianVault;
      }

      const result = await runWorkCueToday(runOptions);
      const outputOptions: Parameters<typeof writeWorkCueOutputs>[0] = {
        date: options.date,
        markdown: result.markdown
      };
      if (result.config) {
        outputOptions.config = result.config;
      }
      if (options.output) {
        outputOptions.outputPath = options.output;
      }
      if (options.dailyNote) {
        outputOptions.dailyNotePath = options.dailyNote;
      }
      await writeWorkCueOutputs(outputOptions);

      process.stdout.write(result.markdown);
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
