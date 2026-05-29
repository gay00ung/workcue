import { describe, expect, it } from "vitest";
import { syncJira } from "./jira.js";

describe("Jira connector", () => {
  it("normalizes Jira issues into WorkItems", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      calls.push(`${String(input)} ${String(init?.body)}`);
      return new Response(
        JSON.stringify({
          issues: [
            {
              key: "ENG-231",
              fields: {
                summary: "Update onboarding checklist",
                status: { name: "In Progress", statusCategory: { key: "indeterminate" } },
                priority: { name: "High" },
                labels: ["release"],
                assignee: { emailAddress: "dev@example.com" },
                duedate: "2026-05-30",
                created: "2026-05-20T00:00:00.000+0000",
                updated: "2026-05-29T00:00:00.000+0000",
                fixVersions: [{ name: "launch" }],
                customfield_10020: [{ name: "Sprint 12" }]
              }
            }
          ]
        }),
        { status: 200 }
      );
    };

    const items = await syncJira({
      baseUrl: "https://example.atlassian.net",
      jql: ["assignee = currentUser()"],
      fieldMap: { sprint: "customfield_10020" },
      fetcher
    });

    expect(calls[0]).toContain("/rest/api/3/search");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "jira:ENG-231",
      source: "jira",
      sourceUrl: "https://example.atlassian.net/browse/ENG-231",
      title: "Update onboarding checklist",
      status: "in_progress",
      priority: "high",
      dueAt: "2026-05-30T00:00:00.000Z",
      milestone: "launch",
      sprint: "Sprint 12"
    });
  });
});
