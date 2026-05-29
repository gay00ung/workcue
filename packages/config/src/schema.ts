import { z } from "zod";

export const LlmProviderSchema = z.enum(["openai-compatible", "ollama"]);

export const WorkCueConfigSchema = z.object({
  version: z.literal(1),
  timezone: z.string().default("UTC"),
  brief: z
    .object({
      topFocusItems: z.number().int().positive().default(3)
    })
    .default({}),
  scoring: z
    .object({
      signalWeights: z.record(z.number().nonnegative()).default({})
    })
    .default({}),
  user: z
    .object({
      handles: z.array(z.string()).default(["you"])
    })
    .default({}),
  sources: z
    .object({
      github: z
        .object({
          enabled: z.boolean().default(false),
          tokenEnv: z.string().default("GITHUB_TOKEN"),
          owner: z.string().optional(),
          repos: z.array(z.string()).default([]),
          user: z.string().optional()
        })
        .default({}),
      jira: z
        .object({
          enabled: z.boolean().default(false),
          baseUrl: z.string().optional(),
          emailEnv: z.string().default("JIRA_EMAIL"),
          tokenEnv: z.string().default("JIRA_API_TOKEN"),
          jql: z.array(z.string()).default(["assignee = currentUser() AND statusCategory != Done"]),
          fieldMap: z
            .object({
              sprint: z.string().optional(),
              storyPoints: z.string().optional()
            })
            .default({})
        })
        .default({}),
      notion: z
        .object({
          enabled: z.boolean().default(false),
          tokenEnv: z.string().default("NOTION_TOKEN"),
          boards: z
            .array(
              z.object({
                id: z.string().optional(),
                url: z.string().optional(),
                databaseId: z.string().optional(),
                dataSourceId: z.string().optional(),
                name: z.string().optional(),
                titleProperty: z.string().optional(),
                statusProperty: z.string().optional(),
                dueProperty: z.string().optional(),
                priorityProperty: z.string().optional(),
                assigneeProperty: z.string().optional(),
                projectProperty: z.string().optional(),
                labelsProperty: z.string().optional(),
                estimateProperty: z.string().optional()
              })
            )
            .default([])
        })
        .default({}),
      obsidian: z
        .object({
          enabled: z.boolean().default(false),
          vaultPath: z.string().optional(),
          include: z.array(z.string()).default(["**/*.md"]),
          exclude: z.array(z.string()).default(["Archive/**"])
        })
        .default({})
    })
    .default({}),
  outputs: z
    .object({
      markdown: z
        .object({
          enabled: z.boolean().default(false),
          path: z.string().optional()
        })
        .default({}),
      dailyNote: z
        .object({
          enabled: z.boolean().default(false),
          path: z.string().optional()
        })
        .default({})
    })
    .default({}),
  cache: z
    .object({
      sqlite: z
        .object({
          enabled: z.boolean().default(false),
          path: z.string().default(".workcue/workcue.sqlite")
        })
        .default({})
    })
    .default({}),
  llm: z
    .object({
      enabled: z.boolean().default(false),
      provider: LlmProviderSchema.default("openai-compatible"),
      baseUrl: z.string().default("http://localhost:11434"),
      model: z.string().default("model-name"),
      apiKeyEnv: z.string().default("OPENAI_API_KEY")
    })
    .default({})
});

export type WorkCueConfig = z.infer<typeof WorkCueConfigSchema>;
export type LlmProvider = z.infer<typeof LlmProviderSchema>;
