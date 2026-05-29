import type { WorkItem, WorkItemPriority, WorkItemStatus } from "@workcue/core";
import type {
  NotionBoardConfig,
  NotionDatabaseResponse,
  NotionDataSourceResponse,
  NotionFetch,
  NotionPage,
  NotionProperty,
  NotionQueryResponse,
  NotionResolvedBoard,
  SyncNotionKanbanOptions
} from "./types.js";

const NOTION_API_BASE = "https://api.notion.com/v1";
const DEFAULT_NOTION_VERSION = "2026-03-11";
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 1000;

const PROPERTY_CANDIDATES = {
  title: ["Name", "Task", "Title", "Todo", "To-do", "이름", "작업", "할 일"],
  status: ["Status", "Stage", "Kanban", "상태", "단계", "칸반"],
  due: ["Due", "Due Date", "Date", "Deadline", "마감", "마감일", "기한"],
  priority: ["Priority", "Severity", "중요도", "우선순위"],
  assignee: ["Assignee", "Owner", "People", "Person", "담당자", "소유자"],
  project: ["Project", "Epic", "프로젝트"],
  labels: ["Tags", "Labels", "Tag", "Label", "태그", "라벨"],
  estimate: ["Estimate", "Est", "Estimate Minutes", "예상", "소요시간"]
} as const;

const STATUS_MAPPINGS: Array<{ status: WorkItemStatus; patterns: RegExp[] }> = [
  { status: "done", patterns: [/^done$/i, /^complete/i, /^shipped$/i, /^closed$/i, /완료/, /끝/] },
  { status: "cancelled", patterns: [/cancel/i, /취소/] },
  { status: "blocked", patterns: [/block/i, /막힘/, /차단/] },
  { status: "waiting", patterns: [/wait/i, /pending/i, /대기/, /보류/] },
  { status: "in_review", patterns: [/review/i, /^qa$/i, /검토/, /리뷰/] },
  { status: "in_progress", patterns: [/doing/i, /progress/i, /working/i, /active/i, /진행/, /작업 ?중/] },
  { status: "todo", patterns: [/todo/i, /to do/i, /backlog/i, /next/i, /not started/i, /예정/, /할 일/] }
];

export async function syncNotionKanban(options: SyncNotionKanbanOptions): Promise<WorkItem[]> {
  if (!options.token) {
    throw new Error("Notion token is required. Set the configured tokenEnv before syncing Notion.");
  }
  if (options.boards.length === 0) {
    return [];
  }

  const fetcher = options.fetcher ?? fetch;
  const notionVersion = options.notionVersion ?? DEFAULT_NOTION_VERSION;
  const workItems: WorkItem[] = [];

  for (const board of options.boards) {
    const resolved = await resolveBoard({ board, fetcher, notionVersion, token: options.token });
    const dataSource = await retrieveDataSource({
      dataSourceId: resolved.dataSourceId,
      fetcher,
      notionVersion,
      token: options.token
    });
    const pages = await queryDataSourcePages({
      dataSourceId: resolved.dataSourceId,
      fetcher,
      maxPages: options.maxPages ?? DEFAULT_MAX_PAGES,
      notionVersion,
      pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
      token: options.token
    });

    workItems.push(...pages.map((page) => normalizeNotionPage(page, board, dataSource, resolved)));
  }

  return workItems;
}

export function extractNotionId(value: string): string | undefined {
  const withoutDashes = value.match(/[0-9a-fA-F]{32}/)?.[0];
  if (withoutDashes) {
    return withoutDashes.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5").toLowerCase();
  }

  return value.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0]?.toLowerCase();
}

async function resolveBoard(options: {
  board: NotionBoardConfig;
  fetcher: NotionFetch;
  notionVersion: string;
  token: string;
}): Promise<NotionResolvedBoard> {
  const dataSourceId = options.board.dataSourceId ?? undefined;
  if (dataSourceId) {
    return { board: options.board, dataSourceId };
  }

  const explicitDatabaseId = options.board.databaseId ?? undefined;
  if (explicitDatabaseId) {
    return await resolveDatabaseBoard(options, explicitDatabaseId);
  }

  const inferredId = options.board.id ?? (options.board.url ? extractNotionId(options.board.url) : undefined);
  if (!inferredId) {
    throw new Error("Notion board requires id, url, databaseId, or dataSourceId.");
  }

  try {
    return await resolveDatabaseBoard(options, inferredId);
  } catch {
    return { board: options.board, dataSourceId: inferredId };
  }
}

async function resolveDatabaseBoard(
  options: {
    board: NotionBoardConfig;
    fetcher: NotionFetch;
    notionVersion: string;
    token: string;
  },
  databaseId: string
): Promise<NotionResolvedBoard> {
  const database = (await requestJson({
    fetcher: options.fetcher,
    method: "GET",
    notionVersion: options.notionVersion,
    path: `/databases/${databaseId}`,
    token: options.token
  })) as NotionDatabaseResponse;
  const firstDataSourceId = database.data_sources?.[0]?.id;
  if (!firstDataSourceId) {
    throw new Error(`Notion database has no data sources: ${databaseId}`);
  }
  return { board: options.board, databaseId: database.id, dataSourceId: firstDataSourceId };
}

