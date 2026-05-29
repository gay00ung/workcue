import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defaultConfigPath, loadConfig } from "@workcue/config";
import {
  explainWorkCueItem,
  renderRecommendationExplanation,
  runWorkCueToday,
  syncWorkCueSources,
  writeWorkCueOutputs,
  type RunWorkCueTodayOptions
} from "@workcue/runtime";
import { z } from "zod";

const SourceToolArgsSchema = z.object({
  assignee: z.string().optional().describe("Local assignee handle for markdown tasks. Defaults to you."),
  configPath: z.string().optional().describe("Path to a WorkCue config file. Defaults to ~/.workcue/config.yml."),
  date: z.string().optional().describe("Brief date in YYYY-MM-DD format. Defaults to today."),
  demo: z.boolean().optional().describe("Use built-in demo data without reading external services."),
  notionBoard: z.string().optional().describe("Notion kanban database or data source URL/ID to read cards from."),
  notionTokenEnv: z.string().optional().describe("Environment variable name that stores the Notion integration token."),
  obsidianVault: z.string().optional().describe("Local Obsidian vault path to read unchecked markdown tasks from."),
  top: z.number().int().positive().optional().describe("Number of focus items to return.")
});

export const TodayToolArgsSchema = SourceToolArgsSchema.extend({
  writeOutputs: z
    .boolean()
    .optional()
    .describe("Write configured markdown or daily-note outputs after generating the brief. Defaults to false.")
});

export const SyncToolArgsSchema = SourceToolArgsSchema.omit({ top: true });

export const ExplainToolArgsSchema = SourceToolArgsSchema.extend({
  itemId: z.string().describe("WorkCue item id, source id, or exact title to explain.")
});

export const DoctorToolArgsSchema = z.object({
  configPath: z.string().optional().describe("Path to a WorkCue config file. Defaults to ~/.workcue/config.yml.")
});

export type TodayToolArgs = z.infer<typeof TodayToolArgsSchema>;
export type SyncToolArgs = z.infer<typeof SyncToolArgsSchema>;
export type ExplainToolArgs = z.infer<typeof ExplainToolArgsSchema>;
export type DoctorToolArgs = z.infer<typeof DoctorToolArgsSchema>;

export function createWorkCueMcpServer(): McpServer {
  const server = new McpServer({
    name: "workcue-mcp",
    version: readPackageVersion()
  });

  server.tool(
    "workcue_sync",
    "Read WorkCue sources and return normalized work items without generating or writing a brief.",
    SyncToolArgsSchema.shape,
    async (args) => ({
      content: [
        {
          type: "text",
          text: await runSyncTool(args)
        }
      ]
    })
  );

  server.tool(
    "workcue_today",
    "Generate a local-first WorkCue morning brief from configured sources or demo data.",
    TodayToolArgsSchema.shape,
    async (args) => ({
      content: [
        {
          type: "text",
          text: await runTodayTool(args)
        }
      ]
    })
  );

  server.tool(
    "workcue_explain",
    "Explain the deterministic score and recommendation reasons for a synced work item.",
    ExplainToolArgsSchema.shape,
    async (args) => ({
      content: [
        {
          type: "text",
          text: await runExplainTool(args)
        }
      ]
    })
  );

  server.tool(
    "workcue_doctor",
    "Summarize WorkCue config readiness without fetching external work items.",
    DoctorToolArgsSchema.shape,
    async (args) => ({
      content: [
        {
          type: "text",
          text: await runDoctorTool(args)
        }
      ]
    })
  );

  return server;
}

export async function runTodayTool(args: TodayToolArgs): Promise<string> {
  const date = args.date ?? todayDate();
  const result = await runWorkCueToday(buildRunOptions(args, date));
  let outputsWritten = "no";

  if (args.writeOutputs) {
    const outputOptions: Parameters<typeof writeWorkCueOutputs>[0] = {
      date,
      markdown: result.markdown
    };
    if (result.config) {
      outputOptions.config = result.config;
    }
    outputsWritten = formatWrittenOutputs(await writeWorkCueOutputs(outputOptions));
  }

  return [
    result.markdown.trimEnd(),
    "",
    "## WorkCue MCP Metadata",
    "",
    `- Items read: ${result.items.length}`,
    `- Source counts: ${formatSourceCounts(result.sourceCounts)}`,
    `- Outputs written: ${outputsWritten}`
  ].join("\n");
}

