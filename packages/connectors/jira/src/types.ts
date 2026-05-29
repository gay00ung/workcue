export interface SyncJiraOptions {
  baseUrl: string;
  email?: string;
  apiToken?: string;
  jql: string[];
  fieldMap?: JiraFieldMap;
  fetcher?: typeof fetch;
}

export interface JiraFieldMap {
  sprint?: string;
  storyPoints?: string;
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    status?: {
      name: string;
      statusCategory?: { key: string };
    };
    priority?: { name: string } | null;
    labels?: string[];
    assignee?: {
      displayName?: string;
      emailAddress?: string;
      accountId?: string;
    } | null;
    duedate?: string | null;
    created?: string;
    updated?: string;
    components?: Array<{ name: string }>;
    fixVersions?: Array<{ name: string }>;
    [field: string]: unknown;
  };
}
