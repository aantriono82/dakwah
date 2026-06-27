import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { preferredAIModels, resolveAiProviderConfig, resolvePublicAiModels } from "./aiConfig";
describe("AI provider config", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("resolves DeepSeek as an OpenAI-compatible provider", () => {
    const config = resolveAiProviderConfig({
      AI_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-v4-pro",
      DEEPSEEK_MODELS: "deepseek-v4-pro, deepseek-v4-flash",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com/v1",
      DEEPSEEK_MAX_TOKENS: "9000",
      DEEPSEEK_TIMEOUT_MS: "90000",
      DEEPSEEK_WEB_SEARCH_ENABLED: "true"
    });

    expect(config.provider).toBe("deepseek");
    expect(config.adapter).toBe("openai-compatible");
    expect(config.apiKey).toBe("deepseek-key");
    expect(config.baseURL).toBe("https://api.deepseek.com/v1");
    expect(config.models).toEqual(["deepseek-v4-pro", "deepseek-v4-flash"]);
    expect(config.maxTokens).toBe(9000);
    expect(config.timeoutMs).toBe(90000);
    expect(config.nativeWebSearchEnabled).toBe(false);
  });

  test("keeps OPENAI_* fallback for OpenAI-compatible providers", () => {
    const config = resolveAiProviderConfig({
      AI_PROVIDER: "deepseek",
      OPENAI_API_KEY: "legacy-key",
      OPENAI_MODEL: "legacy-model",
      OPENAI_BASE_URL: "https://legacy.example/v1"
    });

    expect(config.apiKey).toBe("legacy-key");
    expect(config.model).toBe("legacy-model");
    expect(config.models).toEqual(["legacy-model"]);
    expect(config.baseURL).toBe("https://legacy.example/v1");
  });

  test("uses DeepSeek defaults when provider-specific model is not set", () => {
    const config = resolveAiProviderConfig({
      AI_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "deepseek-key"
    });

    expect(config.model).toBe("deepseek-v4-pro");
    expect(config.models).toEqual(["deepseek-v4-pro"]);
    expect(config.baseURL).toBe("https://api.deepseek.com/v1");
  });

  test("enables native web search only for official OpenAI", () => {
    expect(
      resolveAiProviderConfig({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "openai-key",
        OPENAI_WEB_SEARCH_ENABLED: "true"
      }).nativeWebSearchEnabled
    ).toBe(true);

    expect(
      resolveAiProviderConfig({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "openai-key",
        OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
        OPENAI_WEB_SEARCH_ENABLED: "true"
      }).nativeWebSearchEnabled
    ).toBe(false);
  });

  test("rejects Gemini as an unsupported provider", () => {
    expect(() =>
      resolveAiProviderConfig({
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "legacy-gemini-key"
      })
    ).toThrow("AI_PROVIDER=gemini tidak lagi didukung");
  });

  test("moves the selected model to the front of the request order", () => {
    expect(preferredAIModels(["model-a", "model-b", "model-c"], "model-b")).toEqual(["model-b", "model-a", "model-c"]);
    expect(preferredAIModels(["model-a", "model-b"], "unknown")).toEqual(["unknown", "model-a", "model-b"]);
  });

  test("prefers the OpenRouter catalog even when env models are present", async () => {
    global.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: "openrouter/model-a" },
            { canonical_slug: "openrouter/model-b" }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as unknown as typeof fetch;

    const models = await resolvePublicAiModels({
      provider: "deepseek",
      model: "deepseek-v4-pro",
      models: ["deepseek-v4-pro", "deepseek-v4-flash"],
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: "openrouter-key"
    });

    expect(models).toEqual(["openrouter/model-a", "openrouter/model-b"]);
  });
});