export async function runSyncTool(args: SyncToolArgs): Promise<string> {
  const date = args.date ?? todayDate();
  const result = await syncWorkCueSources(buildRunOptions(args, date));
  return `${JSON.stringify(buildSyncPayload(result), null, 2)}\n`;
}

export async function runExplainTool(args: ExplainToolArgs): Promise<string> {
  const date = args.date ?? todayDate();
  const recommendation = await explainWorkCueItem({
    ...buildRunOptions(args, date),
    itemId: args.itemId
  });

  return renderRecommendationExplanation(recommendation);
}

export async function runDoctorTool(args: DoctorToolArgs): Promise<string> {
  const configPath = args.configPath ?? defaultConfigPath();
  const config = await loadConfig(configPath);
  const lines = ["# WorkCue Doctor", "", `Config: OK ${configPath}`, ""];

  lines.push(config.sources.obsidian.enabled ? "Obsidian: enabled" : "Obsidian: disabled");
  if (config.sources.obsidian.enabled) {
    lines.push(config.sources.obsidian.vaultPath ? `Obsidian vault: ${config.sources.obsidian.vaultPath}` : "Obsidian vault: missing");
  }

  lines.push(config.sources.github.enabled ? "GitHub: enabled" : "GitHub: disabled");
  if (config.sources.github.enabled) {
    lines.push(
      config.sources.github.owner && config.sources.github.repos.length > 0 && config.sources.github.user
        ? `GitHub repos: ${config.sources.github.owner}/${config.sources.github.repos.join(",")}`
        : "GitHub repos: missing owner, repos, or user"
    );
  }

  lines.push(config.sources.jira.enabled ? "Jira: enabled" : "Jira: disabled");
  if (config.sources.jira.enabled) {
    lines.push(config.sources.jira.baseUrl ? `Jira base URL: ${config.sources.jira.baseUrl}` : "Jira base URL: missing");
    lines.push(config.sources.jira.jql.length > 0 ? `Jira JQL queries: ${config.sources.jira.jql.length}` : "Jira JQL queries: missing");
  }

  lines.push(config.sources.notion?.enabled ? "Notion: enabled" : "Notion: disabled");
  if (config.sources.notion?.enabled) {
    lines.push(config.sources.notion.boards.length > 0 ? `Notion boards: ${config.sources.notion.boards.length}` : "Notion boards: missing");
    lines.push(`Notion token env: ${config.sources.notion.tokenEnv}`);
  }

  lines.push(config.outputs.markdown.enabled ? "Markdown output: enabled" : "Markdown output: disabled");
  lines.push(config.outputs.dailyNote.enabled ? "Daily note output: enabled" : "Daily note output: disabled");

  return `${lines.join("\n")}\n`;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version?: string };
  return packageJson.version ?? "unknown";
}

function buildRunOptions(
  args: {
    assignee?: string | undefined;
    configPath?: string | undefined;
    demo?: boolean | undefined;
    notionBoard?: string | undefined;
    notionTokenEnv?: string | undefined;
    obsidianVault?: string | undefined;
    top?: number | undefined;
  },
  date: string
): RunWorkCueTodayOptions {
  const runOptions: RunWorkCueTodayOptions = { date };
  if (args.assignee) {
    runOptions.assignee = args.assignee;
  }
  if (args.demo) {
    runOptions.demo = true;
  }
  if (args.obsidianVault) {
    runOptions.obsidianVault = args.obsidianVault;
  }
  if (args.notionBoard) {
    runOptions.notionBoard = args.notionBoard;
  }
  if (args.notionTokenEnv) {
    runOptions.notionTokenEnv = args.notionTokenEnv;
  }
  if (args.top) {
    runOptions.top = args.top;
  }
  if (!args.demo || args.configPath) {
    runOptions.configPath = args.configPath ?? defaultConfigPath();
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
  if (entries.length === 0) {
    return "none";
  }
  return entries.map(([source, count]) => `${source}=${count}`).join(", ");
}

function formatWrittenOutputs(outputs: { dailyNotePath?: string; markdownPath?: string }): string {
  const paths = [outputs.markdownPath, outputs.dailyNotePath].filter((value): value is string => Boolean(value));
  return paths.length > 0 ? paths.join(", ") : "none";
}
