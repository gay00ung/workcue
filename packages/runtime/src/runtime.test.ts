import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runWorkCueToday, WorkCueRuntimeError, writeWorkCueOutputs } from "./index.js";

describe("runWorkCueToday", () => {
  it("creates a deterministic demo brief", async () => {
    const result = await runWorkCueToday({ date: "2026-05-29", demo: true });

    expect(result.items).toHaveLength(5);
    expect(result.sourceCounts.github).toBe(2);
    expect(result.markdown).toContain("# WorkCue Morning Brief - 2026-05-29");
    expect(result.markdown).toContain("Review PR #184");
  });

  it("reports missing sources without implicit external calls", async () => {
    await expect(runWorkCueToday({ date: "2026-05-29" })).rejects.toMatchObject({
      code: "NO_SOURCES_CONFIGURED"
    } satisfies Partial<WorkCueRuntimeError>);
  });
});

describe("writeWorkCueOutputs", () => {
  it("writes explicit markdown output paths", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "workcue-runtime-"));
    const outputPath = path.join(tmpDir, "brief.md");

    const written = await writeWorkCueOutputs({
      date: "2026-05-29",
      markdown: "# Brief\n",
      outputPath
    });

    await expect(readFile(outputPath, "utf8")).resolves.toBe("# Brief\n");
    expect(written.markdownPath).toBe(outputPath);
  });
});
