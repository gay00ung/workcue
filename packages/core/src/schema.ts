import { z } from "zod";

export const WorkItemStatusSchema = z.enum([
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "waiting",
  "done",
  "cancelled",
  "unknown"
]);

export const WorkItemSourceSchema = z.enum([
  "github",
  "jira",
  "obsidian",
  "notion",
  "linear",
  "affine",
  "taskwarrior",
  "manual"
]);

export const WorkItemPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const WorkItemSchema = z.object({
  id: z.string().min(1),
  source: WorkItemSourceSchema,
  sourceId: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  status: WorkItemStatusSchema,
  assignees: z.array(z.string()),
  requestedReviewers: z.array(z.string()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  priority: WorkItemPrioritySchema.optional(),
  labels: z.array(z.string()),
  project: z.string().optional(),
  milestone: z.string().optional(),
  sprint: z.string().optional(),
  estimateMinutes: z.number().int().positive().optional(),
  parentId: z.string().optional(),
  blockedBy: z.array(z.string()).optional(),
  blocking: z.array(z.string()).optional(),
  raw: z.unknown().optional()
});

export const SignalKindSchema = z.enum([
  "due_soon",
  "overdue",
  "assigned_to_me",
  "review_requested",
  "current_sprint",
  "high_priority",
  "stale",
  "recent_mention",
  "blocking_others",
  "blocked",
  "waiting_external",
  "quick_win",
  "deep_work"
]);

export const SignalSchema = z.object({
  id: z.string().min(1),
  workItemId: z.string().min(1),
  kind: SignalKindSchema,
  weight: z.number(),
  confidence: z.number().min(0).max(1),
  message: z.string().min(1),
  evidence: z.record(z.unknown()).optional()
});

export const RecommendationModeSchema = z.enum([
  "focus",
  "quick_win",
  "review",
  "follow_up",
  "planning"
]);

export const RecommendationSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  workItem: WorkItemSchema,
  rank: z.number().int().positive(),
  score: z.number(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(SignalSchema),
  suggestedAction: z.string().min(1),
  estimatedMinutes: z.number().int().positive().optional(),
  mode: RecommendationModeSchema.optional()
});

export const BriefSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  generatedAt: z.string().datetime(),
  timezone: z.string(),
  focus: z.array(RecommendationSchema),
  watchlist: z.array(RecommendationSchema),
  notToday: z.array(RecommendationSchema),
  summary: z.string()
});

export type WorkItemStatus = z.infer<typeof WorkItemStatusSchema>;
export type WorkItemSource = z.infer<typeof WorkItemSourceSchema>;
export type WorkItemPriority = z.infer<typeof WorkItemPrioritySchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type SignalKind = z.infer<typeof SignalKindSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type RecommendationMode = z.infer<typeof RecommendationModeSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type Brief = z.infer<typeof BriefSchema>;
