import { expandDateTemplate, loadConfig, type WorkCueConfig } from "@workcue/config";
import { syncGitHub } from "@workcue/connector-github";
import { syncJira, type SyncJiraOptions } from "@workcue/connector-jira";
import { syncObsidianVault, type SyncObsidianVaultOptions } from "@workcue/connector-obsidian";
import {
  buildDemoWorkItems,
  createBrief,
  rankWorkItems,
  renderBriefMarkdown,
  type Brief,
  type Recommendation,
  type WorkItem
} from "@workcue/core";
import { upsertDailyNoteSection, writeMarkdownFile } from "@workcue/output-markdown";

export type WorkCueRuntimeErrorCode = "ITEM_NOT_FOUND" | "NO_ITEMS_FOUND" | "NO_SOURCES_CONFIGURED";
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

export type SyncWorkCueSourcesOptions = Omit<RunWorkCueTodayOptions, "timezone" | "top">;
export type ExplainWorkCueItemOptions = RunWorkCueTodayOptions & {
  itemId: string;
};

export interface WorkCueSyncResult {
  config?: WorkCueConfig;
  items: WorkItem[];
  sourceCounts: WorkCueSourceCounts;
  syncedAt: string;
  userHandles: string[];
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
  const syncResult = await syncWorkCueSources(options);
  const briefOptions = buildBriefOptions(options, syncResult.config, syncResult.userHandles);
  const brief = createBrief(syncResult.items, briefOptions);

  const result: WorkCueTodayResult = {
    brief,
    items: syncResult.items,
    markdown: renderBriefMarkdown(brief),
    sourceCounts: syncResult.sourceCounts,
    userHandles: syncResult.userHandles
  };
  if (syncResult.config) {
    result.config = syncResult.config;
  }
  return result;
}

export async function syncWorkCueSources(options: SyncWorkCueSourcesOptions): Promise<WorkCueSyncResult> {
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

  const result: WorkCueSyncResult = {
    items,
    sourceCounts: countSources(items),
    syncedAt: new Date().toISOString(),
    userHandles
  };
  if (config) {
    result.config = config;
  }
  return result;
}

export async function explainWorkCueItem(options: ExplainWorkCueItemOptions): Promise<Recommendation> {
  const syncResult = await syncWorkCueSources(options);
  const scoreOptions: Parameters<typeof rankWorkItems>[1] = {
    date: options.date,
    userHandles: syncResult.userHandles
  };
  const explanationWeights = syncResult.config?.scoring.signalWeights;
  if (explanationWeights && Object.keys(explanationWeights).length > 0) {
    scoreOptions.signalWeights = explanationWeights as NonNullable<Parameters<typeof rankWorkItems>[1]["signalWeights"]>;
  }
  const recommendations = rankWorkItems(syncResult.items, scoreOptions);
  const recommendation = recommendations.find(
    (candidate) =>
      candidate.workItem.id === options.itemId ||
      candidate.workItem.sourceId === options.itemId ||
      candidate.workItem.title === options.itemId
  );

  if (!recommendation) {
    throw new WorkCueRuntimeError("ITEM_NOT_FOUND", `Work item not found: ${options.itemId}`);
  }

  return recommendation;
}

export function renderRecommendationExplanation(recommendation: Recommendation): string {
  const source = recommendation.workItem.sourceUrl
    ? `${recommendation.workItem.source}: ${recommendation.workItem.sourceUrl}`
    : `${recommendation.workItem.source}: ${recommendation.workItem.sourceId}`;
  const lines = [
    `# WorkCue Explain - ${recommendation.workItem.title}`,
    "",
    `- Item ID: ${recommendation.workItem.id}`,
    `- Rank: ${recommendation.rank}`,
    `- Score: ${recommendation.score}`,
    `- Confidence: ${recommendation.confidence}`,
    `- Status: ${recommendation.workItem.status}`,
    `- Source: ${source}`,
    "",
    "## Why now",
    "",
    ...recommendation.reasons.map((reason) => `- ${reason.message} (${reason.weight > 0 ? "+" : ""}${reason.weight})`),
    "",
    "## Suggested action",
    "",
    recommendation.suggestedAction
  ];

  return `${lines.join("\n").trim()}\n`;
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

function buildBriefOptions(
  options: RunWorkCueTodayOptions,
  config: WorkCueConfig | undefined,
  userHandles: string[]
): Parameters<typeof createBrief>[1] {
  const briefOptions: Parameters<typeof createBrief>[1] = {
    date: options.date,
    timezone: options.timezone ?? config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    userHandles
  };
  const signalWeights = config?.scoring.signalWeights;
  if (signalWeights && Object.keys(signalWeights).length > 0) {
    briefOptions.signalWeights = signalWeights as NonNullable<Parameters<typeof createBrief>[1]["signalWeights"]>;
  }
  const topFocusItems = options.top ?? config?.brief.topFocusItems;
  if (topFocusItems) {
    briefOptions.topFocusItems = topFocusItems;
  }
  return briefOptions;
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
