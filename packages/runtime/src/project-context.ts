import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { WorkCueConfig } from "@workcue/config";
import type { WorkItem, WorkItemProjectContext } from "@workcue/core";

const execFileAsync = promisify(execFile);

const DEFAULT_BRANCHES = new Set(["main", "master", "trunk"]);
const DEFAULT_MAX_SCAN_FILES = 500;
const MAX_TEXT_BYTES = 256 * 1024;
const SKIP_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".turbo",
  ".workcue",
  "_workspace",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target"
]);
const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".md",
  ".mdx",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);
const MANIFEST_FILES = new Set([
  "Cargo.toml",
  "Dockerfile",
  "go.mod",
  "package.json",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "requirements.txt",
  "tsconfig.json"
]);
const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "github",
  "this",
  "that",
  "into",
  "jira",
  "linear",
  "notion",
  "obsidian",
  "todo",
  "task",
  "work",
  "review",
  "finish",
  "issue",
  "bug",
  "cleanup",
  "current",
  "customer",
  "daily",
  "design",
  "feedback",
  "fix",
  "issue",
  "issues",
  "navigation",
  "note",
  "project",
  "release",
  "settings",
  "sprint",
  "waiting"
]);

export type ProjectConfig = WorkCueConfig["projects"][number];

export interface ProjectContextSummary {
  projectId: string;
  projectName?: string;
  repoName?: string;
  repoSlug?: string;
  currentBranch?: string;
  defaultBranch?: string;
  isDirty?: boolean;
  changedFiles: string[];
  recentCommitSubjects: string[];
  manifestFiles: string[];
  docFiles: string[];
  todoFiles: string[];
  todoCount: number;
  matchKeywords: string[];
  matchLabels: string[];
  sourceUrlPrefixes: string[];
  scanError?: string;
}

export interface CollectProjectContextsOptions {
  maxScanFiles?: number;
  projects: ProjectConfig[];
}

export async function collectProjectContexts(options: CollectProjectContextsOptions): Promise<ProjectContextSummary[]> {
  const summaries: ProjectContextSummary[] = [];
  for (const project of options.projects) {
    summaries.push(await scanProject(project, options.maxScanFiles ?? DEFAULT_MAX_SCAN_FILES));
  }
  return summaries;
}

export function enrichWorkItemsWithProjectContexts(
  items: WorkItem[],
  contexts: ProjectContextSummary[]
): WorkItem[] {
  if (contexts.length === 0) {
    return items;
  }
  return items.map((item) => {
    const matches = contexts
      .map((context) => matchProjectContext(item, context))
      .filter((context): context is WorkItemProjectContext => Boolean(context));

    if (matches.length === 0) {
      return item;
    }
    return {
      ...item,
      projectContexts: [...(item.projectContexts ?? []), ...matches]
    };
  });
}

export function serializeProjectContextSummary(context: ProjectContextSummary): Record<string, unknown> {
  return {
    projectId: context.projectId,
    ...(context.projectName ? { projectName: context.projectName } : {}),
    ...(context.repoName ? { repoName: context.repoName } : {}),
    ...(context.repoSlug ? { repoSlug: context.repoSlug } : {}),
    ...(context.currentBranch ? { currentBranch: context.currentBranch } : {}),
    ...(context.defaultBranch ? { defaultBranch: context.defaultBranch } : {}),
    ...(typeof context.isDirty === "boolean" ? { isDirty: context.isDirty } : {}),
    changedFileCount: context.changedFiles.length,
    recentCommitSubjects: context.recentCommitSubjects.slice(0, 5),
    manifestFiles: context.manifestFiles.slice(0, 10),
    docFiles: context.docFiles.slice(0, 10),
    todoFiles: context.todoFiles.slice(0, 10),
    todoCount: context.todoCount,
    ...(context.scanError ? { scanError: context.scanError } : {})
  };
}

