import type { WorkItem, WorkItemPriority, WorkItemStatus } from "@workcue/core";
import type { JiraIssue, JiraSearchResponse, SyncJiraOptions } from "./types.js";

const SEARCH_PATH = "/rest/api/3/search";
const DEFAULT_FIELDS = [
  "summary",
  "description",
  "status",
  "priority",
  "labels",
  "assignee",
  "duedate",
  "created",
  "updated",
  "components",
  "fixVersions"
];

export async function syncJira(options: SyncJiraOptions): Promise<WorkItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const fields = [...DEFAULT_FIELDS, ...Object.values(options.fieldMap ?? {}).filter(Boolean)];
  const items: WorkItem[] = [];

  for (const jql of options.jql) {
    const response = await fetcher(`${trimTrailingSlash(options.baseUrl)}${SEARCH_PATH}`, {
      method: "POST",
      headers: buildHeaders(options.email, options.apiToken),
      body: JSON.stringify({
        jql,
        maxResults: 50,
        fields
      })
    });

    if (!response.ok) {
      throw new Error(`Jira search failed (${response.status}) for JQL: ${jql}`);
    }

    const payload = (await response.json()) as JiraSearchResponse;
    items.push(...payload.issues.map((issue) => normalizeJiraIssue(issue, options)));
  }

  return dedupeWorkItems(items);
}

function normalizeJiraIssue(issue: JiraIssue, options: SyncJiraOptions): WorkItem {
  const labels = issue.fields.labels ?? [];
  const assignee = issue.fields.assignee;
  const sourceUrl = `${trimTrailingSlash(options.baseUrl)}/browse/${issue.key}`;

  return {
    id: `jira:${issue.key}`,
    source: "jira",
    sourceId: issue.key,
    sourceUrl,
    title: issue.fields.summary,
    body: stringifyDescription(issue.fields.description),
    status: inferStatus(issue, labels),
    assignees: assignee ? [assignee.emailAddress ?? assignee.displayName ?? assignee.accountId ?? "unknown"] : [],
    createdAt: issue.fields.created,
    updatedAt: issue.fields.updated,
    dueAt: issue.fields.duedate ? `${issue.fields.duedate}T00:00:00.000Z` : undefined,
    priority: inferPriority(issue.fields.priority?.name),
    labels,
    project: issue.key.split("-")[0],
    milestone: issue.fields.fixVersions?.[0]?.name,
    sprint: extractSprint(issue, options)
  };
}

function inferStatus(issue: JiraIssue, labels: string[]): WorkItemStatus {
  const statusName = issue.fields.status?.name.toLowerCase() ?? "";
  const category = issue.fields.status?.statusCategory?.key.toLowerCase();
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  if (category === "done") {
    return "done";
  }
  if (normalizedLabels.includes("blocked") || statusName.includes("blocked")) {
    return "blocked";
  }
  if (normalizedLabels.includes("waiting") || statusName.includes("waiting")) {
    return "waiting";
  }
  if (category === "indeterminate" || statusName.includes("progress")) {
    return "in_progress";
  }
  return "todo";
}

function inferPriority(priority: string | undefined): WorkItemPriority | undefined {
  const normalized = priority?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (["highest", "critical", "urgent"].includes(normalized)) {
    return "urgent";
  }
  if (normalized === "high") {
    return "high";
  }
  if (normalized === "medium") {
    return "medium";
  }
  if (normalized === "low" || normalized === "lowest") {
    return "low";
  }
  return undefined;
}

function extractSprint(issue: JiraIssue, options: SyncJiraOptions): string | undefined {
  const sprintField = options.fieldMap?.sprint;
  if (!sprintField) {
    return undefined;
  }
  const value = issue.fields[sprintField];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0] as { name?: unknown } | undefined;
    return typeof first?.name === "string" ? first.name : undefined;
  }
  if (typeof value === "object" && value !== null && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

function stringifyDescription(description: unknown): string | undefined {
  if (!description) {
    return undefined;
  }
  if (typeof description === "string") {
    return description;
  }
  return JSON.stringify(description);
}

function buildHeaders(email: string | undefined, apiToken: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  if (email && apiToken) {
    headers.Authorization = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
  }
  return headers;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function dedupeWorkItems(items: WorkItem[]): WorkItem[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
