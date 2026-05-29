import type {
  GitHubIssueSearchItem,
  GitHubIssueSearchResponse,
  GitHubNormalizedItem,
  GitHubSearchPlan,
  SyncGitHubOptions
} from "./types.js";
import type { WorkItem, WorkItemPriority } from "@workcue/core";

const SEARCH_ENDPOINT = "https://api.github.com/search/issues";

export async function syncGitHub(options: SyncGitHubOptions): Promise<WorkItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const plans = buildSearchPlans(options);
  const normalized: GitHubNormalizedItem[] = [];

  for (const plan of plans) {
    const response = await fetcher(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(plan.query)}&per_page=50`, {
      headers: buildHeaders(options.token)
    });

    if (!response.ok) {
      throw new Error(`GitHub search failed (${response.status}) for query: ${plan.query}`);
    }

    const payload = (await response.json()) as GitHubIssueSearchResponse;
    normalized.push(...payload.items.map((item) => normalizeGitHubItem(item, plan, options.user)));
  }

  return dedupeWorkItems(normalized.map((item) => item.workItem));
}

export function buildSearchPlans(options: Pick<SyncGitHubOptions, "owner" | "repos" | "user">): GitHubSearchPlan[] {
  return options.repos.flatMap((repo) => {
    const repoQuery = `repo:${options.owner}/${repo}`;
    return [
      {
        kind: "assigned",
        query: `${repoQuery} is:open assignee:${options.user} archived:false`
      },
      {
        kind: "review_requested",
        query: `${repoQuery} is:pr is:open review-requested:${options.user}`
      }
    ];
  });
}

function normalizeGitHubItem(item: GitHubIssueSearchItem, plan: GitHubSearchPlan, user: string): GitHubNormalizedItem {
  const isPullRequest = Boolean(item.pull_request);
  const labels = item.labels.map((label) => label.name);
  const sourceId = `${isPullRequest ? "PR" : "ISSUE"}-${item.number}`;
  const workItem: WorkItem = {
    id: `github:${sourceId}`,
    source: "github",
    sourceId,
    sourceUrl: item.html_url,
    title: item.title,
    body: item.body ?? undefined,
    status: isPullRequest ? "in_review" : "todo",
    assignees: item.assignees.map((assignee) => assignee.login),
    requestedReviewers: plan.kind === "review_requested" ? [user] : undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    priority: inferPriority(labels),
    labels,
    milestone: item.milestone?.title
  };

  return { workItem, searchKind: plan.kind };
}

function buildHeaders(token: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function inferPriority(labels: string[]): WorkItemPriority | undefined {
  const normalized = labels.map((label) => label.toLowerCase());
  if (normalized.some((label) => ["p0", "urgent", "critical"].includes(label))) {
    return "urgent";
  }
  if (normalized.some((label) => ["p1", "high", "priority: high"].includes(label))) {
    return "high";
  }
  if (normalized.some((label) => ["p2", "medium", "priority: medium"].includes(label))) {
    return "medium";
  }
  if (normalized.some((label) => ["p3", "low", "priority: low"].includes(label))) {
    return "low";
  }
  return undefined;
}

function dedupeWorkItems(items: WorkItem[]): WorkItem[] {
  const byId = new Map<string, WorkItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }

    byId.set(item.id, {
      ...existing,
      requestedReviewers: item.requestedReviewers ?? existing.requestedReviewers
    });
  }
  return [...byId.values()];
}