async function scanProject(project: ProjectConfig, maxScanFiles: number): Promise<ProjectContextSummary> {
  const configuredRemote = project.repo.remoteUrl;
  const configuredPath = project.repo.localPath;
  const configuredSlug = configuredRemote ? extractRepoSlug(configuredRemote) : undefined;
  const summary: ProjectContextSummary = {
    projectId: project.id,
    changedFiles: [],
    recentCommitSubjects: [],
    manifestFiles: [],
    docFiles: [],
    todoFiles: [],
    todoCount: 0,
    matchKeywords: project.match.keywords.map(normalizeTerm).filter(Boolean),
    matchLabels: project.match.labels.map(normalizeTerm).filter(Boolean),
    sourceUrlPrefixes: project.match.sourceUrls
  };

  if (project.name) {
    summary.projectName = project.name;
  }
  if (project.repo.defaultBranch) {
    summary.defaultBranch = project.repo.defaultBranch;
  }
  if (configuredSlug) {
    summary.repoSlug = configuredSlug;
    const repoName = configuredSlug.split("/").at(-1);
    if (repoName) {
      summary.repoName = repoName;
    }
  }

  if (!configuredPath) {
    return summary;
  }

  const resolvedPath = path.resolve(configuredPath);
  if (!(await canAccess(resolvedPath))) {
    summary.scanError = "local path not accessible";
    return summary;
  }

  const gitRoot = await readGitOutput(resolvedPath, ["rev-parse", "--show-toplevel"]);
  const repoRoot = gitRoot ? path.resolve(gitRoot) : resolvedPath;
  const gitRemote = configuredRemote ?? (await readGitOutput(repoRoot, ["remote", "get-url", "origin"]));
  const gitSlug = gitRemote ? extractRepoSlug(gitRemote) : undefined;
  if (gitSlug) {
    summary.repoSlug = gitSlug;
    const repoName = gitSlug.split("/").at(-1);
    if (repoName) {
      summary.repoName = repoName;
    }
  } else {
    summary.repoName = path.basename(repoRoot);
  }

  const branch = await readGitOutput(repoRoot, ["branch", "--show-current"]);
  if (branch) {
    summary.currentBranch = branch;
  }
  const status = await readGitOutput(repoRoot, ["status", "--short"]);
  if (status) {
    summary.changedFiles = parseGitStatusFiles(status);
    summary.isDirty = summary.changedFiles.length > 0;
  } else {
    summary.isDirty = false;
  }
  const commitLog = await readGitOutput(repoRoot, ["log", "-8", "--pretty=format:%s"]);
  if (commitLog) {
    summary.recentCommitSubjects = commitLog
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  const files = await collectRepoFiles(repoRoot, maxScanFiles);
  summary.manifestFiles = files.filter((file) => MANIFEST_FILES.has(path.basename(file))).slice(0, 20);
  summary.docFiles = files.filter(isDocFile).slice(0, 20);
  const todoResult = await scanTodoMarkers(repoRoot, files);
  summary.todoFiles = todoResult.files;
  summary.todoCount = todoResult.count;
  return summary;
}

function matchProjectContext(item: WorkItem, context: ProjectContextSummary): WorkItemProjectContext | undefined {
  const terms = buildWorkItemTerms(item);
  const signals = new Set<string>();
  const matchedTerms = new Set<string>();
  const matchedFiles = new Set<string>();

  if (item.sourceUrl && matchesSourceUrl(item.sourceUrl, context)) {
    signals.add("source_url");
  }

  const projectTerms = buildProjectTerms(context);
  for (const term of projectTerms) {
    if (term && terms.has(term)) {
      signals.add("project_keyword");
      matchedTerms.add(term);
    }
  }

  const branch = normalizeTerm(context.currentBranch ?? "");
  if (branch && termSetMatchesText(terms, branch)) {
    signals.add("active_branch");
    for (const term of terms) {
      if (branch.includes(term)) {
        matchedTerms.add(term);
      }
    }
  } else if (
    context.currentBranch &&
    !DEFAULT_BRANCHES.has(context.currentBranch) &&
    signals.has("source_url")
  ) {
    signals.add("active_branch");
  }

  for (const subject of context.recentCommitSubjects) {
    const normalized = normalizeTerm(subject);
    if (termSetMatchesText(terms, normalized)) {
      signals.add("recent_commit");
      for (const term of terms) {
        if (normalized.includes(term)) {
          matchedTerms.add(term);
        }
      }
    }
  }

  if (signals.has("source_url") && context.isDirty) {
    signals.add("dirty_worktree");
  }

  for (const file of context.changedFiles) {
    const normalized = normalizeTerm(file);
    if (termSetMatchesText(terms, normalized)) {
      signals.add("changed_file");
      matchedFiles.add(file);
    }
  }

  for (const file of context.todoFiles) {
    const normalized = normalizeTerm(file);
    if (termSetMatchesText(terms, normalized)) {
      signals.add("todo_marker");
      matchedFiles.add(file);
    }
  }

  if (signals.size === 0) {
    return undefined;
  }

  const match: WorkItemProjectContext = {
    projectId: context.projectId,
    signals: [...signals].sort(),
    matchedTerms: [...matchedTerms].sort(),
    matchedFiles: [...matchedFiles].sort(),
    recentCommitSubjects: context.recentCommitSubjects.slice(0, 5),
    manifestFiles: context.manifestFiles.slice(0, 10),
    docFiles: context.docFiles.slice(0, 10),
    todoFiles: context.todoFiles.slice(0, 10),
    todoCount: context.todoCount
  };
  if (context.projectName) {
    match.projectName = context.projectName;
  }
  if (context.repoName) {
    match.repoName = context.repoName;
  }
  if (context.currentBranch) {
    match.currentBranch = context.currentBranch;
  }
  if (context.defaultBranch) {
    match.defaultBranch = context.defaultBranch;
  }
  if (typeof context.isDirty === "boolean") {
    match.isDirty = context.isDirty;
  }
  if (context.changedFiles.length > 0) {
    match.changedFileCount = context.changedFiles.length;
  }
  return match;
}

function buildWorkItemTerms(item: WorkItem): Set<string> {
  const values = [
    item.sourceId,
    item.title,
    item.body,
    item.project,
    item.milestone,
    item.sprint,
    ...item.labels
  ].filter((value): value is string => Boolean(value));

  const terms = new Set<string>();
  for (const value of values) {
    for (const term of extractTerms(value)) {
      terms.add(term);
    }
  }
  return terms;
}

function buildProjectTerms(context: ProjectContextSummary): Set<string> {
  const values = [
    context.projectId,
    context.projectName,
    context.repoName && context.repoName.length >= 4 ? context.repoName : undefined,
    ...context.matchKeywords,
    ...context.matchLabels
  ].filter((value): value is string => Boolean(value));
  const terms = new Set<string>();
  for (const value of values) {
    for (const term of extractTerms(value)) {
      terms.add(term);
    }
  }
  return terms;
}

function matchesSourceUrl(sourceUrl: string, context: ProjectContextSummary): boolean {
  if (context.sourceUrlPrefixes.some((prefix) => sourceUrl.startsWith(prefix))) {
    return true;
  }
  if (!context.repoSlug) {
    return false;
  }
  return extractRepoSlug(sourceUrl) === context.repoSlug;
}

function extractTerms(value: string): string[] {
  const normalized = normalizeTerm(value);
  const terms = new Set<string>();
  const issueKeys = value.match(/[A-Z][A-Z0-9]+-\d+/g) ?? [];
  for (const key of issueKeys) {
    terms.add(key.toLowerCase());
  }
  const references = value.match(/#\d+/g) ?? [];
  for (const reference of references) {
    terms.add(reference.toLowerCase());
    terms.add(reference.slice(1));
  }
  for (const chunk of normalized.split(/[^a-z0-9가-힣]+/u)) {
    if ((chunk.length >= 4 || /[가-힣]{2,}/u.test(chunk)) && !STOP_WORDS.has(chunk)) {
      terms.add(chunk);
    }
  }
  return [...terms];
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

function termSetMatchesText(terms: Set<string>, text: string): boolean {
  for (const term of terms) {
    if (term.length >= 3 && text.includes(term)) {
      return true;
    }
  }
  return false;
}

function extractRepoSlug(value: string): string | undefined {
  const trimmed = value.trim().replace(/\.git$/u, "");
  const sshMatch = trimmed.match(/github\.com[:/]([^/\s]+\/[^/\s?#]+)/iu);
  if (sshMatch?.[1]) {
    return sshMatch[1].toLowerCase();
  }
  try {
    const url = new URL(trimmed);
    if (url.hostname !== "github.com") {
      return undefined;
    }
    const segments = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments.length >= 2 && segments[0] && segments[1]) {
      return `${segments[0]}/${segments[1]}`.toLowerCase().replace(/\.git$/u, "");
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function parseGitStatusFiles(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((file) => file.replace(/^"|"$/gu, ""))
    .slice(0, 50);
}

async function readGitOutput(cwd: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], {
      maxBuffer: 1024 * 1024
    });
    const value = stdout.trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

async function canAccess(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function collectRepoFiles(root: string, maxFiles: number): Promise<string[]> {
  const files: string[] = [];
  async function visit(relativeDir: string): Promise<void> {
    if (files.length >= maxFiles) {
      return;
    }
    const absoluteDir = path.join(root, relativeDir);
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true, encoding: "utf8" });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) {
        return;
      }
      if (entry.name.startsWith(".") && entry.name !== ".github") {
        continue;
      }
      if (entry.name.startsWith("_workspace")) {
        continue;
      }
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) {
          await visit(relativePath);
        }
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await visit("");
  return files.sort();
}

function isDocFile(file: string): boolean {
  const normalized = file.toLowerCase();
  return normalized === "readme.md" || normalized === "changelog.md" || normalized.startsWith("docs/");
}

async function scanTodoMarkers(root: string, files: string[]): Promise<{ count: number; files: string[] }> {
  let count = 0;
  const todoFiles: string[] = [];
  for (const file of files) {
    if (!isTextFile(file)) {
      continue;
    }
    const absolutePath = path.join(root, file);
    let fileStat: Awaited<ReturnType<typeof stat>>;
    try {
      fileStat = await stat(absolutePath);
    } catch {
      continue;
    }
    if (fileStat.size > MAX_TEXT_BYTES) {
      continue;
    }
    let content: string;
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
      if (/\b(TODO|FIXME|XXX)\b/iu.test(line)) {
        count += 1;
        todoFiles.push(`${file}:${index + 1}`);
      }
    }
  }
  return {
    count,
    files: todoFiles.slice(0, 50)
  };
}

function isTextFile(file: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());
}
