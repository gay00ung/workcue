import type { Brief } from "@workcue/core";

export type LlmProvider = "ollama" | "openai-compatible";
export type LlmFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface GenerateBriefSummaryOptions {
  baseUrl: string;
  brief: Brief;
  fetcher?: LlmFetch;
  model: string;
  provider: LlmProvider;
  apiKey?: string;
}

interface OpenAiCompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

export async function generateBriefSummary(options: GenerateBriefSummaryOptions): Promise<string> {
  if (options.provider === "ollama") {
    return generateOllamaSummary(options);
  }
  return generateOpenAiCompatibleSummary(options);
}

async function generateOpenAiCompatibleSummary(options: GenerateBriefSummaryOptions): Promise<string> {
  const response = await requestJson(options, "/v1/chat/completions", {
    model: options.model,
    messages: buildMessages(options.brief),
    temperature: 0.2
  });
  const parsed = response as OpenAiCompatibleResponse;
  const content = parsed.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM provider returned an empty summary.");
  }
  return content;
}

async function generateOllamaSummary(options: GenerateBriefSummaryOptions): Promise<string> {
  const response = await requestJson(options, "/api/chat", {
    model: options.model,
    messages: buildMessages(options.brief),
    stream: false
  });
  const parsed = response as OllamaChatResponse;
  const content = parsed.message?.content?.trim();
  if (!content) {
    throw new Error("Ollama returned an empty summary.");
  }
  return content;
}

async function requestJson(options: GenerateBriefSummaryOptions, pathname: string, body: unknown): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (options.apiKey) {
    headers.authorization = `Bearer ${options.apiKey}`;
  }

  const response = await fetcher(new URL(pathname, normalizeBaseUrl(options.baseUrl)), {
    body: JSON.stringify(body),
    headers,
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`LLM provider request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function buildMessages(brief: Brief): Array<{ role: "system" | "user"; content: string }> {
  return [
    {
      role: "system",
      content:
        "You summarize deterministic work recommendations. Keep the summary short, factual, and evidence-based. Do not invent tasks."
    },
    {
      role: "user",
      content: [
        `Date: ${brief.date}`,
        "Focus items:",
        ...brief.focus.map(
          (item) =>
            `- ${item.workItem.title} | score=${item.score} | reasons=${item.reasons
              .slice(0, 3)
              .map((reason) => reason.message)
              .join("; ")}`
        ),
        "Return one concise paragraph."
      ].join("\n")
    }
  ];
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
