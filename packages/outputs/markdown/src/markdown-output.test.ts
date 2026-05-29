import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { upsertDailyNoteSection, upsertWorkCueSection, writeMarkdownFile } from "./markdown-output.js";

describe("markdown output", () => {
  it("writes markdown files and creates parent directories", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "workcue-output-"));
    const outputPath = path.join(root, "briefs", "2026-05-29.md");

    await writeMarkdownFile({ outputPath, content: "# Brief\n" });

    await expect(readFile(outputPath, "utf8")).resolves.toBe("# Brief\n");
  });

  it("adds a managed WorkCue section without removing existing note content", () => {
    const existing = "# Daily\n\nUser note";
    const next = upsertWorkCueSection(existing, "# WorkCue Brief");

    expect(next).toContain("# Daily\n\nUser note");
    expect(next).toContain("## WorkCue");
    expect(next).toContain("<!-- workcue:start -->");
    expect(next).toContain("# WorkCue Brief");
  });

  it("replaces only the managed WorkCue section", () => {
    const existing = [
      "# Daily",
      "",
      "User note",
      "",
      "## WorkCue",
      "",
      "<!-- workcue:start -->",
      "old brief",
      "<!-- workcue:end -->",
      "",
      "After note"
    ].join("\n");

    const next = upsertWorkCueSection(existing, "new brief");

    expect(next).toContain("User note");
    expect(next).toContain("new brief");
    expect(next).toContain("After note");
    expect(next).not.toContain("old brief");
  });

  it("upserts a daily note file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "workcue-daily-"));
    const notePath = path.join(root, "Daily", "2026-05-29.md");

    await upsertDailyNoteSection({ notePath, content: "brief" });

    await expect(readFile(notePath, "utf8")).resolves.toContain("brief");
  });
});
