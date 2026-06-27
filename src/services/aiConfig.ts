export type AiAdapter = "openai-compatible";

export type AiProviderConfig = {
  provider: string;
  adapter: AiAdapter;
  apiKey?: string;
  baseURL?: string;
  model: string;
  models: string[];
  maxTokens: number;
  timeoutMs: number;
  nativeWebSearchEnabled: boolean;
  webSearchContextSize: "low" | "medium" | "high";
};

type Env = Record<string, string | undefined>;

function providerPrefix(provider: string) {
  return provider.replace(/[^a-z0-9]/gi, "_").toUpperCase();
}

function firstEnv(env: Env, names: string[]) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function parseAIModels(modelsValue?: string, fallbackModel = "gpt-4o-mini") {
  return (modelsValue || fallbackModel)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function preferredAIModels(models: string[], selectedModel?: string) {
  const chosenModel = selectedModel?.trim();
  if (!chosenModel) return models;
  return [chosenModel, ...models.filter((item) => item !== chosenModel)];
}

export function parseOpenAIWebSearchContextSize(value?: string) {
  const normalized = String(value ?? "medium").trim().toLowerCase();
  if (normalized === "low" || normalized === "high") return normalized;
  return "medium";
}

function defaultModelFor(provider: string) {
  if (provider === "deepseek") return "deepseek-v4-pro";
  return "gpt-4o-mini";
}

function defaultBaseURLFor(provider: string) {
  if (provider === "deepseek") return "https://api.deepseek.com/v1";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1";
  return undefined;
}

export function isOpenRouterBaseURL(baseURL?: string) {
  if (!baseURL) return false;
  try {
    const url = new URL(baseURL);
    return url.hostname === "openrouter.ai" || url.hostname === "api.openrouter.ai";
  } catch {
    return /openrouter\.ai/i.test(baseURL);
  }
}

function providerEnvNames(provider: string, suffix: string) {
  const prefix = providerPrefix(provider);
  return prefix === "OPENAI" ? [`OPENAI_${suffix}`] : [`${prefix}_${suffix}`, `OPENAI_${suffix}`];
}

export function resolveAiProviderConfig(env: Env = process.env): AiProviderConfig {
  const provider = String(env.AI_PROVIDER ?? "openai").trim().toLowerCase();
  const prefix = providerPrefix(provider);
  if (provider === "gemini") throw new Error("AI_PROVIDER=gemini tidak lagi didukung. Gunakan openai atau deepseek.");

  const model = firstEnv(env, providerEnvNames(provider, "MODEL")) ?? defaultModelFor(provider);
  const baseURL = firstEnv(env, providerEnvNames(provider, "BASE_URL")) ?? defaultBaseURLFor(provider);
  const nativeWebSearchEnabled =
    provider === "openai" && !baseURL
      ? parseBooleanEnv(firstEnv(env, [`${prefix}_WEB_SEARCH_ENABLED`, "OPENAI_WEB_SEARCH_ENABLED"]), true)
      : false;

  return {
    provider,
    adapter: "openai-compatible",
    apiKey: firstEnv(env, providerEnvNames(provider, "API_KEY")),
    baseURL,
    model,
    models: parseAIModels(firstEnv(env, providerEnvNames(provider, "MODELS")), model),
    maxTokens: positiveInteger(firstEnv(env, providerEnvNames(provider, "MAX_TOKENS")), 9000),
    timeoutMs: positiveInteger(firstEnv(env, providerEnvNames(provider, "TIMEOUT_MS")), 30_000),
    nativeWebSearchEnabled,
    webSearchContextSize: parseOpenAIWebSearchContextSize(firstEnv(env, [`${prefix}_WEB_SEARCH_CONTEXT_SIZE`, "OPENAI_WEB_SEARCH_CONTEXT_SIZE"]))
  };
}

type OpenRouterModelResponse = {
  data?: Array<{
    id?: string;
    canonical_slug?: string;
    name?: string;
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
};

export const OPENROUTER_MODEL_SEEDS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash",
  "google/gemini-2.5-pro",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "deepseek/deepseek-r1",
  "mistralai/mistral-large"
];

export type PublicAiModelEntry = {
  id: string;
  name: string;
  pricingLabel: "Gratis" | "Berbayar" | "Tidak diketahui";
  isFree: boolean;
};

export type PublicAiModelConfig = Pick<AiProviderConfig, "provider" | "model" | "models" | "baseURL" | "apiKey">;

const openRouterModelCache = new Map<string, { expiresAt: number; models: PublicAiModelEntry[] }>();

function openRouterCacheKey(baseURL?: string, apiKey?: string) {
  return `${baseURL ?? ""}::${apiKey ? "auth" : "anon"}`;
}

export async function resolvePublicAiModels(config: PublicAiModelConfig) {
  const explicitModels = config.models.map((item) => item.trim()).filter(Boolean);
  if (!isOpenRouterBaseURL(config.baseURL)) {
    return explicitModels;
  }

  const models = await fetchOpenRouterModelCatalog(config);
  return models.length > 0 ? models.map((item) => item.id) : OPENROUTER_MODEL_SEEDS;
}

export async function fetchOpenRouterModelCatalog(config: PublicAiModelConfig): Promise<PublicAiModelEntry[]> {
  const cacheKey = openRouterCacheKey(config.baseURL, config.apiKey);
  const cached = openRouterModelCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.models;
  }

  const endpoint = new URL("/models", "https://openrouter.ai/api/v1").toString();
  async function requestCatalog(useAuth: boolean) {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "dakwah-ai-model-picker/1.0",
        ...(useAuth && config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
      }
    });
    if (!response.ok) throw new Error(`OpenRouter models request failed with ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = await response.text();
    if (!contentType.includes("json")) {
      throw new Error(`OpenRouter models response bukan JSON: ${rawBody.slice(0, 160)}`);
    }
    const body = JSON.parse(rawBody) as OpenRouterModelResponse;
    const deduped = new Map<string, PublicAiModelEntry>();
    for (const item of body.data ?? []) {
      const id = item.id?.trim() || item.canonical_slug?.trim() || "";
      if (!id || deduped.has(id)) continue;
      const prompt = Number(item.pricing?.prompt ?? "0");
      const completion = Number(item.pricing?.completion ?? "0");
      const isFree = Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
      deduped.set(id, {
        id,
        name: item.name?.trim() || id,
        pricingLabel: isFree ? "Gratis" : "Berbayar",
        isFree
      });
    }
    return Array.from(deduped.values());
  }

  try {
    const authModels = config.apiKey ? await requestCatalog(true) : [];
    const models = authModels.length > 0 ? authModels : await requestCatalog(false);
    if (models.length > 0) {
      openRouterModelCache.set(cacheKey, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, models });
      return models;
    }
  } catch (error) {
    if (config.apiKey) {
      try {
        const fallbackModels = await requestCatalog(false);
        if (fallbackModels.length > 0) {
          openRouterModelCache.set(cacheKey, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, models: fallbackModels });
          return fallbackModels;
        }
      } catch (fallbackError) {
        console.warn("[fetchOpenRouterModelCatalog] failed to fetch OpenRouter model catalog with and without auth:", error, fallbackError);
      }
    } else {
      console.warn("[fetchOpenRouterModelCatalog] failed to fetch OpenRouter model catalog:", error);
    }
  }

  return OPENROUTER_MODEL_SEEDS.map((id) => ({ id, name: id, pricingLabel: "Tidak diketahui", isFree: false }));
}
