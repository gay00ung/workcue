import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildDemoWorkItems } from "@workcue/core";
import { describe, expect, it } from "vitest";
import { readWorkItemsFromCache, writeWorkItemsToCache } from "./index.js";

describe("sqlite cache", () => {
  it("writes and reads normalized work items", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "workcue-cache-"));
    const dbPath = path.join(tmpDir, "workcue.sqlite");
    const items = buildDemoWorkItems("2026-05-29");

    const result = await writeWorkItemsToCache({
      dbPath,
      items,
      sourceCounts: {
        github: 2
      },
      syncedAt: "2026-05-29T09:00:00.000Z"
    });
    const cached = await readWorkItemsFromCache({ dbPath });

    expect(result.itemCount).toBe(5);
    expect(cached.map((item) => item.id)).toContain("github:pr-184");
  });
});
