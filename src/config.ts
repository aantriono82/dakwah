import { parseOpenAIModels } from "./services/openai";

export const providerTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 30_000);
export const openAiModels = parseOpenAIModels(process.env.OPENAI_MODELS, process.env.OPENAI_MODEL || "gpt-4o-mini");
export const geminiModels = parseOpenAIModels(process.env.GEMINI_MODELS, process.env.GEMINI_MODEL || "gemini-2.5-flash");
export const aiProvider = String(process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
export const activeModelCount = aiProvider === "gemini" ? geminiModels.length : openAiModels.length;
export const generateClientTimeoutMs = Math.max(120_000, providerTimeoutMs * Math.max(1, activeModelCount) + 30_000);
