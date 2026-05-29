# WorkCue LLM Summaries

WorkCue is deterministic by default. LLM summaries are optional and disabled unless config enables them.

## Config

OpenAI-compatible endpoint:

```yaml
llm:
  enabled: true
  provider: openai-compatible
  baseUrl: https://api.openai.com
  model: model-name
  apiKeyEnv: OPENAI_API_KEY
```

Ollama:

```yaml
llm:
  enabled: true
  provider: ollama
  baseUrl: http://localhost:11434
  model: llama3.2
```

## Behavior

- WorkCue computes ranking and reasons before calling the LLM.
- The LLM receives only a compact brief prompt with focus item titles, scores, and top reasons.
- The LLM updates the brief summary text.
- If LLM is disabled, the deterministic summary is used.

## Safety

- Config stores `apiKeyEnv`, not the API key value.
- Do not enable remote LLMs for sensitive work unless your data policy allows it.
- Prefer Ollama/local endpoints for private workspaces.
