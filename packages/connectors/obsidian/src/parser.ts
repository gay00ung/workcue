import path from "node:path";
import type { WorkItem, WorkItemPriority } from "@workcue/core";

export interface ParseObsidianTasksOptions {
  vaultPath: string;
  filePath: string;
  content: string;
  updatedAt?: Date;
  assignee?: string;
}

interface TaskLine {
  lineNumber: number;
  text: string;
}

const UNCHECKED_TASK_RE = /^\s*[-*+]\s+\[\s\]\s+(?<text>.+)$/;
const CHECKED_TASK_RE = /^\s*[-*+]\s+\[[xX]\]\s+.+$/;
const DUE_EMOJI_RE = /📅\s*(?<date>\d{4}-\d{2}-\d{2})/u;
const DUE_INLINE_RE = /\[(?:due|date)::\s*(?<date>\d{4}-\d{2}-\d{2})\]/iu;
const PRIORITY_INLINE_RE = /\[priority::\s*(?<priority>urgent|high|medium|low)\]/iu;
const TAG_RE = /(^|\s)#(?<tag>[A-Za-z0-9_/-]+)/g;

export function parseObsidianTasks(options: ParseObsidianTasksOptions): WorkItem[] {
  return findTaskLines(options.content).map((task) => toWorkItem(task, options));
}

function findTaskLines(content: string): TaskLine[] {
  const lines = content.split(/\r?\n/);
  const tasks: TaskLine[] = [];

  lines.forEach((line, index) => {
    if (CHECKED_TASK_RE.test(line)) {
      return;
    }
    const match = line.match(UNCHECKED_TASK_RE);
    if (match?.groups?.text) {
      tasks.push({ lineNumber: index + 1, text: match.groups.text.trim() });
    }
  });

  return tasks;
}

function toWorkItem(task: TaskLine, options: ParseObsidianTasksOptions): WorkItem {
  const relativePath = path.relative(options.vaultPath, options.filePath).split(path.sep).join("/");
  const sourceId = `${relativePath}:${task.lineNumber}`;
  const labels = extractTags(task.text);
  const dueAt = extractDueDate(task.text);
  const priority = extractPriority(task.text);
  const cleanedTitle = cleanTaskText(task.text);

  return {
    id: `obsidian:${sourceId}`,
    source: "obsidian",
    sourceId,
    title: cleanedTitle,
    status: labels.includes("waiting") ? "waiting" : "todo",
    assignees: options.assignee ? [options.assignee] : [],
    updatedAt: options.updatedAt?.toISOString(),
    dueAt,
    priority,
    labels,
    estimateMinutes: extractEstimateMinutes(task.text)
  };
}

function extractDueDate(text: string): string | undefined {
  const emojiDate = text.match(DUE_EMOJI_RE)?.groups?.date;
  const inlineDate = text.match(DUE_INLINE_RE)?.groups?.date;
  const date = emojiDate ?? inlineDate;
  return date ? `${date}T00:00:00.000Z` : undefined;
}

function extractPriority(text: string): WorkItemPriority | undefined {
  if (text.includes("⏫")) {
    return "urgent";
  }
  if (text.includes("🔼")) {
    return "high";
  }
  if (text.includes("🔽") || text.includes("⏬")) {
    return "low";
  }

  const inline = text.match(PRIORITY_INLINE_RE)?.groups?.priority?.toLowerCase();
  if (inline === "urgent" || inline === "high" || inline === "medium" || inline === "low") {
    return inline;
  }
  return undefined;
}

function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(TAG_RE)) {
    if (match.groups?.tag) {
      tags.add(match.groups.tag.toLowerCase());
    }
  }
  return [...tags];
}

function extractEstimateMinutes(text: string): number | undefined {
  const match = text.match(/\[(?:estimate|est)::\s*(?<minutes>\d+)\s*(?:m|min|minutes)?\]/iu);
  if (!match?.groups?.minutes) {
    return undefined;
  }
  return Number.parseInt(match.groups.minutes, 10);
}

function cleanTaskText(text: string): string {
  return text
    .replace(DUE_EMOJI_RE, "")
    .replace(DUE_INLINE_RE, "")
    .replace(PRIORITY_INLINE_RE, "")
    .replace(/\[(?:estimate|est)::\s*\d+\s*(?:m|min|minutes)?\]/giu, "")
    .replace(/[⏫🔼🔽⏬]/gu, "")
    .replace(TAG_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}
