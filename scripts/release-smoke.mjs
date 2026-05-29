import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const date = "2026-05-29";

run("node", ["apps/cli/dist/index.js", "--version"], { expectedIncludes: "0.1.0-alpha.1" });
run("node", ["apps/cli/dist/index.js", "--help"], { expectedIncludes: "Generate today's WorkCue brief" });
run("node", ["apps/cli/dist/index.js", "today", "--demo", "--date", date], { expectedIncludes: "Top recommendation" });

const syncJson = run("node", ["apps/cli/dist/index.js", "sync", "--demo", "--date", date, "--json"]);
const syncPayload = JSON.parse(syncJson);
if (typeof syncPayload.itemCount !== "number" || syncPayload.itemCount <= 0) {
  throw new Error("Expected demo sync to return at least one item.");
}

run("node", ["apps/cli/dist/index.js", "explain", "github:pr-184", "--demo", "--date", date], {
  expectedIncludes: "Why now"
});

const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "workcue-release-smoke-"));
const vault = path.join(tmpRoot, "vault");
const output = path.join(tmpRoot, "brief.md");
const dailyNote = path.join(vault, "Daily", `${date}.md`);
await mkdir(vault, { recursive: true });
await writeFile(
  path.join(vault, "tasks.md"),
  "- [ ] Review release checklist #work [due:: 2026-05-29] [estimate:: 25m]\n",
  "utf8"
);

run("node", [
  "apps/cli/dist/index.js",
  "today",
  "--obsidian-vault",
  vault,
  "--date",
  date,
  "--output",
  output,
  "--daily-note",
  dailyNote
]);

const outputText = await readFile(output, "utf8");
const dailyText = await readFile(dailyNote, "utf8");
if (!outputText.includes("WorkCue Morning Brief") || !dailyText.includes("workcue:start")) {
  throw new Error("Expected markdown output and daily-note upsert smoke artifacts.");
}

const mcpServer = await import(pathToFileURL(path.resolve("apps/mcp-server/dist/server.js")));
const mcpToday = await mcpServer.runTodayTool({ demo: true, date, top: 2 });
if (!mcpToday.includes("WorkCue MCP Metadata")) {
  throw new Error("Expected MCP today tool smoke output.");
}

console.log("Release smoke passed.");

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (options.expectedIncludes && !output.includes(options.expectedIncludes)) {
    throw new Error(`Expected command output to include ${JSON.stringify(options.expectedIncludes)}: ${command} ${args.join(" ")}`);
  }

  return output;
}
