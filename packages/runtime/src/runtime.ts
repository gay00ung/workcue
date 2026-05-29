import { expandDateTemplate, loadConfig, type WorkCueConfig } from "@workcue/config";
import { syncGitHub } from "@workcue/connector-github";
import { syncJira, type SyncJiraOptions } from "@workcue/connector-jira";
import { syncObsidianVault, type SyncObsidianVaultOptions } from "@workcue/connector-obsidian";
import { buildDemoWorkItems, createBrief, renderBriefMarkdown, type Brief, type WorkItem } from "@workcue/core";
import { upsertDailyNoteSection, writeMarkdownFile } from "@workcue/output-markdown";

export type WorkCueRuntimeErrorCode = "NO_SOURCES_CONFIGURED" | "NO_ITEMS_FOUND";
export type WorkCueSourceCounts = Record<string, number>;

export class WorkCueRuntimeError extends Error {
  constructor(
    readonly code: WorkCueRuntimeErrorCode,
    message: string
  ) {
    super(message);
    this.name = "WorkCueRuntimeError";
  }
}

export interface RunWorkCueTodayOptions {
  date: string;
  assignee?: string;
  config?: WorkCueConfig;
  configPath?: string;
  demo?: boolean;
  env?: NodeJS.ProcessEnv;
  obsidianVault?: string;
  timezone?: string;
  top?: number;
}

export interface WorkCueTodayResult {
  brief: Brief;
  config?: WorkCueConfig;
  items: WorkItem[];
  markdown: string;
  sourceCounts: WorkCueSourceCounts;
  userHandles: string[];
}

export interface WriteWorkCueOutputsOptions {
  config?: WorkCueConfig;
  dailyNotePath?: string;
  date: string;
  markdown: string;
  outputPath?: string;
}

export interface WorkCueWrittenOutputs {
  dailyNotePath?: string;
  markdownPath?: string;
}

export async function runWorkCueToday(options: RunWorkCueTodayOptions): Promise<WorkCueTodayResult> {
  const config = options.config ?? (options.configPath ? await loadConfig(options.configPath) : undefined);
  const obsidianVault = options.obsidianVault ?? config?.sources.obsidian.vaultPath;
  const userHandles = buildUserHandles(options.assignee ?? "you", config);
  const items: WorkItem[] = [];

  if (options.demo) {
    items.push(...buildDemoWorkItems(options.date));
  }

  if (!options.demo && shouldUseObsidian(options, config, obsidianVault)) {
    items.push(...(await syncObsidianVault(buildObsidianSyncOptions(obsidianVault, config, userHandles))));
  }

  if (!options.demo && shouldUseGitHub(config)) {
    items.push(...(await syncGitHub(buildGitHubSyncOptions(config, options.env ?? process.env))));
  }

  if (!options.demo && shouldUseJira(config)) {
    items.push(...(await syncJira(buildJiraSyncOptions(config, options.env ?? process.env))));
  }

  if (items.length === 0 && !options.demo && !config) {
    throw new WorkCueRuntimeError(
      "NO_SOURCES_CONFIGURED",
      "No sources are configured yet. Run with demo mode or provide a config/source path."
    );
  }

  if (items.length === 0) {
    throw new WorkCueRuntimeError("NO_ITEMS_FOUND", "No open work items found.");
  }

  const briefOptions: Parameters<typeof createBrief>[1] = {
    date: options.date,
    timezone: options.timezone ?? config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    userHandles
  };
  const topFocusItems = options.top ?? config?.brief.topFocusItems;
  if (topFocusItems) {
    briefOptions.topFocusItems = topFocusItems;
  }

  const brief = createBrief(items, briefOptions);

  const result: WorkCueTodayResult = {
    brief,
    items,
    markdown: renderBriefMarkdown(brief),
    sourceCounts: countSources(items),
    userHandles
  };
  if (config) {
    result.config = config;
  }
  return result;
}

export async function writeWorkCueOutputs(options: WriteWorkCueOutputsOptions): Promise<WorkCueWrittenOutputs> {
  const written: WorkCueWrittenOutputs = {};
  const markdownPath = options.outputPath ?? expandDateTemplate(options.config?.outputs.markdown.path, options.date);
  const dailyNotePath =
    options.dailyNotePath ?? expandDateTemplate(options.config?.outputs.dailyNote.path, options.date);

  if (markdownPath && (options.outputPath || options.config?.outputs.markdown.enabled)) {
    await writeMarkdownFile({ outputPath: markdownPath, content: options.markdown });
    written.markdownPath = markdownPath;
  }

  if (dailyNotePath && (options.dailyNotePath || options.config?.outputs.dailyNote.enabled)) {
    await upsertDailyNoteSection({ notePath: dailyNotePath, content: options.markdown });
    written.dailyNotePath = dailyNotePath;
  }

  return written;
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

function buildGitHubSyncOptions(config: WorkCueConfig, env: NodeJS.ProcessEnv): Parameters<typeof syncGitHub>[0] {
  const token = env[config.sources.github.tokenEnv];
  const syncOptions: Parameters<typeof syncGitHub>[0] = {
    owner: config.sources.github.owner ?? "",
    repos: config.sources.github.repos,
    user: config.sources.github.user ?? "you"
  };
  if (token) {
    syncOptions.token = token;
  }
  return syncOptions;
}

function shouldUseJira(config: WorkCueConfig | undefined): config is WorkCueConfig {
  return Boolean(config?.sources.jira.enabled && config.sources.jira.baseUrl && config.sources.jira.jql.length > 0);
}

function buildJiraSyncOptions(config: WorkCueConfig, env: NodeJS.ProcessEnv): SyncJiraOptions {
  const email = env[config.sources.jira.emailEnv];
  const apiToken = env[config.sources.jira.tokenEnv];
  const options: SyncJiraOptions = {
    baseUrl: config.sources.jira.baseUrl ?? "",
    jql: config.sources.jira.jql
  };
  const fieldMap: NonNullable<SyncJiraOptions["fieldMap"]> = {};
  if (config.sources.jira.fieldMap.sprint) {
    fieldMap.sprint = config.sources.jira.fieldMap.sprint;
  }
  if (config.sources.jira.fieldMap.storyPoints) {
    fieldMap.storyPoints = config.sources.jira.fieldMap.storyPoints;
  }
  if (Object.keys(fieldMap).length > 0) {
    options.fieldMap = fieldMap;
  }
  if (email) {
    options.email = email;
  }
  if (apiToken) {
    options.apiToken = apiToken;
  }
  return options;
}

function countSources(items: WorkItem[]): WorkCueSourceCounts {
  return items.reduce<WorkCueSourceCounts>((counts, item) => {
    counts[item.source] = (counts[item.source] ?? 0) + 1;
    return counts;
  }, {});
}
