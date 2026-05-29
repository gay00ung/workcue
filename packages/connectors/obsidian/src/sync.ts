import { promises as fs } from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";
import type { WorkItem } from "@workcue/core";
import { parseObsidianTasks } from "./parser.js";

export interface SyncObsidianVaultOptions {
  vaultPath: string;
  include?: string[];
  exclude?: string[];
  assignee?: string;
}

export async function syncObsidianVault(options: SyncObsidianVaultOptions): Promise<WorkItem[]> {
  const vaultPath = path.resolve(options.vaultPath);
  const files = await listMarkdownFiles(vaultPath);
  const selectedFiles = files.filter((filePath) => shouldInclude(filePath, vaultPath, options));
  const workItems: WorkItem[] = [];

  for (const filePath of selectedFiles) {
    const [content, stats] = await Promise.all([fs.readFile(filePath, "utf8"), fs.stat(filePath)]);
    const parseOptions = {
      vaultPath,
      filePath,
      content,
      updatedAt: stats.mtime
    };
    workItems.push(
      ...parseObsidianTasks(options.assignee ? { ...parseOptions, assignee: options.assignee } : parseOptions)
    );
  }

  return workItems;
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".obsidian" || entry.name === ".git") {
        continue;
      }
      files.push(...(await listMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function shouldInclude(filePath: string, vaultPath: string, options: SyncObsidianVaultOptions): boolean {
  const relativePath = path.relative(vaultPath, filePath).split(path.sep).join("/");
  const include = options.include ?? ["**/*.md"];
  const exclude = options.exclude ?? [];

  const included = include.some((pattern) => minimatch(relativePath, pattern, { dot: false }));
  const excluded = exclude.some((pattern) => minimatch(relativePath, pattern, { dot: false }));
  return included && !excluded;
}
