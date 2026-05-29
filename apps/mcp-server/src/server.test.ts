import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runDoctorTool, runTodayTool } from "./server.js";

describe("runTodayTool", () => {
  it("returns a demo brief with MCP metadata", async () => {
    const markdown = await runTodayTool({ date: "2026-05-29", demo: true, top: 2 });

    expect(markdown).toContain("# WorkCue Morning Brief - 2026-05-29");
    expect(markdown).toContain("Review PR #184");
    expect(markdown).toContain("## WorkCue MCP Metadata");
    expect(markdown).toContain("Items read: 5");
  });
});

describe("runDoctorTool", () => {
  it("summarizes config readiness without external sync", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "workcue-mcp-"));
    const configPath = path.join(tmpDir, "config.yml");
    await writeFile(
      configPath,
      [
        "version: 1",
        "timezone: UTC",
        "sources:",
        "  obsidian:",
        "    enabled: false",
        "  github:",
        "    enabled: false",
        "  jira:",
        "    enabled: false"
      ].join("\n"),
      "utf8"
    );

    const doctor = await runDoctorTool({ configPath });

    expect(doctor).toContain("# WorkCue Doctor");
    expect(doctor).toContain("Obsidian: disabled");
    expect(doctor).toContain("GitHub: disabled");
    expect(doctor).toContain("Jira: disabled");
  });
});
