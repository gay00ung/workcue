import { describe, expect, it } from "vitest";
import { createBrief } from "@workcue/core";
import { buildDemoWorkItems } from "@workcue/core";
import { generateBriefSummary, type LlmFetch } from "./index.js";

describe("generateBriefSummary", () => {
  it("calls OpenAI-compatible chat completions", async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher: LlmFetch = async (input, init) => {
      const call: { input: string; init?: RequestInit } = { input: String(input) };
      if (init) {
        call.init = init;
      }
      calls.push(call);
      return new Response(JSON.stringify({ choices: [{ message: { content: "Review the payment PR first." } }] }), {
        status: 200
      });
    };

    const summary = await generateBriefSummary({
      baseUrl: "https://llm.example",
      brief: createBrief(buildDemoWorkItems("2026-05-29"), { date: "2026-05-29" }),
      fetcher,
      model: "model-name",
      provider: "openai-compatible",
      apiKey: "test-key"
    });

    expect(summary).toBe("Review the payment PR first.");
    expect(calls[0]?.input).toBe("https://llm.example/v1/chat/completions");
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer test-key"
    });
  });

  it("calls Ollama chat API", async () => {
    const fetcher: LlmFetch = async () =>
      new Response(JSON.stringify({ message: { content: "로컬 모델 요약" } }), {
        status: 200
      });

    await expect(
      generateBriefSummary({
        baseUrl: "http://localhost:11434",
        brief: createBrief(buildDemoWorkItems("2026-05-29"), { date: "2026-05-29" }),
        fetcher,
        model: "llama",
        provider: "ollama"
      })
    ).resolves.toBe("로컬 모델 요약");
  });
});