async function retrieveDataSource(options: {
  dataSourceId: string;
  fetcher: NotionFetch;
  notionVersion: string;
  token: string;
}): Promise<NotionDataSourceResponse> {
  return (await requestJson({
    fetcher: options.fetcher,
    method: "GET",
    notionVersion: options.notionVersion,
    path: `/data_sources/${options.dataSourceId}`,
    token: options.token
  })) as NotionDataSourceResponse;
}

async function queryDataSourcePages(options: {
  dataSourceId: string;
  fetcher: NotionFetch;
  maxPages: number;
  notionVersion: string;
  pageSize: number;
  token: string;
}): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      in_trash: false,
      page_size: Math.min(options.pageSize, DEFAULT_PAGE_SIZE),
      result_type: "page"
    };
    if (cursor) {
      body.start_cursor = cursor;
    }

    const payload = (await requestJson({
      body,
      fetcher: options.fetcher,
      method: "POST",
      notionVersion: options.notionVersion,
      path: `/data_sources/${options.dataSourceId}/query`,
      token: options.token
    })) as NotionQueryResponse;

    pages.push(...payload.results.filter((result) => result.object === "page"));
    cursor = payload.next_cursor ?? undefined;
    if (pages.length >= options.maxPages) {
      return pages.slice(0, options.maxPages);
    }
  } while (cursor);

  return pages;
}

function normalizeNotionPage(
  page: NotionPage,
  board: NotionBoardConfig,
  dataSource: NotionDataSourceResponse,
  resolved: NotionResolvedBoard
): WorkItem {
  const properties = page.properties;
  const titleProperty = pickProperty(properties, board.titleProperty, PROPERTY_CANDIDATES.title, ["title"]);
  const statusProperty = pickProperty(properties, board.statusProperty, PROPERTY_CANDIDATES.status, ["status", "select"]);
  const dueProperty = pickProperty(properties, board.dueProperty, PROPERTY_CANDIDATES.due, ["date"]);
  const priorityProperty = pickProperty(properties, board.priorityProperty, PROPERTY_CANDIDATES.priority, ["select", "status"]);
  const assigneeProperty = pickProperty(properties, board.assigneeProperty, PROPERTY_CANDIDATES.assignee, ["people"]);
  const projectProperty = pickProperty(properties, board.projectProperty, PROPERTY_CANDIDATES.project, [
    "select",
    "rich_text",
    "title",
    "relation"
  ]);
  const labelsProperty = pickProperty(properties, board.labelsProperty, PROPERTY_CANDIDATES.labels, [
    "multi_select",
    "select"
  ]);
  const estimateProperty = pickProperty(properties, board.estimateProperty, PROPERTY_CANDIDATES.estimate, ["number"]);

  const labels = labelsProperty ? extractLabels(properties[labelsProperty]) : [];
  const statusName = statusProperty ? extractPropertyText(properties[statusProperty]) : undefined;
  const project = projectProperty ? extractPropertyText(properties[projectProperty]) : board.name;
  const title = (titleProperty ? extractPropertyText(properties[titleProperty]) : undefined) ?? "Untitled Notion task";
  const priorityText = priorityProperty ? extractPropertyText(properties[priorityProperty]) : undefined;

  const workItem: WorkItem = {
    id: `notion:${page.id}`,
    source: "notion",
    sourceId: page.id,
    title,
    status: inferStatus(statusName),
    assignees: assigneeProperty ? extractAssignees(properties[assigneeProperty]) : [],
    labels,
    raw: {
      dataSourceId: resolved.dataSourceId,
      databaseId: resolved.databaseId,
      propertyMap: {
        assignee: assigneeProperty,
        due: dueProperty,
        estimate: estimateProperty,
        labels: labelsProperty,
        priority: priorityProperty,
        project: projectProperty,
        status: statusProperty,
        title: titleProperty
      },
      properties: Object.keys(dataSource.properties ?? {})
    }
  };

  if (page.url) {
    workItem.sourceUrl = page.url;
  }
  if (page.created_time) {
    workItem.createdAt = page.created_time;
  }
  if (page.last_edited_time) {
    workItem.updatedAt = page.last_edited_time;
  }
  if (dueProperty) {
    const dueAt = extractDueDate(properties[dueProperty]);
    if (dueAt) {
      workItem.dueAt = dueAt;
    }
  }
  const priority = inferPriority(priorityText);
  if (priority) {
    workItem.priority = priority;
  }
  if (project) {
    workItem.project = project;
  }
  if (estimateProperty) {
    const estimateMinutes = extractEstimateMinutes(properties[estimateProperty]);
    if (estimateMinutes) {
      workItem.estimateMinutes = estimateMinutes;
    }
  }

  return workItem;
}

