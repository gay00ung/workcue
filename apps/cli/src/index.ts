#!/usr/bin/env node
import { Command } from "commander";
import {
  createInitialConfig,
  defaultConfigPath,
  expandDateTemplate,
  loadConfig,
  writeConfig,
  type InitConfigOptions,
  type WorkCueConfig
} from "@workcue/config";
import { syncGitHub } from "@workcue/connector-github";
import { syncObsidianVault, type SyncObsidianVaultOptions } from "@workcue/connector-obsidian";
import { buildDemoWorkItems, createBrief, renderBriefMarkdown, type WorkItem } from "@workcue/core";
import { upsertDailyNoteSection, writeMarkdownFile } from "@workcue/output-markdown";

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
      const config = options.config ? await loadConfig(options.config) : undefined;
      const obsidianVault = options.obsidianVault ?? config?.sources.obsidian.vaultPath;
      const outputPath = options.output ?? expandDateTemplate(config?.outputs.markdown.path, options.date);
      const dailyNotePath = options.dailyNote ?? expandDateTemplate(config?.outputs.dailyNote.path, options.date);
      const userHandles = buildUserHandles(options.assignee, config);
      const items: WorkItem[] = [];

      if (options.demo) {
        items.push(...buildDemoWorkItems(options.date));
      }

      if (!options.demo && shouldUseObsidian(options, config, obsidianVault)) {
        items.push(...(await syncObsidianVault(buildObsidianSyncOptions(obsidianVault, config, userHandles))));
      }

      if (!options.demo && shouldUseGitHub(config)) {
        items.push(...(await syncGitHub(buildGitHubSyncOptions(config))));
      }

      if (items.length === 0 && !options.demo && !config) {
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
        userHandles,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      const markdown = renderBriefMarkdown(brief);

      if (outputPath && (options.output || config?.outputs.markdown.enabled)) {
        await writeMarkdownFile({ outputPath, content: markdown });
      }

      if (dailyNotePath && (options.dailyNote || config?.outputs.dailyNote.enabled)) {
        await upsertDailyNoteSection({ notePath: dailyNotePath, content: markdown });
      }

      process.stdout.write(markdown);
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

function shouldUseObsidian(
  options: { obsidianVault?: string },
  config: WorkCueConfig | undefined,
  obsidianVault: string | undefined
): obsidianVault is string {
  return Boolean(options.obsidianVault || (config?.sources.obsidian.enabled && obsidianVault));
}

function buildUserHandles(cliAssignee: string, config: WorkCueConfig | undefined): string[] {
  const handles = config?.user.handles.length ? config.user.handles : [cliAssignee];
  return handles.includes(cliAssignee) ? handles : [cliAssignee, ...handles];
}

function buildObsidianSyncOptions(
  vaultPath: string,
  config: WorkCueConfig | undefined,
  userHandles: string[]
): SyncObsidianVaultOptions {
  const options: SyncObsidianVaultOptions = { vaultPath };
  if (config?.sources.obsidian.include) {
    options.include = config.sources.obsidian.include;
  }
  if (config?.sources.obsidian.exclude) {
    options.exclude = config.sources.obsidian.exclude;
  }
  if (userHandles[0]) {
    options.assignee = userHandles[0];
  }
  return options;
}

function shouldUseGitHub(config: WorkCueConfig | undefined): config is WorkCueConfig {
  return Boolean(
    config?.sources.github.enabled &&
      config.sources.github.owner &&
      config.sources.github.repos.length > 0 &&
      config.sources.github.user
  );
}

function buildGitHubSyncOptions(config: WorkCueConfig): Parameters<typeof syncGitHub>[0] {
  const token = process.env[config.sources.github.tokenEnv];
  const options: Parameters<typeof syncGitHub>[0] = {
    owner: config.sources.github.owner ?? "",
    repos: config.sources.github.repos,
    user: config.sources.github.user ?? "you"
  };
  if (token) {
    options.token = token;
  }
  return options;
}
