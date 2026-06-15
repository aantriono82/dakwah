import { describe, expect, test } from "bun:test";
import { resolveAiProviderConfig } from "./aiConfig";

describe("AI provider config", () => {
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

  test("does not reuse OpenAI model names for Gemini", () => {
    const config = resolveAiProviderConfig({
      AI_PROVIDER: "gemini",
      OPENAI_MODEL: "gpt-4o-mini",
      OPENAI_MODELS: "gpt-4o-mini,gpt-4o",
      OPENAI_MAX_TOKENS: "7000"
    });

    expect(config.model).toBe("gemini-2.5-flash");
    expect(config.models).toEqual(["gemini-2.5-flash"]);
    expect(config.maxTokens).toBe(7000);
  });
});
