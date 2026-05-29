import type { WorkItemStatus } from "@workcue/core";

export type NotionFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface NotionBoardConfig {
  id?: string;
  url?: string;
  databaseId?: string;
  dataSourceId?: string;
  name?: string;
  titleProperty?: string;
  statusProperty?: string;
  dueProperty?: string;
  priorityProperty?: string;
  assigneeProperty?: string;
  projectProperty?: string;
  labelsProperty?: string;
  estimateProperty?: string;
}

export interface SyncNotionKanbanOptions {
  token: string;
  boards: NotionBoardConfig[];
  fetcher?: NotionFetch;
  notionVersion?: string;
  pageSize?: number;
  maxPages?: number;
}

export interface NotionResolvedBoard {
  board: NotionBoardConfig;
  dataSourceId: string;
  databaseId?: string;
}

export interface NotionDatabaseResponse {
  object: "database";
  id: string;
  data_sources?: Array<{ id: string; name?: string }>;
}

export interface NotionDataSourceResponse {
  object: "data_source";
  id: string;
  properties?: Record<string, { type?: string; name?: string }>;
}

export interface NotionQueryResponse {
  object: "list";
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface NotionPage {
  object: "page";
  id: string;
  created_time?: string;
  last_edited_time?: string;
  url?: string;
  public_url?: string | null;
  properties: Record<string, NotionProperty>;
  in_trash?: boolean;
  archived?: boolean;
}

export interface NotionProperty {
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  status?: { name?: string | null } | null;
  select?: { name?: string | null } | null;
  multi_select?: Array<{ name?: string | null }>;
  date?: { start?: string | null; end?: string | null } | null;
  people?: Array<{ name?: string | null; person?: { email?: string | null } | null }>;
  number?: number | null;
  url?: string | null;
  relation?: Array<{ id: string }>;
  checkbox?: boolean;
}

export interface NotionRichText {
  plain_text?: string;
}

export interface NotionStatusMapping {
  status: WorkItemStatus;
  patterns: RegExp[];
}
