import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  explainWorkCueItem,
  renderRecommendationExplanation,
  runWorkCueToday,
  syncWorkCueSources,
  WorkCueRuntimeError,
  writeWorkCueOutputs
} from "./index.js";

const execFileAsync = promisify(execFile);

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

describe("syncWorkCueSources", () => {
  it("returns normalized items without creating a brief", async () => {
    const result = await syncWorkCueSources({ date: "2026-05-29", demo: true });

    expect(result.items.map((item) => item.id)).toContain("github:pr-184");
    expect(result.sourceCounts.github).toBe(2);
    expect(result.syncedAt).toMatch(/T/);
  });

  it("enriches work items with local project context without exposing local paths", async () => {
    const repoPath = await createFixtureGitRepo();
    const result = await syncWorkCueSources({
      date: "2026-05-29",
      demo: true,
      projectPath: repoPath
    });
    const item = result.items.find((candidate) => candidate.id === "github:pr-184");

    expect(result.projectContexts).toHaveLength(1);
    expect(result.projectContexts[0]?.repoName).toBe("app");
    expect(item?.projectContexts?.[0]).toMatchObject({
      projectId: "cli-project",
      repoName: "app",
      currentBranch: "feature/auth-cleanup",
      isDirty: true
    });
    expect(item?.projectContexts?.[0]?.signals).toEqual(
      expect.arrayContaining(["active_branch", "dirty_worktree", "source_url"])
    );
    expect(JSON.stringify(result)).not.toContain(repoPath);
  });
});

describe("explainWorkCueItem", () => {
  it("renders a score explanation for a synced item", async () => {
    const recommendation = await explainWorkCueItem({
      date: "2026-05-29",
      demo: true,
      itemId: "github:pr-184"
    });
    const markdown = renderRecommendationExplanation(recommendation);

    expect(recommendation.score).toBeGreaterThan(0);
    expect(markdown).toContain("# WorkCue Explain - Review PR #184");
    expect(markdown).toContain("## Why now");
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

async function createFixtureGitRepo(): Promise<string> {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), "workcue-project-"));
  await mkdir(path.join(repoPath, "src"));
  await writeFile(path.join(repoPath, "package.json"), '{"name":"app","scripts":{"test":"vitest run"}}\n', "utf8");
  await writeFile(path.join(repoPath, "README.md"), "# App\n", "utf8");
  await writeFile(path.join(repoPath, "src", "auth.ts"), "export const auth = true;\n", "utf8");
  await runGit(repoPath, ["init"]);
  await runGit(repoPath, ["remote", "add", "origin", "https://github.com/acme/app.git"]);
  await runGit(repoPath, ["add", "."]);
  await runGit(repoPath, ["-c", "user.name=WorkCue", "-c", "user.email=workcue@example.com", "commit", "-m", "feat: auth baseline"]);
  await runGit(repoPath, ["checkout", "-b", "feature/auth-cleanup"]);
  await writeFile(path.join(repoPath, "src", "auth.ts"), "export const auth = true;\n// TODO: review PR #184 retry path\n", "utf8");
  return repoPath;
}

async function runGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", ["-C", cwd, ...args]);
}
