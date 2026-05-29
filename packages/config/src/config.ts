import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { WorkCueConfigSchema, type WorkCueConfig } from "./schema.js";

export interface InitConfigOptions {
  obsidianVault?: string;
  markdownOutput?: string;
  dailyNote?: string;
  notionBoard?: string;
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
    scoring: {
      signalWeights: {}
    },
    user: {
      handles: ["you"]
    },
    sources: {
      github: {
        enabled: false,
        tokenEnv: "GITHUB_TOKEN",
        owner: "owner",
        repos: ["repo"],
        user: "you"
      },
      jira: {
        enabled: false,
        baseUrl: "https://your-domain.atlassian.net",
        emailEnv: "JIRA_EMAIL",
        tokenEnv: "JIRA_API_TOKEN",
        jql: ["assignee = currentUser() AND statusCategory != Done"],
        fieldMap: {}
      },
      notion: {
        enabled: Boolean(options.notionBoard),
        tokenEnv: "NOTION_TOKEN",
        boards: options.notionBoard
          ? [
              {
                url: options.notionBoard,
                titleProperty: "Name",
                statusProperty: "Status",
                dueProperty: "Due",
                priorityProperty: "Priority",
                assigneeProperty: "Owner",
                projectProperty: "Project",
                labelsProperty: "Tags",
                estimateProperty: "Estimate"
              }
            ]
          : []
      },
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
    },
    cache: {
      sqlite: {
        enabled: true,
        path: ".workcue/workcue.sqlite"
      }
    },
    llm: {
      enabled: false,
      provider: "openai-compatible",
      baseUrl: "http://localhost:11434",
      model: "model-name",
      apiKeyEnv: "OPENAI_API_KEY"
    }
  });
}

export function expandDateTemplate(value: string | undefined, date: string): string | undefined {
  return value?.replaceAll("{{date}}", date);
}
