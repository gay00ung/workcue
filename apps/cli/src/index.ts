#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { writeWorkItemsToCache } from "@workcue/cache-sqlite";
import {
  createInitialConfig,
  defaultConfigPath,
  loadConfig,
  writeConfig,
  type InitConfigOptions
} from "@workcue/config";
import {
  explainWorkCueItem,
  renderRecommendationExplanation,
  runWorkCueToday,
  syncWorkCueSources,
  writeWorkCueOutputs,
  type RunWorkCueTodayOptions
} from "@workcue/runtime";

const program = new Command();

program
  .name("workcue")
  .description("Local-first morning brief for work scattered across existing tools.")
  .version(readPackageVersion());

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
    lines.push(config.cache.sqlite.enabled ? `SQLite cache: enabled ${config.cache.sqlite.path}` : "SQLite cache: disabled");
    lines.push(config.llm.enabled ? `LLM summary: enabled ${config.llm.provider}` : "LLM summary: disabled");

    process.stdout.write(`${lines.join("\n")}\n`);
  });

program
  .command("sync")
  .description("Read configured sources and print normalized work items without writing a morning brief.")
  .option("--config <path>", "Config path to read.")
  .option("--demo", "Use built-in demo data. No tokens or external services required.")
  .option("--obsidian-vault <path>", "Read unchecked markdown tasks from a local Obsidian vault.")
  .option("--assignee <handle>", "Assignee handle to attach to local tasks.", "you")
  .option("--date <date>", "Sync date in YYYY-MM-DD format.", todayDate())
  .option("--json", "Print a JSON payload.")
  .option("--output <path>", "Write a JSON sync payload to a file.")
  .option("--cache <path>", "Write synced work items to a SQLite cache.")
  .action(
    async (options: {
      assignee: string;
      cache?: string;
      config?: string;
      date: string;
      demo?: boolean;
      json?: boolean;
      obsidianVault?: string;
      output?: string;
    }) => {
      const result = await syncWorkCueSources(buildRunOptions(options));
      const payload = buildSyncPayload(result);
      const cachePath = options.cache ?? (result.config?.cache.sqlite.enabled ? result.config.cache.sqlite.path : undefined);

      if (options.output) {
        await writeJsonFile(options.output, payload);
      }

      if (cachePath) {
        const cacheResult = await writeWorkItemsToCache({
          dbPath: cachePath,
          items: result.items,
          sourceCounts: result.sourceCounts,
          syncedAt: result.syncedAt
        });
        payload.cache = {
          dbPath: cacheResult.dbPath,
          itemCount: cacheResult.itemCount,
          syncedAt: cacheResult.syncedAt
        };
      }

      process.stdout.write(options.json ? `${JSON.stringify(payload, null, 2)}\n` : renderSyncText(payload));
    }
  );

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
      const result = await runWorkCueToday(buildRunOptions(options));
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

program
  .command("explain")
  .description("Explain why a synced work item is ranked the way it is.")
  .argument("<item-id>", "WorkCue item id, source id, or exact title.")
  .option("--config <path>", "Config path to read.")
  .option("--demo", "Use built-in demo data. No tokens or external services required.")
  .option("--obsidian-vault <path>", "Read unchecked markdown tasks from a local Obsidian vault.")
  .option("--assignee <handle>", "Assignee handle to attach to local tasks.", "you")
  .option("--date <date>", "Brief date in YYYY-MM-DD format.", todayDate())
  .option("--json", "Print a JSON explanation payload.")
  .action(
    async (
      itemId: string,
      options: {
        assignee: string;
        config?: string;
        date: string;
        demo?: boolean;
        json?: boolean;
        obsidianVault?: string;
      }
    ) => {
      const recommendation = await explainWorkCueItem({
        ...buildRunOptions(options),
        itemId
      });

      process.stdout.write(
        options.json
          ? `${JSON.stringify(serializeRecommendation(recommendation), null, 2)}\n`
          : renderRecommendationExplanation(recommendation)
      );
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

function buildRunOptions(options: {
  assignee: string;
  config?: string;
  date: string;
  demo?: boolean;
  obsidianVault?: string;
  top?: number;
}): RunWorkCueTodayOptions {
  const runOptions: RunWorkCueTodayOptions = {
    assignee: options.assignee,
    date: options.date
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
  if (options.top) {
    runOptions.top = options.top;
  }
  return runOptions;
}

function buildSyncPayload(result: Awaited<ReturnType<typeof syncWorkCueSources>>): Record<string, unknown> {
  return {
    syncedAt: result.syncedAt,
    itemCount: result.items.length,
    sourceCounts: result.sourceCounts,
    items: result.items.map(serializeWorkItem)
  };
}

function renderSyncText(payload: Record<string, unknown>): string {
  const items = payload.items as Array<Record<string, unknown>>;
  const lines = [
    "WorkCue Sync",
    "",
    `Synced at: ${payload.syncedAt}`,
    `Items: ${payload.itemCount}`,
    `Sources: ${formatSourceCounts(payload.sourceCounts as Record<string, number>)}`,
    ""
  ];
  if (payload.cache && typeof payload.cache === "object") {
    const cache = payload.cache as Record<string, unknown>;
    lines.push(`Cache: ${cache.dbPath}`, "");
  }

  for (const item of items) {
    lines.push(`- ${item.id} [${item.source}/${item.status}] ${item.title}`);
  }

  return `${lines.join("\n").trim()}\n`;
}

function serializeRecommendation(
  recommendation: Awaited<ReturnType<typeof explainWorkCueItem>>
): Record<string, unknown> {
  return {
    id: recommendation.id,
    date: recommendation.date,
    rank: recommendation.rank,
    score: recommendation.score,
    confidence: recommendation.confidence,
    mode: recommendation.mode,
    item: serializeWorkItem(recommendation.workItem),
    reasons: recommendation.reasons.map((reason) => ({
      kind: reason.kind,
      weight: reason.weight,
      confidence: reason.confidence,
      message: reason.message,
      evidence: reason.evidence ?? {}
    })),
    suggestedAction: recommendation.suggestedAction
  };
}

function serializeWorkItem(item: Awaited<ReturnType<typeof syncWorkCueSources>>["items"][number]): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: item.id,
    source: item.source,
    sourceId: item.sourceId,
    title: item.title,
    status: item.status,
    assignees: item.assignees,
    labels: item.labels
  };

  if (item.sourceUrl) {
    payload.sourceUrl = item.sourceUrl;
  }
  if (item.requestedReviewers) {
    payload.requestedReviewers = item.requestedReviewers;
  }
  if (item.dueAt) {
    payload.dueAt = item.dueAt;
  }
  if (item.priority) {
    payload.priority = item.priority;
  }
  if (item.project) {
    payload.project = item.project;
  }
  if (item.milestone) {
    payload.milestone = item.milestone;
  }
  if (item.sprint) {
    payload.sprint = item.sprint;
  }
  if (item.estimateMinutes) {
    payload.estimateMinutes = item.estimateMinutes;
  }

  return payload;
}

function formatSourceCounts(sourceCounts: Record<string, number>): string {
  const entries = Object.entries(sourceCounts).sort(([left], [right]) => left.localeCompare(right));
  return entries.length > 0 ? entries.map(([source, count]) => `${source}=${count}`).join(", ") : "none";
}

async function writeJsonFile(outputPath: string, payload: unknown): Promise<void> {
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version?: string };
  return packageJson.version ?? "unknown";
}
