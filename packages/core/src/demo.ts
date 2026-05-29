import type { WorkItem } from "./schema.js";

export function buildDemoWorkItems(date: string): WorkItem[] {
  const today = `${date}T09:00:00.000Z`;
  const tomorrow = addDays(date, 1);
  const nineDaysAgo = addDays(date, -9);
  const fourteenDaysAgo = addDays(date, -14);

  return [
    {
      id: "github:pr-184",
      source: "github",
      sourceId: "PR-184",
      sourceUrl: "https://github.com/acme/app/pull/184",
      title: "Review PR #184: Fix payment retry race condition",
      body: "Payment retry logic needs review before billing-v2 can ship.",
      status: "in_review",
      assignees: ["alex"],
      requestedReviewers: ["you"],
      createdAt: fourteenDaysAgo,
      updatedAt: today,
      priority: "high",
      labels: ["billing", "production", "review"],
      milestone: "billing-v2",
      estimateMinutes: 35,
      blocking: ["JIRA-231"]
    },
    {
      id: "jira:jira-231",
      source: "jira",
      sourceId: "JIRA-231",
      sourceUrl: "https://example.atlassian.net/browse/JIRA-231",
      title: "Finish JIRA-231: Update onboarding checklist",
      status: "todo",
      assignees: ["you"],
      createdAt: fourteenDaysAgo,
      updatedAt: nineDaysAgo,
      dueAt: tomorrow,
      priority: "high",
      labels: ["onboarding", "release"],
      sprint: "Current Sprint",
      estimateMinutes: 45
    },
    {
      id: "obsidian:customer-feedback-may",
      source: "obsidian",
      sourceId: "Daily/2026-05-20.md:42",
      title: "Convert Obsidian note \"Customer feedback - May\" into issues",
      status: "todo",
      assignees: ["you"],
      createdAt: nineDaysAgo,
      updatedAt: nineDaysAgo,
      priority: "medium",
      labels: ["customer-feedback"],
      estimateMinutes: 25
    },
    {
      id: "linear:eng-91",
      source: "linear",
      sourceId: "ENG-91",
      sourceUrl: "https://linear.app/acme/issue/ENG-91",
      title: "Wait for design review on settings navigation",
      status: "waiting",
      assignees: ["you"],
      createdAt: fourteenDaysAgo,
      updatedAt: nineDaysAgo,
      priority: "medium",
      labels: ["waiting"],
      estimateMinutes: 30
    },
    {
      id: "github:issue-72",
      source: "github",
      sourceId: "ISSUE-72",
      sourceUrl: "https://github.com/acme/app/issues/72",
      title: "Refactor analytics event names",
      status: "todo",
      assignees: ["you"],
      createdAt: fourteenDaysAgo,
      updatedAt: today,
      priority: "low",
      labels: ["chore", "analytics"],
      estimateMinutes: 120
    }
  ];
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString();
}