function pickProperty(
  properties: Record<string, NotionProperty>,
  configuredName: string | undefined,
  candidateNames: readonly string[],
  fallbackTypes: string[]
): string | undefined {
  if (configuredName && properties[configuredName]) {
    return configuredName;
  }

  const normalizedEntries = Object.keys(properties).map((name) => ({ name, normalized: normalizeName(name) }));
  for (const candidate of candidateNames) {
    const found = normalizedEntries.find((entry) => entry.normalized === normalizeName(candidate));
    if (found) {
      return found.name;
    }
  }

  return Object.entries(properties).find(([, property]) => fallbackTypes.includes(property.type))?.[0];
}

function extractPropertyText(property: NotionProperty | undefined): string | undefined {
  if (!property) {
    return undefined;
  }

  if (property.type === "title") {
    return joinRichText(property.title);
  }
  if (property.type === "rich_text") {
    return joinRichText(property.rich_text);
  }
  if (property.type === "status") {
    return property.status?.name ?? undefined;
  }
  if (property.type === "select") {
    return property.select?.name ?? undefined;
  }
  if (property.type === "multi_select") {
    return property.multi_select?.map((option) => option.name).filter(isNonEmptyString).join(", ");
  }
  if (property.type === "date") {
    return property.date?.start ?? undefined;
  }
  if (property.type === "people") {
    return extractAssignees(property).join(", ");
  }
  if (property.type === "number") {
    return typeof property.number === "number" ? String(property.number) : undefined;
  }
  if (property.type === "url") {
    return property.url ?? undefined;
  }
  if (property.type === "relation") {
    return property.relation?.[0]?.id;
  }

  return undefined;
}

function extractLabels(property: NotionProperty | undefined): string[] {
  if (!property) {
    return [];
  }
  if (property.type === "multi_select") {
    return property.multi_select?.map((option) => option.name).filter(isNonEmptyString) ?? [];
  }
  const text = extractPropertyText(property);
  return text ? [text] : [];
}

function extractAssignees(property: NotionProperty | undefined): string[] {
  if (!property) {
    return [];
  }
  if (property.type === "people") {
    return (
      property.people
        ?.map((person) => person.name ?? person.person?.email)
        .filter(isNonEmptyString)
        .map((value) => value.trim()) ?? []
    );
  }
  const text = extractPropertyText(property);
  return text ? [text] : [];
}

function extractDueDate(property: NotionProperty | undefined): string | undefined {
  if (property?.type !== "date" || !property.date?.start) {
    return undefined;
  }
  return toIsoDateTime(property.date.start);
}

function extractEstimateMinutes(property: NotionProperty | undefined): number | undefined {
  if (!property) {
    return undefined;
  }
  if (property.type === "number" && typeof property.number === "number" && property.number > 0) {
    return Math.round(property.number);
  }
  const text = extractPropertyText(property);
  const minutes = text?.match(/\d+/)?.[0];
  return minutes ? Number.parseInt(minutes, 10) : undefined;
}

function inferStatus(value: string | undefined): WorkItemStatus {
  if (!value) {
    return "todo";
  }

  for (const mapping of STATUS_MAPPINGS) {
    if (mapping.patterns.some((pattern) => pattern.test(value))) {
      return mapping.status;
    }
  }
  return "unknown";
}

function inferPriority(value: string | undefined): WorkItemPriority | undefined {
  const normalized = value?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (/(urgent|critical|highest|p0|긴급|매우\s*높)/i.test(normalized)) {
    return "urgent";
  }
  if (/(high|p1|높)/i.test(normalized)) {
    return "high";
  }
  if (/(medium|normal|p2|중간|보통)/i.test(normalized)) {
    return "medium";
  }
  if (/(low|p3|낮)/i.test(normalized)) {
    return "low";
  }
  return undefined;
}

async function requestJson(options: {
  body?: unknown;
  fetcher: NotionFetch;
  method: "GET" | "POST";
  notionVersion: string;
  path: string;
  token: string;
}): Promise<unknown> {
  const init: RequestInit = {
    headers: {
      Authorization: `Bearer ${options.token}`,
      "Content-Type": "application/json",
      "Notion-Version": options.notionVersion
    },
    method: options.method
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  const response = await options.fetcher(`${NOTION_API_BASE}${options.path}`, init);

  if (!response.ok) {
    throw new Error(`Notion request failed (${response.status}) for ${options.method} ${options.path}`);
  }

  return await response.json();
}

function joinRichText(value: Array<{ plain_text?: string }> | undefined): string | undefined {
  const text = value?.map((part) => part.plain_text).filter(isNonEmptyString).join("").trim();
  return text || undefined;
}

function toIsoDateTime(value: string): string {
  return value.includes("T") ? new Date(value).toISOString() : `${value}T00:00:00.000Z`;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
