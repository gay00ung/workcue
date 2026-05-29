import { describe, expect, it } from "vitest";
import { extractNotionId, syncNotionKanban } from "./notion.js";

describe("Notion connector", () => {
  it("extracts Notion ids from database links", () => {
    expect(extractNotionId("https://www.notion.so/acme/Tasks-0123456789abcdef0123456789abcdef?v=board")).toBe(
      "01234567-89ab-cdef-0123-456789abcdef"
    );
  });

  it("resolves a database link and normalizes kanban rows", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);

      if (String(input).endsWith("/v1/databases/01234567-89ab-cdef-0123-456789abcdef")) {
        return jsonResponse({
          object: "database",
          id: "01234567-89ab-cdef-0123-456789abcdef",
          data_sources: [{ id: "11111111-2222-3333-4444-555555555555" }]
        });
      }

      if (String(input).endsWith("/v1/data_sources/11111111-2222-3333-4444-555555555555")) {
        return jsonResponse({
          object: "data_source",
          id: "11111111-2222-3333-4444-555555555555",
          properties: {
            Name: { type: "title" },
            Status: { type: "status" },
            Due: { type: "date" },
            Priority: { type: "select" },
            Owner: { type: "people" },
            Project: { type: "select" },
            Tags: { type: "multi_select" },
            Estimate: { type: "number" }
          }
        });
      }

      if (String(input).endsWith("/v1/data_sources/11111111-2222-3333-4444-555555555555/query")) {
        return jsonResponse({
          object: "list",
          has_more: false,
          next_cursor: null,
          results: [
            {
              object: "page",
              id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              created_time: "2026-05-28T00:00:00.000Z",
              last_edited_time: "2026-05-29T00:00:00.000Z",
              url: "https://www.notion.so/acme/Review-auth-PR-aaaaaaaa",
              properties: {
                Name: { type: "title", title: [{ plain_text: "Review auth PR" }] },
                Status: { type: "status", status: { name: "In progress" } },
                Due: { type: "date", date: { start: "2026-05-29" } },
                Priority: { type: "select", select: { name: "High" } },
                Owner: { type: "people", people: [{ name: "GaYoung" }] },
                Project: { type: "select", select: { name: "Auth" } },
                Tags: { type: "multi_select", multi_select: [{ name: "release" }, { name: "backend" }] },
                Estimate: { type: "number", number: 45 }
              }
            },
            {
              object: "page",
              id: "ffffffff-1111-2222-3333-444444444444",
              url: "https://www.notion.so/acme/Done-ffffffff",
              properties: {
                Name: { type: "title", title: [{ plain_text: "Already shipped" }] },
                Status: { type: "status", status: { name: "Done" } }
              }
            }
          ]
        });
      }

      return new Response("not found", { status: 404 });
    };

    const items = await syncNotionKanban({
      token: "secret",
      boards: [
        {
          url: "https://www.notion.so/acme/Tasks-0123456789abcdef0123456789abcdef?v=board",
          assigneeProperty: "Owner"
        }
      ],
      fetcher
    });

    expect(calls).toEqual([
      "GET https://api.notion.com/v1/databases/01234567-89ab-cdef-0123-456789abcdef",
      "GET https://api.notion.com/v1/data_sources/11111111-2222-3333-4444-555555555555",
      "POST https://api.notion.com/v1/data_sources/11111111-2222-3333-4444-555555555555/query"
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: "notion:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      source: "notion",
      sourceId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      sourceUrl: "https://www.notion.so/acme/Review-auth-PR-aaaaaaaa",
      title: "Review auth PR",
      status: "in_progress",
      assignees: ["GaYoung"],
      dueAt: "2026-05-29T00:00:00.000Z",
      priority: "high",
      labels: ["release", "backend"],
      project: "Auth",
      estimateMinutes: 45
    });
    expect(items[1]).toMatchObject({
      title: "Already shipped",
      status: "done"
    });
  });

  it("treats unresolved ids as direct data source ids", async () => {
    const fetcher: typeof fetch = async (input) => {
      if (String(input).includes("/databases/")) {
        return new Response("not found", { status: 404 });
      }
      if (String(input).includes("/data_sources/") && !String(input).endsWith("/query")) {
        return jsonResponse({
          object: "data_source",
          id: "22222222-3333-4444-5555-666666666666",
          properties: {
            Task: { type: "title" },
            Stage: { type: "select" }
          }
        });
      }
      return jsonResponse({
        object: "list",
        has_more: false,
        next_cursor: null,
        results: [
          {
            object: "page",
            id: "77777777-8888-9999-aaaa-bbbbbbbbbbbb",
            properties: {
              Task: { type: "title", title: [{ plain_text: "Draft launch note" }] },
              Stage: { type: "select", select: { name: "Next" } }
            }
          }
        ]
      });
    };

    const items = await syncNotionKanban({
      token: "secret",
      boards: [{ id: "22222222-3333-4444-5555-666666666666" }],
      fetcher
    });

    expect(items[0]).toMatchObject({
      title: "Draft launch note",
      status: "todo"
    });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status: 200
  });
}
