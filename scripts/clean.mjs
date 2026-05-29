import { rm } from "node:fs/promises";
import path from "node:path";

const targets = [
  ".release",
  "apps/cli/dist",
  "apps/cli/tsconfig.tsbuildinfo",
  "apps/mcp-server/dist",
  "apps/mcp-server/tsconfig.tsbuildinfo",
  "packages/cache/sqlite/dist",
  "packages/cache/sqlite/tsconfig.tsbuildinfo",
  "packages/config/dist",
  "packages/config/tsconfig.tsbuildinfo",
  "packages/connectors/github/dist",
  "packages/connectors/github/tsconfig.tsbuildinfo",
  "packages/connectors/jira/dist",
  "packages/connectors/jira/tsconfig.tsbuildinfo",
  "packages/connectors/obsidian/dist",
  "packages/connectors/obsidian/tsconfig.tsbuildinfo",
  "packages/core/dist",
  "packages/core/tsconfig.tsbuildinfo",
  "packages/llm/dist",
  "packages/llm/tsconfig.tsbuildinfo",
  "packages/outputs/markdown/dist",
  "packages/outputs/markdown/tsconfig.tsbuildinfo",
  "packages/runtime/dist",
  "packages/runtime/tsconfig.tsbuildinfo"
];

await Promise.all(targets.map((target) => rm(path.resolve(target), { force: true, recursive: true })));
