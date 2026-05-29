import type { WorkItem } from "@workcue/core";

export interface SyncGitHubOptions {
  token?: string;
  owner: string;
  repos: string[];
  user: string;
  fetcher?: typeof fetch;
}

export interface GitHubIssueSearchResponse {
  items: GitHubIssueSearchItem[];
}

export interface GitHubIssueSearchItem {
  number: number;
  html_url: string;
  title: string;
  body?: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
  milestone?: { title: string } | null;
  pull_request?: { html_url: string };
}

export interface GitHubSearchPlan {
  query: string;
  kind: "assigned" | "review_requested";
}

export interface GitHubNormalizedItem {
  workItem: WorkItem;
  searchKind: GitHubSearchPlan["kind"];
}
