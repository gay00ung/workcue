import { describe, expect, it } from "vitest";
import { createBrief, renderBriefMarkdown } from "./brief.js";
import { buildDemoWorkItems } from "./demo.js";
import { rankWorkItems } from "./scoring.js";

describe("demo brief", () => {
  it("ranks review and due work at the top", () => {
    const brief = createBrief(buildDemoWorkItems("2026-05-29"), {
      date: "2026-05-29",
      userHandles: ["you"]
    });

    expect(brief.focus).toHaveLength(3);
    expect(brief.focus[0]?.workItem.id).toBe("github:pr-184");
    expect(brief.focus[1]?.workItem.id).toBe("jira:jira-231");
    expect(brief.focus.map((item) => item.workItem.id)).toContain("obsidian:customer-feedback-may");
  });

  it("renders evidence and source links", () => {
    const brief = createBrief(buildDemoWorkItems("2026-05-29"), {
      date: "2026-05-29",
      userHandles: ["you"]
    });

    const markdown = renderBriefMarkdown(brief);

    expect(markdown).toContain("Today's Focus");
    expect(markdown).toContain("Why now:");
    expect(markdown).toContain("https://github.com/acme/app/pull/184");
    expect(markdown).toContain("What Not To Do Today");
  });

  it("applies user-defined signal weight multipliers", () => {
    const items = buildDemoWorkItems("2026-05-29");
    const [defaultTop] = rankWorkItems(items, {
      date: "2026-05-29",
      userHandles: ["you"]
    });
    const [weightedTop] = rankWorkItems(items, {
      date: "2026-05-29",
      signalWeights: {
        review_requested: 2
      },
      userHandles: ["you"]
    });

    expect(defaultTop?.score).toBe(370);
    expect(weightedTop?.score).toBe(455);
    expect(weightedTop?.reasons.find((reason) => reason.kind === "review_requested")?.evidence).toMatchObject({
      defaultWeight: 85,
      multiplier: 2
    });
  });
});
