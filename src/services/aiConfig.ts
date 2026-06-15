export type AiAdapter = "openai-compatible" | "gemini";

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

export function parseOpenAIWebSearchContextSize(value?: string) {
  const normalized = String(value ?? "medium").trim().toLowerCase();
  if (normalized === "low" || normalized === "high") return normalized;
  return "medium";
}

function defaultModelFor(provider: string) {
  if (provider === "gemini") return "gemini-2.5-flash";
  if (provider === "deepseek") return "deepseek-v4-pro";
  return "gpt-4o-mini";
}

function defaultBaseURLFor(provider: string) {
  if (provider === "deepseek") return "https://api.deepseek.com/v1";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1";
  return undefined;
}

function providerEnvNames(provider: string, suffix: string) {
  const prefix = providerPrefix(provider);
  return prefix === "OPENAI" ? [`OPENAI_${suffix}`] : [`${prefix}_${suffix}`, `OPENAI_${suffix}`];
}

export function resolveAiProviderConfig(env: Env = process.env): AiProviderConfig {
  const provider = String(env.AI_PROVIDER ?? "openai").trim().toLowerCase();
  const prefix = providerPrefix(provider);

  if (provider === "gemini") {
    const model = firstEnv(env, ["GEMINI_MODEL"]) ?? defaultModelFor(provider);
    return {
      provider,
      adapter: "gemini",
      apiKey: firstEnv(env, ["GEMINI_API_KEY"]),
      model,
      models: parseAIModels(firstEnv(env, ["GEMINI_MODELS"]), model),
      maxTokens: positiveInteger(firstEnv(env, ["GEMINI_MAX_TOKENS", "OPENAI_MAX_TOKENS"]), 9000),
      timeoutMs: positiveInteger(firstEnv(env, ["GEMINI_TIMEOUT_MS", "OPENAI_TIMEOUT_MS"]), 30_000),
      nativeWebSearchEnabled: false,
      webSearchContextSize: "medium"
    };
  }

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
