import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defaultConfigPath, loadConfig } from "@workcue/config";
import { runWorkCueToday, writeWorkCueOutputs, type RunWorkCueTodayOptions } from "@workcue/runtime";
import { z } from "zod";

export const TodayToolArgsSchema = z.object({
  assignee: z.string().optional().describe("Local assignee handle for markdown tasks. Defaults to you."),
  configPath: z.string().optional().describe("Path to a WorkCue config file. Defaults to ~/.workcue/config.yml."),
  date: z.string().optional().describe("Brief date in YYYY-MM-DD format. Defaults to today."),
  demo: z.boolean().optional().describe("Use built-in demo data without reading external services."),
  obsidianVault: z.string().optional().describe("Local Obsidian vault path to read unchecked markdown tasks from."),
  top: z.number().int().positive().optional().describe("Number of focus items to return."),
  writeOutputs: z
    .boolean()
    .optional()
    .describe("Write configured markdown or daily-note outputs after generating the brief. Defaults to false.")
});

export const DoctorToolArgsSchema = z.object({
  configPath: z.string().optional().describe("Path to a WorkCue config file. Defaults to ~/.workcue/config.yml.")
});

export type TodayToolArgs = z.infer<typeof TodayToolArgsSchema>;
export type DoctorToolArgs = z.infer<typeof DoctorToolArgsSchema>;

export function createWorkCueMcpServer(): McpServer {
  const server = new McpServer({
    name: "workcue-mcp",
    version: "0.0.0"
  });

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
  if (args.top) {
    runOptions.top = args.top;
  }
  if (!args.demo || args.configPath) {
    runOptions.configPath = args.configPath ?? defaultConfigPath();
  }

  const result = await runWorkCueToday(runOptions);
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

  lines.push(config.outputs.markdown.enabled ? "Markdown output: enabled" : "Markdown output: disabled");
  lines.push(config.outputs.dailyNote.enabled ? "Daily note output: enabled" : "Daily note output: disabled");

  return `${lines.join("\n")}\n`;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
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
