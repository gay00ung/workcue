import { describe, expect, it } from "vitest";
import { parseObsidianTasks } from "./parser.js";

describe("parseObsidianTasks", () => {
  it("parses unchecked tasks and ignores checked tasks", () => {
    const items = parseObsidianTasks({
      vaultPath: "/vault",
      filePath: "/vault/Daily/2026-05-29.md",
      content: [
        "- [ ] Review billing PR #work 📅 2026-05-30 🔼 [estimate:: 25m]",
        "- [x] Already done #work",
        "plain text",
        "  - [ ] Follow up with design #waiting [due:: 2026-05-31]"
      ].join("\n"),
      updatedAt: new Date("2026-05-29T00:00:00.000Z"),
      assignee: "you"
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      source: "obsidian",
      sourceId: "Daily/2026-05-29.md:1",
      title: "Review billing PR",
      dueAt: "2026-05-30T00:00:00.000Z",
      priority: "high",
      labels: ["work"],
      estimateMinutes: 25,
      assignees: ["you"]
    });
    expect(items[1]).toMatchObject({
      sourceId: "Daily/2026-05-29.md:4",
      status: "waiting",
      labels: ["waiting"]
    });
  });
});
