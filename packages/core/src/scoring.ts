import type { Recommendation, RecommendationMode, Signal, SignalKind, WorkItem } from "./schema.js";

export interface ScoreOptions {
  date: string;
  signalWeights?: Partial<Record<SignalKind, number>>;
  userHandles?: string[];
  topFocusItems?: number;
}

interface ScoreBreakdown {
  score: number;
  confidence: number;
  signals: Signal[];
  mode: RecommendationMode;
  suggestedAction: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function rankWorkItems(items: WorkItem[], options: ScoreOptions): Recommendation[] {
  const scored = items
    .filter((item) => item.status !== "done" && item.status !== "cancelled")
    .map((item) => ({ item, breakdown: scoreWorkItem(item, options) }))
    .sort((left, right) => {
      if (right.breakdown.score !== left.breakdown.score) {
        return right.breakdown.score - left.breakdown.score;
      }
      return left.item.title.localeCompare(right.item.title);
    });

  return scored.map(({ item, breakdown }, index) => ({
    id: `${options.date}:${item.id}`,
    date: options.date,
    workItem: item,
    rank: index + 1,
    score: Math.round(breakdown.score),
    confidence: breakdown.confidence,
    reasons: breakdown.signals,
    suggestedAction: breakdown.suggestedAction,
    estimatedMinutes: item.estimateMinutes,
    mode: breakdown.mode
  }));
}

function scoreWorkItem(item: WorkItem, options: ScoreOptions): ScoreBreakdown {
  const signals: Signal[] = [];
  const today = parseDateOnly(options.date);

  const addSignal = (
    kind: Signal["kind"],
    weight: number,
    message: string,
    evidence?: Record<string, unknown>
  ) => {
    const multiplier = options.signalWeights?.[kind] ?? 1;
    const weightedValue = weight * multiplier;
    const signal: Signal = {
      id: `${item.id}:${kind}:${signals.length + 1}`,
      workItemId: item.id,
      kind,
      weight: weightedValue,
      confidence: 0.9,
      message,
      ...(evidence || multiplier !== 1
        ? { evidence: { ...(evidence ?? {}), ...(multiplier !== 1 ? { defaultWeight: weight, multiplier } : {}) } }
        : {})
    };
    signals.push(signal);
  };

  if (item.dueAt) {
    const days = daysBetween(today, new Date(item.dueAt));
    if (days < 0) {
      addSignal("overdue", 90, "마감일이 지났습니다.", { dueAt: item.dueAt, days });
    } else if (days <= 1) {
      addSignal("due_soon", days === 0 ? 100 : 80, days === 0 ? "오늘 마감입니다." : "내일 마감입니다.", {
        dueAt: item.dueAt,
        days
      });
    } else if (days <= 3) {
      addSignal("due_soon", 60, "3일 이내 마감입니다.", { dueAt: item.dueAt, days });
    }
  }

  if (item.priority === "urgent") {
    addSignal("high_priority", 100, "긴급 우선순위입니다.", { priority: item.priority });
  } else if (item.priority === "high") {
    addSignal("high_priority", 75, "높은 우선순위입니다.", { priority: item.priority });
  }

  if (isAssignedToUser(item, options.userHandles)) {
    addSignal("assigned_to_me", 80, "사용자에게 할당된 작업입니다.", { assignees: item.assignees });
  }

  if (isReviewRequested(item, options.userHandles)) {
    addSignal("review_requested", 85, "사용자 리뷰가 요청된 항목입니다.", {
      requestedReviewers: item.requestedReviewers
    });
  }

  if (item.status === "in_progress") {
    addSignal(
      "current_sprint",
      65,
      item.project
        ? `${item.project} 프로젝트에서 이미 진행 중인 작업입니다.`
        : "이미 진행 중인 작업입니다.",
      { status: item.status, ...(item.project ? { project: item.project } : {}) }
    );
  }

  if (item.sprint) {
    addSignal("current_sprint", 60, "현재 스프린트에 포함된 작업입니다.", { sprint: item.sprint });
  }

  if (item.milestone) {
    addSignal("current_sprint", 60, "현재 milestone에 포함된 작업입니다.", { milestone: item.milestone });
  }

  if (item.labels.some((label) => label.toLowerCase() === "production")) {
    addSignal("high_priority", 70, "production 영향이 있는 작업입니다.", { labels: item.labels });
  }

  if (item.blocking && item.blocking.length > 0) {
    addSignal("blocking_others", 80, "다른 작업을 막고 있습니다.", { blocking: item.blocking });
  }

  if (item.updatedAt) {
    const staleDays = daysBetween(new Date(item.updatedAt), today);
    if (staleDays >= 7 && staleDays < 30) {
      addSignal("stale", staleDays >= 14 ? 70 : 50, "오래 방치된 작업입니다.", { staleDays });
    }
  }

  if (item.estimateMinutes && item.estimateMinutes <= 15) {
    addSignal("quick_win", 35, "짧게 처리 가능한 작업입니다.", { estimateMinutes: item.estimateMinutes });
  } else if (item.estimateMinutes && item.estimateMinutes >= 90) {
    addSignal("deep_work", 20, "집중 시간이 필요한 작업입니다.", { estimateMinutes: item.estimateMinutes });
  }

  if (item.status === "blocked") {
    addSignal("blocked", -60, "현재 blocked 상태입니다.", { status: item.status });
  }

  if (item.status === "waiting" || item.labels.some((label) => label.toLowerCase() === "waiting")) {
    addSignal("waiting_external", -40, "외부 응답을 기다리는 작업입니다.", { status: item.status, labels: item.labels });
  }

  const score = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const positiveSignals = signals.filter((signal) => signal.weight > 0).length;
  const confidence = Math.min(0.95, 0.45 + positiveSignals * 0.1);
  const mode = pickMode(item, signals);

  return {
    score,
    confidence,
    signals,
    mode,
    suggestedAction: buildSuggestedAction(item, mode)
  };
}

function pickMode(item: WorkItem, signals: Signal[]): RecommendationMode {
  if (signals.some((signal) => signal.kind === "review_requested") || item.status === "in_review") {
    return "review";
  }
  if (signals.some((signal) => signal.kind === "quick_win")) {
    return "quick_win";
  }
  if (item.source === "obsidian") {
    return "planning";
  }
  return "focus";
}

function buildSuggestedAction(item: WorkItem, mode: RecommendationMode): string {
  if (mode === "review") {
    return "리뷰 요청과 논의 상태를 확인하고 merge를 막는 쟁점을 정리하세요.";
  }
  if (mode === "quick_win") {
    return "15분 안에 끝낼 수 있는 범위로 바로 처리하세요.";
  }
  if (mode === "planning") {
    return "메모에 남은 작업을 실행 가능한 issue나 오늘의 next action으로 정리하세요.";
  }
  if (item.estimateMinutes && item.estimateMinutes >= 90) {
    return "방해받지 않는 집중 시간을 잡고 첫 번째 완료 조건부터 처리하세요.";
  }
  return "오늘 완료 가능한 가장 작은 다음 행동부터 진행하세요.";
}

function isAssignedToUser(item: WorkItem, handles: string[] = []): boolean {
  if (handles.length === 0) {
    return item.assignees.length > 0;
  }
  return item.assignees.some((assignee) => handles.includes(assignee));
}

function isReviewRequested(item: WorkItem, handles: string[] = []): boolean {
  if (!item.requestedReviewers || item.requestedReviewers.length === 0) {
    return false;
  }
  if (handles.length === 0) {
    return true;
  }
  return item.requestedReviewers.some((reviewer) => handles.includes(reviewer));
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function daysBetween(from: Date, to: Date): number {
  const fromDate = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toDate = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((toDate - fromDate) / DAY_MS);
}
