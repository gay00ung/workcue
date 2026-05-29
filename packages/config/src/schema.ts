import { z } from "zod";

export const WorkCueConfigSchema = z.object({
  version: z.literal(1),
  timezone: z.string().default("UTC"),
  brief: z
    .object({
      topFocusItems: z.number().int().positive().default(3)
    })
    .default({}),
  user: z
    .object({
      handles: z.array(z.string()).default(["you"])
    })
    .default({}),
  sources: z
    .object({
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
    .default({})
});

export type WorkCueConfig = z.infer<typeof WorkCueConfigSchema>;
