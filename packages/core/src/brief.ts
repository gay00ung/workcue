import type { Brief, Recommendation, WorkItem } from "./schema.js";
import { rankWorkItems } from "./scoring.js";

export interface BriefOptions {
  date: string;
  timezone?: string;
  topFocusItems?: number;
  userHandles?: string[];
}

export function createBrief(items: WorkItem[], options: BriefOptions): Brief {
  const topFocusItems = options.topFocusItems ?? 3;
  const scoreOptions = {
    date: options.date,
    topFocusItems
  };
  const ranked = rankWorkItems(items, options.userHandles ? { ...scoreOptions, userHandles: options.userHandles } : scoreOptions);

  const focus = ranked.filter((item) => item.score > 0 && !hasNegativeOnlyState(item)).slice(0, topFocusItems);
  const focusIds = new Set(focus.map((item) => item.id));
  const watchlist = ranked
    .filter((item) => !focusIds.has(item.id))
    .filter((item) => item.score > 0 || item.reasons.some((reason) => reason.kind === "waiting_external"))
    .slice(0, 5);
  const notToday = ranked
    .filter((item) => !focusIds.has(item.id))
    .filter((item) => item.score <= 0 || item.reasons.some((reason) => reason.kind === "blocked"))
    .slice(0, 5);

  return {
    id: `brief:${options.date}`,
    date: options.date,
    generatedAt: new Date().toISOString(),
    timezone: options.timezone ?? "UTC",
    focus,
    watchlist,
    notToday,
    summary: buildSummary(focus)
  };
}

export function renderBriefMarkdown(brief: Brief): string {
  const lines: string[] = [
    `# WorkCue Morning Brief - ${brief.date}`,
    "",
    brief.summary,
    "",
    "## Today's Focus",
    ""
  ];

  if (brief.focus.length === 0) {
    lines.push("No focus items found.", "");
  } else {
    lines.push(...renderRecommendations(brief.focus), "");
  }

  lines.push("## Watchlist", "");
  if (brief.watchlist.length === 0) {
    lines.push("No watchlist items.", "");
  } else {
    lines.push(...renderRecommendations(brief.watchlist), "");
  }

  lines.push("## What Not To Do Today", "");
  if (brief.notToday.length === 0) {
    lines.push("No explicit not-today items.", "");
  } else {
    lines.push(...renderRecommendations(brief.notToday), "");
  }

  return `${lines.join("\n").trim()}\n`;
}

function renderRecommendations(recommendations: Recommendation[]): string[] {
  return recommendations.flatMap((recommendation) => {
    const source = recommendation.workItem.sourceUrl
      ? `${recommendation.workItem.source}: ${recommendation.workItem.sourceUrl}`
      : `${recommendation.workItem.source}: ${recommendation.workItem.sourceId}`;

    return [
      `${recommendation.rank}. ${recommendation.workItem.title}`,
      `   Score: ${recommendation.score}`,
      "   Why now:",
      ...recommendation.reasons.slice(0, 4).map((reason) => `   - ${reason.message}`),
      "   Suggested action:",
      `   - ${recommendation.suggestedAction}`,
      "   Source:",
      `   - ${source}`,
      ""
    ];
  });
}

function buildSummary(focus: Recommendation[]): string {
  const top = focus[0];
  if (!top) {
    return "No urgent work was detected from the current inputs.";
  }
  return `Top recommendation: ${top.workItem.title}`;
}

function hasNegativeOnlyState(recommendation: Recommendation): boolean {
  const positive = recommendation.reasons.some((reason) => reason.weight > 0);
  const negative = recommendation.reasons.some((reason) => reason.weight < 0);
  return negative && !positive;
}
