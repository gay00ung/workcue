import { promises as fs } from "node:fs";
import path from "node:path";

export interface WriteMarkdownFileOptions {
  outputPath: string;
  content: string;
}

export interface UpsertDailyNoteOptions {
  notePath: string;
  content: string;
  heading?: string;
}

const START_MARKER = "<!-- workcue:start -->";
const END_MARKER = "<!-- workcue:end -->";

export async function writeMarkdownFile(options: WriteMarkdownFileOptions): Promise<void> {
  await fs.mkdir(path.dirname(path.resolve(options.outputPath)), { recursive: true });
  await fs.writeFile(options.outputPath, options.content, "utf8");
}

export async function upsertDailyNoteSection(options: UpsertDailyNoteOptions): Promise<void> {
  const notePath = path.resolve(options.notePath);
  await fs.mkdir(path.dirname(notePath), { recursive: true });

  const existing = await readIfExists(notePath);
  const next = upsertWorkCueSection(existing, options.content, options.heading ?? "WorkCue");
  await fs.writeFile(notePath, next, "utf8");
}

export function upsertWorkCueSection(existing: string, content: string, heading = "WorkCue"): string {
  const block = buildManagedBlock(content);
  const start = existing.indexOf(START_MARKER);
  const end = existing.indexOf(END_MARKER);

  if (start >= 0 && end > start) {
    const before = existing.slice(0, start).trimEnd();
    const after = existing.slice(end + END_MARKER.length).trimStart();
    return joinDocumentParts([before, block, after]);
  }

  const headingBlock = `## ${heading}\n\n${block}`;
  return joinDocumentParts([existing.trimEnd(), headingBlock]);
}

function buildManagedBlock(content: string): string {
  return `${START_MARKER}\n${content.trim()}\n${END_MARKER}`;
}

function joinDocumentParts(parts: string[]): string {
  return `${parts.filter((part) => part.length > 0).join("\n\n").trim()}\n`;
}

async function readIfExists(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      return "";
    }
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
