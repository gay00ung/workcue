import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { WorkCueConfigSchema, type WorkCueConfig } from "./schema.js";

export interface InitConfigOptions {
  obsidianVault?: string;
  markdownOutput?: string;
  dailyNote?: string;
}

export function defaultConfigPath(): string {
  return path.join(os.homedir(), ".workcue", "config.yml");
}

export async function loadConfig(configPath = defaultConfigPath()): Promise<WorkCueConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = YAML.parse(raw) as unknown;
  return WorkCueConfigSchema.parse(parsed);
}

export async function writeConfig(configPath: string, config: WorkCueConfig): Promise<void> {
  await fs.mkdir(path.dirname(path.resolve(configPath)), { recursive: true });
  await fs.writeFile(configPath, `${YAML.stringify(config).trim()}\n`, "utf8");
}

export function createInitialConfig(options: InitConfigOptions = {}): WorkCueConfig {
  return WorkCueConfigSchema.parse({
    version: 1,
    timezone: "UTC",
    brief: {
      topFocusItems: 3
    },
    user: {
      handles: ["you"]
    },
    sources: {
      obsidian: {
        enabled: Boolean(options.obsidianVault),
        vaultPath: options.obsidianVault ?? "/path/to/obsidian-vault",
        include: ["**/*.md"],
        exclude: ["Archive/**"]
      }
    },
    outputs: {
      markdown: {
        enabled: Boolean(options.markdownOutput),
        path: options.markdownOutput ?? "./briefs/{{date}}.md"
      },
      dailyNote: {
        enabled: Boolean(options.dailyNote),
        path: options.dailyNote ?? "/path/to/obsidian-vault/Daily/{{date}}.md"
      }
    }
  });
}

export function expandDateTemplate(value: string | undefined, date: string): string | undefined {
  return value?.replaceAll("{{date}}", date);
}
