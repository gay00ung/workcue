import { describe, expect, it } from "vitest";
import { buildSearchPlans, syncGitHub } from "./github.js";

describe("GitHub connector", () => {
  it("builds assigned and review-requested search plans", () => {
    expect(buildSearchPlans({ owner: "acme", repos: ["app"], user: "you" })).toEqual([
      {
        kind: "assigned",
        query: "repo:acme/app is:open assignee:you archived:false"
      },
      {
        kind: "review_requested",
        query: "repo:acme/app is:pr is:open review-requested:you"
      }
    ]);
  });

  it("normalizes issues and pull requests", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response(
        JSON.stringify({
          items: [
            {
              number: 184,
              html_url: "https://github.com/acme/app/pull/184",
              title: "Fix payment retry race condition",
              body: "Needs review",
              state: "open",
              created_at: "2026-05-20T00:00:00.000Z",
              updated_at: "2026-05-29T00:00:00.000Z",
              labels: [{ name: "high" }, { name: "production" }],
              assignees: [{ login: "alex" }],
              milestone: { title: "billing-v2" },
              pull_request: { html_url: "https://github.com/acme/app/pull/184" }
            }
          ]
        }),
        { status: 200 }
      );
    };

    const items = await syncGitHub({
      owner: "acme",
      repos: ["app"],
      user: "you",
      fetcher
    });

    expect(calls).toHaveLength(2);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "github:PR-184",
      source: "github",
      status: "in_review",
      priority: "high",
      labels: ["high", "production"],
      milestone: "billing-v2",
      requestedReviewers: ["you"]
    });
  });
});
