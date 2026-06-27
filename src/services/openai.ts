import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import {
  buildPrompt,
  completeMissingSecondKhutbah,
  appearsTruncatedText,
  composeTemplatedRukunKhutbah,
  fallbackNaskah,
  hasContextLeak,
  hasSubstantialArabicClosingPrayer,
  hasSubstantialArabicOpening,
  injectRetrievedDalil,
  isGeneratedTextAcceptable,
  matchesTargetLanguage,
  meetsMinimumLength,
  minimumWordCountFor,
  missingRequiredArabicSections,
  normalizeLanguage,
  type PromptDalilContext,
  type PromptWebContext,
  rhetoricStyleGuidanceFor,
  retrievedWebGuidanceFor,
  sanitizeGeneratedText,
  thematicDalilSets
} from "../utils/content";
import { qualityReportFor } from "../utils/quality";
import { retrieveDalilContext } from "./myquran";
import { requestWantsServerWebResearch, retrieveWebContext } from "./webResearch";
import { registerThemeClassifier } from "../utils/themeClassifier";
import { logInfo } from "../utils/observability";
import { preferredAIModels, resolveAiProviderConfig } from "./aiConfig";
export { parseAIModels as parseOpenAIModels, parseOpenAIWebSearchContextSize } from "./aiConfig";

const aiConfig = resolveAiProviderConfig();
const apiKey = aiConfig.apiKey;
const aiProvider = aiConfig.provider;
const model = aiConfig.model;
const models = aiConfig.models;
const baseURL = aiConfig.baseURL;
const requestTimeout = aiConfig.timeoutMs;
const client = apiKey ? new OpenAI({ apiKey, baseURL, timeout: requestTimeout }) : null;
const maxTokens = aiConfig.maxTokens;
const openAIWebSearchEnabled = aiConfig.nativeWebSearchEnabled;
const openAIWebSearchContextSize = aiConfig.webSearchContextSize;
const systemPrompt =
  "Anda adalah penulis naskah dakwah Islam yang natural, hangat, peka konteks jamaah, dan menulis naskah mimbar yang utuh, bukan ringkasan. Tampilkan hanya naskah final yang siap dibacakan. Ikuti bahasa target dari user untuk semua narasi non-heading. Jika user memilih bahasa tertentu, seluruh narasi wajib 100% konsisten dalam bahasa itu; jangan campur dengan bahasa lain walau satu kalimat, kecuali heading struktur standar yang memang diizinkan. Dilarang menampilkan reasoning, analisis, rencana, komentar proses, catatan model, atau bahasa Inggris. Jangan gunakan Markdown. Gunakan rujukan ayat/hadits secara hati-hati dan jangan mengarang sumber. Jangan menambah klaim sejarah, faedah, atau hukum bila tidak benar-benar didukung konteks dan dalil yang tersedia. Semua teks Arab wajib berharakat, khususnya pada mukadimah, syahadat, ayat Al-Qur'an, hadits, penutup khutbah pertama, pembuka khutbah kedua, dan doa.";
const baseGenerationSettings = {
  temperature: 0.9,
  top_p: 0.95,
  presence_penalty: 0.35,
  frequency_penalty: 0.45
};

const maxTokensByDurationMinutes: Record<number, number> = {
  5: 1600,
  7: 2200,
  10: 3600,
  15: 6200,
  20: 8000
};

function modelsForRequest(selectedModel?: string) {
  return preferredAIModels(models, selectedModel);
}

function shouldUseOpenAIWebSearch(preferStreaming = false) {
  return !preferStreaming && aiProvider === "openai" && Boolean(client) && openAIWebSearchEnabled && !baseURL;
}

function requestWantsWebSearch(parameters: Record<string, unknown>) {
  return requestWantsServerWebResearch(parameters);
}

function shouldUseServerWebResearch(parameters: Record<string, unknown>, preferStreaming = false) {
  return requestWantsWebSearch(parameters) && !shouldUseOpenAIWebSearch(preferStreaming);
}

function contentTokenCeiling(jenis: string) {
  if (jenis === "kultum") return 2800;
  if (jenis === "ceramah") return 7600;
  if (jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha") return 8000;
  if (jenis === "nikah") return 6000;
  return 3000;
}

function isTemplatedRukunKhutbahType(jenis: string) {
  return jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha";
}

function shouldUseTemplatedRukunKhutbah(jenis: string, parameters: Record<string, unknown>) {
  return isTemplatedRukunKhutbahType(jenis) && normalizeLanguage(parameters.bahasa) !== "Arab";
}

function durationMinutesFor(jenis: string, parameters: Record<string, unknown>) {
  const duration = String(parameters.durasi ?? parameters.duration ?? "").trim().toLowerCase();
  const numericDuration = Number(duration.match(/\d+/)?.[0]);
  if (Number.isFinite(numericDuration) && numericDuration > 0) return numericDuration;

  const isPendek = duration.includes("pendek");
  const isPanjang = duration.includes("panjang");

  if (jenis === "kultum") return isPendek ? 5 : isPanjang ? 10 : 7;
  if (jenis === "nikah") return isPendek ? 7 : isPanjang ? 15 : 10;

  return isPendek ? 10 : isPanjang ? 20 : 15;
}

export function maxTokensForRequest(jenis: string, parameters: Record<string, unknown>) {
  const minutes = durationMinutesFor(jenis, parameters);
  const durationLimit = maxTokensByDurationMinutes[minutes] ?? 3000;
  return Math.min(maxTokens, contentTokenCeiling(jenis), durationLimit);
}

function generationSettingsFor(jenis: string, parameters: Record<string, unknown>) {
  return {
    ...baseGenerationSettings,
    max_tokens: maxTokensForRequest(jenis, parameters)
  };
}

function isTooShortReason(reason: string) {
  return reason.startsWith("too_short:min_words_");
}

function maxTokensForShortRetry(jenis: string, parameters: Record<string, unknown>, requested: number) {
  const minimum = minimumWordCountFor(jenis, parameters);
  const estimated = Math.ceil((minimum * 3.8) / 100) * 100;
  const retryFloor = jenis === "kultum" ? 2800 : jenis === "ceramah" ? 6800 : jenis === "nikah" ? 5400 : 7000;
  return Math.min(maxTokens, Math.max(requested, estimated, retryFloor));
}

function retryGenerationSettingsFor(jenis: string, parameters: Record<string, unknown>, reason: string) {
  const settings = generationSettingsFor(jenis, parameters);
  if (!isTooShortReason(reason) && reason !== "truncated_output") return settings;

  return {
    ...settings,
    max_tokens: maxTokensForShortRetry(jenis, parameters, settings.max_tokens)
  };
}

function completionParamsForProvider<T extends { model: string }>(params: T): T {
  const isDeepSeekV4 = /^deepseek-v4-/i.test(params.model) && /api\.deepseek\.com/i.test(baseURL ?? "");
  if (!isDeepSeekV4) return params;

  return {
    ...params,
    thinking: { type: "disabled" }
  } as T;
}

async function withProviderTimeout<T>(promise: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Provider AI timeout setelah ${requestTimeout}ms.`)), requestTimeout);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function providerMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export type GenerationAcceptancePolicy = "stream" | "first_pass" | "final";

const finalAcceptanceBlockingIds = new Set(["template_language", "theme_focus_keywords", "theme_focus_domain"]);
const dalilRepairBlockingIds = new Set([
  "invalid_quran_references",
  "selected_dalil_references",
  "quran_arabic_match",
  "dalil_theme_alignment",
  "arabic_diacritics"
]);
const editorialRepairBlockingIds = new Set(["template_language", "theme_focus_keywords", "theme_focus_domain"]);

export function qualityFailureBlocksAcceptance(
  item: { id?: string; passed: boolean; severity: string },
  policy: GenerationAcceptancePolicy = "first_pass"
) {
  if (item.passed) return false;
  if (item.severity === "critical") return true;
  return policy === "final" && finalAcceptanceBlockingIds.has(item.id ?? "");
}

export function qualityFailureNeedsDalilRepair(item: { id?: string; passed: boolean }) {
  return !item.passed && dalilRepairBlockingIds.has(item.id ?? "");
}

export function qualityFailureNeedsEditorialRepair(item: { id?: string; passed: boolean }) {
  return !item.passed && editorialRepairBlockingIds.has(item.id ?? "");
}

function blockingQualityFailures(
  jenis: string,
  text: string,
  parameters: Record<string, unknown>,
  dalilContext?: PromptDalilContext,
  policy: GenerationAcceptancePolicy = "first_pass"
) {
  return qualityReportFor(jenis, text, parameters, dalilContext).checks.filter((item) => qualityFailureBlocksAcceptance(item, policy));
}

export function providerTextMeetsAcceptancePolicy(
  policy: GenerationAcceptancePolicy,
  jenis: string,
  text: string,
  parameters: Record<string, unknown>,
  dalilContext?: PromptDalilContext
) {
  if (!isGeneratedTextAcceptable(jenis, text, parameters)) return false;
  if (!matchesTargetLanguage(text, parameters.bahasa)) return false;
  if (appearsTruncatedText(text)) return false;
  if (blockingQualityFailures(jenis, text, parameters, dalilContext, policy).length > 0) return false;

  if (policy === "stream") return true;

  if (!meetsMinimumLength(jenis, text, parameters)) return false;
  if (!hasSubstantialArabicOpening(jenis, text)) return false;
  if (!hasSubstantialArabicClosingPrayer(jenis, text)) return false;

  if (policy === "first_pass") return true;

  return true;
}

function providerTextIsClean(
  jenis: string,
  text: string,
  parameters: Record<string, unknown>,
  dalilContext?: PromptDalilContext,
  policy: GenerationAcceptancePolicy = "first_pass"
) {
  return providerTextMeetsAcceptancePolicy(policy, jenis, text, parameters, dalilContext);
}

function normalizeProviderText(jenis: string, text: string, parameters: Record<string, unknown>) {
  return completeMissingSecondKhutbah(jenis, sanitizeGeneratedText(text), parameters);
}

function normalizedRevisionText(text: string) {
  return sanitizeGeneratedText(text).replace(/\s+/g, " ").trim();
}

export function isMeaningfullyDifferentRevision(currentContent: string, revisedContent: string) {
  return normalizedRevisionText(currentContent) !== normalizedRevisionText(revisedContent);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanReplacementFragment(value: string) {
  return value
    .trim()
    .replace(/^["'“”‘’`]+/, "")
    .replace(/["'“”‘’`]+$/, "")
    .replace(/[.,;:]+$/, "")
    .trim();
}

export function applyLiteralRevisionInstruction(currentContent: string, instruction: string) {
  const match = instruction.match(/(?:^|\b)(?:ganti|ubah|replace)\s+(?:teks\s+)?(.+?)\s+menjadi\s+(.+?)(?:[.!?\n]|$)/i);
  if (!match) return null;

  const source = cleanReplacementFragment(match[1]);
  const target = cleanReplacementFragment(match[2]);
  if (!source || !target) return null;

  const pattern = new RegExp(escapeRegExp(source), "gi");
  if (!pattern.test(currentContent)) return null;

  return currentContent.replace(pattern, target);
}

function providerTextFailureReason(jenis: string, text: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  const missingSections = missingRequiredArabicSections(jenis, text);
  const languageMismatch = !matchesTargetLanguage(text, targetLanguage);
  const contextLeak = hasContextLeak(jenis, text);
  const tooShort = !meetsMinimumLength(jenis, text, parameters);
  const truncated = appearsTruncatedText(text);
  const thinOpening = !hasSubstantialArabicOpening(jenis, text);
  const thinClosingPrayer = !hasSubstantialArabicClosingPrayer(jenis, text);

  if (missingSections.length > 0) return `missing_required_arabic_sections:${missingSections.join(",")}`;
  if (languageMismatch) return `language_mismatch:${targetLanguage}`;
  if (contextLeak) return `context_leak:${jenis}`;
  if (tooShort) return `too_short:min_words_${minimumWordCountFor(jenis, parameters)}`;
  if (truncated) return "truncated_output";
  if (thinOpening) return "thin_arabic_opening";
  if (thinClosingPrayer) return "thin_arabic_closing_prayer";

  const qualityFailure = blockingQualityFailures(jenis, text, parameters, dalilContext)[0];
  if (qualityFailure) return `quality_${qualityFailure.id}:${qualityFailure.detail}`;
  return "invalid_output";
}

function retryMaxTokensForProviderError(message: string, requested: number) {
  const affordable = message.match(/can only afford\s+(\d+)/i);
  if (affordable) {
    return Math.max(1024, Math.min(requested - 1, Number(affordable[1]) - 256));
  }

  if (/402|more credits|fewer max_tokens/i.test(message)) {
    return Math.max(1024, Math.floor(requested * 0.8));
  }

  return 0;
}

async function createCompletionWithCreditRetry(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  traceId: string,
  pass: string
) {
  try {
    return await withProviderTimeout(client!.chat.completions.create(completionParamsForProvider(params) as typeof params));
  } catch (error) {
    const message = providerMessage(error);
    const retryMaxTokens = retryMaxTokensForProviderError(message, params.max_tokens ?? maxTokens);
    if (!retryMaxTokens || retryMaxTokens >= (params.max_tokens ?? maxTokens)) throw error;

    console.warn(
      `[generateText:${traceId}] pass=${pass} provider_retry=max_tokens requested=${params.max_tokens ?? maxTokens} retry=${retryMaxTokens} message=${message}`
    );
    return await withProviderTimeout(client!.chat.completions.create(completionParamsForProvider({ ...params, max_tokens: retryMaxTokens }) as typeof params));
  }
}

async function createStreamingCompletionWithCreditRetry(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
  traceId: string
) {
  try {
    return await withProviderTimeout(client!.chat.completions.create(completionParamsForProvider(params) as typeof params));
  } catch (error) {
    const message = providerMessage(error);
    const retryMaxTokens = retryMaxTokensForProviderError(message, params.max_tokens ?? maxTokens);
    if (!retryMaxTokens || retryMaxTokens >= (params.max_tokens ?? maxTokens)) throw error;

    console.warn(
      `[streamGeneratedText:${traceId}] provider_retry=max_tokens requested=${params.max_tokens ?? maxTokens} retry=${retryMaxTokens} message=${message}`
    );
    return await withProviderTimeout(client!.chat.completions.create(completionParamsForProvider({ ...params, max_tokens: retryMaxTokens }) as typeof params));
  }
}

function variationInstruction(traceId: string) {
  return `Kode variasi internal: ${traceId}. Jangan tampilkan kode ini. Gunakan kode ini hanya untuk membedakan redaksi dari generate sebelumnya: variasikan mukadimah Arab, pilihan transisi, contoh jamaah, penutup khutbah pertama, doa mukminin, dan doa penutup.`;
}

function parametersWithVariation(parameters: Record<string, unknown>, traceId: string) {
  return { ...parameters, __variationSeed: traceId };
}

async function buildPromptWithRetrievedDalil(
  jenis: string,
  parameters: Record<string, unknown>,
  traceId: string,
  providedDalilContext?: PromptDalilContext,
  options?: { preferStreaming?: boolean; promptMode?: "initial" | "full" }
) {
  const webContext = await retrieveWebContextForPrompt(jenis, parameters, traceId, options?.preferStreaming ?? false);

  try {
    const dalilContext = providedDalilContext ?? (await retrieveDalilContext(jenis, parameters));
    console.info(
      `[generateText:${traceId}] dalil_source=${dalilContext.source} quran=${dalilContext.quran[0]?.reference ?? "none"} hadith=${dalilContext.hadith[0]?.reference ?? "none"}`
    );
    return buildPrompt(jenis, parameters, dalilContext, webContext, { mode: options?.promptMode ?? "full" });
  } catch (error) {
    console.warn(`[generateText:${traceId}] dalil_retrieval_failed message=${providerMessage(error)}`);
    return buildPrompt(jenis, parameters, undefined, webContext, { mode: options?.promptMode ?? "full" });
  }
}

async function retrieveWebContextForPrompt(jenis: string, parameters: Record<string, unknown>, traceId: string, preferStreaming = false) {
  if (!shouldUseServerWebResearch(parameters, preferStreaming)) return undefined;
  try {
    const webContext = await retrieveWebContext(jenis, parameters);
    console.info(
      `[generateText:${traceId}] web_research source=${webContext.source} results=${webContext.results.length} warnings=${webContext.warnings?.length ?? 0}`
    );
    return webContext;
  } catch (error) {
    console.warn(`[generateText:${traceId}] web_research_failed message=${providerMessage(error)}`);
    return undefined;
  }
}

function retryLengthInstructionFor(jenis: string) {
  if (jenis === "ceramah") {
    return "Untuk Ceramah Umum, hasil harus jelas lebih panjang dan lebih mendalam daripada kultum: perluas isi utama dalam paragraf narasi utuh, bukan daftar poin pendek.";
  }

  if (jenis === "kultum") {
    return "Untuk Kultum, tetap singkat-padat tetapi jangan terlalu tipis; isi utama harus utuh, minimal beberapa paragraf narasi, dan cukup lengkap untuk dibacakan 5-7 menit.";
  }

  if (jenis === "nikah") {
    return "Untuk Khutbah Nikah, nasihat harus terasa utuh dan khidmat: uraikan pesan untuk mempelai dan keluarga dalam paragraf lembut yang konkret, bukan nasihat umum yang terlalu singkat.";
  }

  return "Perluas uraian utama dalam paragraf yang mengalir dan jangan mengganti uraian dengan daftar poin pendek.";
}

function retryTooShortInstructionFor(jenis: string, parameters: Record<string, unknown>, reason: string) {
  if (!isTooShortReason(reason)) return "";

  const minimum = minimumWordCountFor(jenis, parameters);
  const lowerTarget = Math.ceil(Math.max(minimum + 150, minimum * 1.2) / 50) * 50;
  const upperTarget = lowerTarget + Math.ceil(Math.max(150, minimum * 0.2) / 50) * 50;

  return ` Karena masalah utama adalah naskah terlalu pendek, tulis ulang dengan target ${lowerTarget}-${upperTarget} kata, bukan sekadar melewati minimum. Jangan menyebut jumlah kata di naskah. Tambahkan pengembangan nasihat, transisi antargagasan, contoh keseharian jamaah, penjelasan hubungan dalil dengan tema, dan penutup yang lebih utuh tanpa mengulang kalimat yang sama.`;
}

function nonTargetLanguageWarning(targetLanguage: string) {
  if (targetLanguage === "Indonesia") {
    return "bukan bahasa Jawa, Sunda, Ogan, Arab, Inggris, atau campuran bahasa lain";
  }

  return "bukan bahasa Indonesia atau campuran bahasa lain";
}

function retryInstruction(jenis: string, parameters: Record<string, unknown>, reason: string) {
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  const arabicOnlySecondInstruction = jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha"
    ? ' Setelah heading "Khutbah Kedua" seluruh isi harus hanya teks Arab berharakat sampai akhir naskah; jangan tulis Pesan Praktis, Doa Penutup, Takbir Pembuka Kedua, terjemah, transliterasi, sapaan Indonesia, atau narasi Indonesia di bagian itu. Jika perlu heading doa, gunakan heading Arab "الدُّعَاءُ". Untuk khutbah Idul Fitri/Idul Adha, awali isi Khutbah Kedua langsung dengan takbir Arab 7 kali.'
    : "";
  const styleGuidance = rhetoricStyleGuidanceFor(parameters);
  const styleInstruction = styleGuidance ? `\nIkuti instruksi gaya retorika berikut secara ketat:\n${styleGuidance}` : "";
  const tooShortInstruction = retryTooShortInstructionFor(jenis, parameters, reason);

  return `Ulangi naskah final dari awal. Bahasa target wajib ${targetLanguage}; semua sapaan, transisi, isi, renungan, terjemah/penjelasan ayat-hadits, pesan praktis, dan penutup harus memakai bahasa target tersebut, ${nonTargetLanguageWarning(targetLanguage)}, kecuali heading struktur standar. Naskah sebelumnya bermasalah: ${reason}. Jangan ringkas; penuhi minimal ${minimumWordCountFor(jenis, parameters)} kata dan buat uraian utama mengalir dalam banyak paragraf.${tooShortInstruction} ${retryLengthInstructionFor(jenis)} Wajib ikuti rukun khutbah: hamdalah, shalawat Nabi, dan wasiat takwa harus ada di khutbah pertama dan kedua; syahadat Arab berharakat harus ada di mukadimah khutbah pertama; ayat Al-Qur'an Arab harus ada minimal di salah satu khutbah; doa untuk kaum mukminin harus ada di khutbah kedua.${arabicOnlySecondInstruction} Untuk khutbah Idul Fitri/Idul Adha, khutbah pertama diawali takbir Arab 9 kali dan khutbah kedua diawali takbir Arab 7 kali. Terapkan STYLE PROFILE: dakwah.id sesuai jenis naskah agar pembuka, isi, penutup, dan doa bervariasi, humanis, dan tidak terasa template. Pembuka Arab harus utuh, bukan satu baris pendek. Doa penutup Arab minimal 4-6 kalimat doa berharakat, memuat doa untuk kaum mukminin, dan jangan hanya satu doa pendek. Jangan tampilkan label teknis seperti Rukun 1/2/3/4/5 pada naskah final. Semua teks Arab wajib diberi harakat lengkap (tasykil), tanpa Arab gundul.${styleInstruction}`;
}

function outlineInstruction(jenis: string, parameters: Record<string, unknown>) {
  return `Buat kerangka internal untuk naskah ${jenis}. Kerangka harus:
- Mengikat tema, dalil retrieval, alur pembuka, isi utama, transisi, pesan praktis, dan penutup.
- Menentukan di bagian mana ayat dan hadits hasil retrieval dipakai.
- Menjaga semua aturan struktur dan bahasa target.
- Jangan menulis naskah final. Jangan menambah dalil baru.

Parameter ringkas:
${Object.entries(parameters)
  .map(([key, value]) => `- ${key}: ${String(value)}`)
  .join("\n")}`;
}

function editorialKhutbahPrompt(
  jenis: string,
  parameters: Record<string, unknown>,
  dalilContext?: PromptDalilContext,
  webContext?: PromptWebContext
) {
  const tema = String(parameters.temaUtama ?? parameters.tema ?? parameters.topik ?? parameters.topikSingkat ?? "ketakwaan").trim();
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  const noArabicInstruction =
    targetLanguage === "Arab"
      ? "- Gunakan bahasa Arab berharakat untuk isi editorial, tetapi tetap jangan menulis rukun/template yang akan dipasang sistem."
      : "- Jangan menulis teks Arab. Bagian Arab wajib dan dalil akan dipasang sistem dari template dan retrieval.";
  const styleGuidance = rhetoricStyleGuidanceFor(parameters);
  const dalilSummary = dalilContext
    ? `Ayat yang akan dipasang sistem: ${dalilContext.quran[0]?.reference ?? "fallback tematik"} - ${dalilContext.quran[0]?.translation ?? ""}
Hadits yang akan dipasang sistem: ${dalilContext.hadith[0]?.reference ?? "fallback tematik"} - ${dalilContext.hadith[0]?.translation ?? ""}`
    : "Sistem akan memasang ayat dan hadits tematik yang tersedia.";

  return `Tulis hanya isi editorial khutbah untuk tema "${tema}".

Jenis khutbah: ${jenis}
Bahasa target: ${targetLanguage}

Tema utama: "${tema}"

Semua isi naskah khutbah, ceramah, dan kultum harus menjelaskan tema tersebut.
Jangan membahas topik lain kecuali berkaitan langsung dengan tema.
Setiap paragraf harus mendukung tema utama.
Jika menyebut ayat atau hadits, pilih yang relevan dengan tema.

${dalilSummary}

${retrievedWebGuidanceFor(webContext)}

Tugas AI:
- Tulis penjelasan tema, penjelasan hubungan ayat/hadits dengan tema, isi khutbah utama, contoh keseharian jamaah, dan pesan praktis.
- Jangan menulis Judul, Khutbah Pertama, Khutbah Kedua, Penutup Khutbah Pertama, Doa Penutup, hamdalah, syahadat, shalawat, wasiat takwa, takbir, atau doa mukminin.
${noArabicInstruction}
- Jangan mengutip ayat atau hadits lain, jangan menulis "Allah berfirman", dan jangan menulis "Rasulullah bersabda". Cukup jelaskan makna dalil yang akan dipasang sistem dengan frasa seperti "ayat di atas mengingatkan..." atau "hadits tersebut menegaskan...".
- Jangan memakai Markdown, bullet dekoratif, catatan proses, analisis, atau komentar model.
- Tulis dalam paragraf mimbar yang natural, siap disisipkan ke khutbah pertama.
- Bahasa target wajib ${targetLanguage}; jangan campur dengan bahasa lain.
- Penuhi isi yang cukup untuk khutbah ${String(parameters.durasi ?? "sedang")}: jangan terlalu ringkas, buat beberapa paragraf mengalir.
${styleGuidance ? `\nGaya retorika:\n${styleGuidance}` : ""}`;
}

function staticOutlineFor(jenis: string) {
  if (jenis === "kultum") return "Pembuka singkat -> ayat retrieval -> hadits retrieval -> satu renungan dekat -> tiga langkah praktis -> penutup doa.";
  if (jenis === "nikah") return "Pembukaan Arab -> ayat retrieval -> hadits retrieval -> nasihat mempelai -> pesan keluarga -> doa penutup.";
  if (jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha") {
    return "Khutbah Pertama: mukadimah Arab -> ayat retrieval -> hadits retrieval -> uraian utama bertahap -> penutup khutbah pertama. Khutbah Kedua: Arab berharakat, hamdalah, shalawat, wasiat takwa, doa mukminin.";
  }
  return "Pembuka natural -> ayat retrieval -> hadits retrieval -> uraian masalah -> contoh dekat -> renungan -> langkah praktis -> penutup.";
}

function messagesWithOutline(
  prompt: string,
  traceId: string,
  outline: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
    {
      role: "user",
      content: `Kerangka internal yang wajib diikuti tetapi jangan ditampilkan sebagai catatan proses:\n${outline || "Gunakan struktur standar sesuai prompt."}`
    },
    { role: "user", content: variationInstruction(traceId) }
  ];
}

function failedQualityDetails(jenis: string, text: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  const report = qualityReportFor(jenis, text, parameters, dalilContext);
  return report.checks
    .filter((item) => !item.passed && item.severity !== "info")
    .map((item) => `${item.label}: ${item.detail}`)
    .join("\n");
}

function needsDalilRepair(jenis: string, text: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  const report = qualityReportFor(jenis, text, parameters, dalilContext);
  return report.checks.some(qualityFailureNeedsDalilRepair);
}

function needsEditorialRepair(jenis: string, text: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  const report = qualityReportFor(jenis, text, parameters, dalilContext);
  return report.checks.some(qualityFailureNeedsEditorialRepair);
}

function createQualityInspector(jenis: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  const cache = new Map<string, ReturnType<typeof qualityReportFor>>();

  function report(text: string) {
    const cached = cache.get(text);
    if (cached) return cached;
    const next = qualityReportFor(jenis, text, parameters, dalilContext);
    cache.set(text, next);
    return next;
  }

  return {
    report,
    failedDetails(text: string) {
      return report(text)
        .checks
        .filter((item) => !item.passed && item.severity !== "info")
        .map((item) => `${item.label}: ${item.detail}`)
        .join("\n");
    },
    needsDalilRepair(text: string) {
      return report(text).checks.some(qualityFailureNeedsDalilRepair);
    },
    needsEditorialRepair(text: string) {
      return report(text).checks.some(qualityFailureNeedsEditorialRepair);
    }
  };
}

function repairInstructionFor(jenis: string, parameters: Record<string, unknown>, text: string, dalilContext?: PromptDalilContext) {
  const failures = failedQualityDetails(jenis, text, parameters, dalilContext) || "Validasi quality report belum memadai.";
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  return `Perbaiki naskah final berikut agar lolos validasi. Kembalikan naskah final lengkap saja.

Masalah validasi:
${failures}

Aturan repair:
- Bahasa target wajib ${targetLanguage}. Semua narasi non-heading harus tetap 100% dalam bahasa ${targetLanguage}; jangan sisakan campuran bahasa lain.
- Jangan menambah ayat atau hadits baru.
- Pakai hanya dalil retrieval yang sudah ada di prompt awal.
- Jika ada referensi, teks Arab, terjemah inti, grade, atau takhrij yang berubah, kembalikan sesuai data retrieval.
- Perbaiki bahasa agar tetap natural, bukan seperti daftar ceklis.
- Jangan tampilkan catatan proses, ringkasan, atau Markdown.

Naskah yang perlu diperbaiki:
${text}`;
}

function editorialRewriteInstructionFor(jenis: string, parameters: Record<string, unknown>, text: string, dalilContext?: PromptDalilContext) {
  const report = qualityReportFor(jenis, text, parameters, dalilContext);
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  const editorialFailures =
    report.checks
      .filter((item) => !item.passed && (item.id === "template_language" || item.id === "theme_focus_keywords"))
      .map((item) => `${item.label}: ${item.detail}`)
      .join("\n") || "Bahasa dan fokus tema belum cukup kuat.";
  const styleGuidance = rhetoricStyleGuidanceFor(parameters);
  const styleInstruction = styleGuidance ? `\n- Terapkan gaya retorika berikut:\n${styleGuidance}` : "";

  return `Tulis ulang naskah final berikut agar lebih kuat secara editorial. Kembalikan naskah final lengkap saja.

Masalah editorial:
${editorialFailures}

Aturan rewrite:
- Jangan mengganti tema, jenis naskah, struktur wajib, ayat, hadits, referensi, teks Arab, terjemah inti, grade, atau takhrij.
- Semua narasi non-heading wajib tetap 100% dalam bahasa ${targetLanguage}; jangan campur dengan bahasa Indonesia atau bahasa lain.
- Bahasa harus natural, lisan, jelas, dan tidak terasa template.
- Isi utama harus lebih spesifik melayani tema yang dipilih, bukan nasihat umum yang bisa dipakai untuk tema apa saja.
- Setelah dalil disebut, jelaskan kaitannya langsung dengan tema dan kondisi jamaah.
- Pertahankan semua bagian Arab penting tetap berharakat.${styleInstruction}
- Jangan tampilkan catatan proses, ringkasan perubahan, atau Markdown.

Naskah:
${text}`;
}

function naturalRewriteInstructionFor(text: string, parameters: Record<string, unknown>) {
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  return `Haluskan naskah final berikut agar lebih natural, lisan, jernih, dan tidak terasa template.

Aturan:
- Semua narasi non-heading wajib tetap 100% dalam bahasa ${targetLanguage}; jangan campur dengan bahasa lain.
- Jangan menambah, menghapus, atau mengganti ayat/hadits, referensi, teks Arab, terjemah inti, grade, takhrij, heading wajib, rukun khutbah, atau doa wajib.
- Kurangi pengulangan, perbaiki transisi, dan buat paragraf lebih enak dibacakan.
- Jangan menampilkan catatan proses, ringkasan perubahan, atau Markdown.
- Kembalikan naskah final lengkap saja.

Naskah:
${text}`;
}

function messageContentAsText(content: OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if ("text" in part && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function webSearchInstructionFor(jenis: string, parameters: Record<string, unknown>) {
  const tema = String(parameters.temaUtama ?? parameters.tema ?? parameters.topik ?? parameters.topikSingkat ?? "tema dakwah").trim();
  const internetSources = String(parameters.sumberInternet ?? "").trim();
  const sourceGuidance = internetSources
    ? `\nSumber/arah pencarian dari user:\n${internetSources}\nUtamakan sumber ini jika kredibel dan relevan, tetapi tetap jangan menyalin panjang.`
    : "";
  return `Akses web search aktif untuk membantu kesesuaian tema, isi, dan dalil naskah.
Gunakan pencarian web bila perlu untuk memahami konteks tema "${tema}" pada jenis naskah ${jenis}, mencari penguat penjelasan yang relevan, dan menghindari klaim yang keliru.
${sourceGuidance}
Aturan penggunaan web:
- Tetap utamakan dalil terkurasi dari prompt sebagai sumber ayat/hadits utama.
- Jangan menyalin artikel website secara panjang; olah menjadi narasi mimbar yang orisinal.
- Jangan mengutip ayat, hadits, takhrij, derajat, atau klaim hukum dari web jika tidak yakin sumbernya aman.
- Jika hasil web bertentangan dengan dalil terkurasi atau aturan prompt, ikuti dalil terkurasi dan aturan prompt.
- Jangan tampilkan catatan pencarian, URL mentah, atau daftar sumber di naskah final kecuali benar-benar diperlukan sebagai rujukan ringkas.`;
}

function messagesWithWebSearchInstruction(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  jenis: string,
  parameters: Record<string, unknown>,
  preferStreaming = false
) {
  if (!shouldUseOpenAIWebSearch(preferStreaming) || !requestWantsWebSearch(parameters)) return messages;
  return [...messages, { role: "user" as const, content: webSearchInstructionFor(jenis, parameters) }];
}

function responseInputFromMessages(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role.toUpperCase()}:\n${messageContentAsText(message.content)}`)
    .join("\n\n");
}

async function createResponseWithWebSearchAndCreditRetry(input: {
  modelName: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  jenis: string;
  parameters: Record<string, unknown>;
  traceId: string;
  pass: string;
  maxOutputTokens: number;
}) {
  const requestBody = (maxOutputTokens: number) => ({
    model: input.modelName,
    instructions: systemPrompt,
    input: responseInputFromMessages(messagesWithWebSearchInstruction(input.messages, input.jenis, input.parameters)),
    tools: [{ type: "web_search_preview", search_context_size: openAIWebSearchContextSize }],
    tool_choice: "auto",
    temperature: baseGenerationSettings.temperature,
    top_p: baseGenerationSettings.top_p,
    max_output_tokens: maxOutputTokens
  });

  try {
    const response = await withProviderTimeout(client!.responses.create(requestBody(input.maxOutputTokens) as ResponseCreateParamsNonStreaming));
    if (response.error?.message) throw new Error(response.error.message);
    return response.output_text ?? "";
  } catch (error) {
    const message = providerMessage(error);
    const retryMaxTokens = retryMaxTokensForProviderError(message, input.maxOutputTokens);
    if (!retryMaxTokens || retryMaxTokens >= input.maxOutputTokens) throw error;

    console.warn(
      `[generateText:${input.traceId}] pass=${input.pass} provider=responses_web_search_retry=max_output_tokens requested=${input.maxOutputTokens} retry=${retryMaxTokens} message=${message}`
    );
    const response = await withProviderTimeout(client!.responses.create(requestBody(retryMaxTokens) as ResponseCreateParamsNonStreaming));
    if (response.error?.message) throw new Error(response.error.message);
    return response.output_text ?? "";
  }
}

async function createOpenAITextPass(
  modelName: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  jenis: string,
  parameters: Record<string, unknown>,
  traceId: string,
  pass: string,
  maxTokenOverride?: number,
  allowWebSearch = false
) {
  const settings = {
    ...generationSettingsFor(jenis, parameters),
    ...(maxTokenOverride ? { max_tokens: maxTokenOverride } : {})
  };
  if (allowWebSearch && shouldUseOpenAIWebSearch() && requestWantsWebSearch(parameters)) {
    return createResponseWithWebSearchAndCreditRetry({
      modelName,
      messages,
      jenis,
      parameters,
      traceId,
      pass,
      maxOutputTokens: settings.max_tokens
    });
  }

  const response = await createCompletionWithCreditRetry(
    {
      model: modelName,
      messages,
      ...settings
    },
    traceId,
    pass
  );
  return response.choices[0]?.message.content ?? "";
}

async function createOpenAIOutline(modelName: string, prompt: string, jenis: string, parameters: Record<string, unknown>, traceId: string) {
  try {
    const outline = await createOpenAITextPass(
      modelName,
      [
        { role: "system", content: "Anda membuat kerangka internal naskah dakwah. Tampilkan kerangka ringkas saja." },
        { role: "user", content: prompt },
        { role: "user", content: outlineInstruction(jenis, parameters) }
      ],
      jenis,
      parameters,
      traceId,
      "outline",
      700
    );
    return sanitizeGeneratedText(outline) || staticOutlineFor(jenis);
  } catch (error) {
    console.warn(`[generateText:${traceId}] model=${modelName} pass=outline_failed message=${providerMessage(error)}`);
    return staticOutlineFor(jenis);
  }
}

async function finalizeOpenAIText(
  modelName: string,
  prompt: string,
  outline: string,
  text: string,
  jenis: string,
  parameters: Record<string, unknown>,
  dalilContext: PromptDalilContext | undefined,
  traceId: string
) {
  const quality = createQualityInspector(jenis, parameters, dalilContext);
  let output = injectRetrievedDalil(normalizeProviderText(jenis, text, parameters), dalilContext);
  let editorialRepairNeeded = quality.needsEditorialRepair(output);
  let ranDalilRepair = false;
  let ranEditorialRewrite = false;
  let ranNaturalRewrite = false;

  if (quality.needsDalilRepair(output)) {
    ranDalilRepair = true;
    try {
      const repaired = await createOpenAITextPass(
        modelName,
        [...messagesWithOutline(prompt, traceId, outline), { role: "user", content: repairInstructionFor(jenis, parameters, output, dalilContext) }],
        jenis,
        parameters,
        traceId,
        "quality_repair"
      );
      const cleanRepair = injectRetrievedDalil(normalizeProviderText(jenis, repaired, parameters), dalilContext);
      if (providerTextIsClean(jenis, cleanRepair, parameters, dalilContext, "final")) output = cleanRepair;
    } catch (error) {
      console.warn(`[generateText:${traceId}] model=${modelName} pass=quality_repair_failed message=${providerMessage(error)}`);
    }
  }

  if (editorialRepairNeeded) {
    ranEditorialRewrite = true;
    try {
      const editorialRewrite = await createOpenAITextPass(
        modelName,
        [...messagesWithOutline(prompt, traceId, outline), { role: "user", content: editorialRewriteInstructionFor(jenis, parameters, output, dalilContext) }],
        jenis,
        parameters,
        traceId,
        "editorial_rewrite"
      );
      const cleanEditorialRewrite = injectRetrievedDalil(normalizeProviderText(jenis, editorialRewrite, parameters), dalilContext);
      if (
        providerTextIsClean(jenis, cleanEditorialRewrite, parameters, dalilContext, "final") &&
        !quality.needsDalilRepair(cleanEditorialRewrite) &&
        !quality.needsEditorialRepair(cleanEditorialRewrite)
      ) {
        output = cleanEditorialRewrite;
        editorialRepairNeeded = false;
      }
    } catch (error) {
      console.warn(`[generateText:${traceId}] model=${modelName} pass=editorial_rewrite_failed message=${providerMessage(error)}`);
    }
  }

  if (!editorialRepairNeeded) {
    return {
      text: output,
      passMetrics: { ranDalilRepair, ranEditorialRewrite, ranNaturalRewrite }
    };
  }

  ranNaturalRewrite = true;
  try {
    const rewritten = await createOpenAITextPass(
      modelName,
      [...messagesWithOutline(prompt, traceId, outline), { role: "user", content: naturalRewriteInstructionFor(output, parameters) }],
      jenis,
      parameters,
      traceId,
      "natural_rewrite"
    );
    const cleanRewrite = injectRetrievedDalil(normalizeProviderText(jenis, rewritten, parameters), dalilContext);
    if (
      providerTextIsClean(jenis, cleanRewrite, parameters, dalilContext, "final") &&
      !quality.needsDalilRepair(cleanRewrite) &&
      !quality.needsEditorialRepair(cleanRewrite)
    ) {
      output = cleanRewrite;
    }
  } catch (error) {
    console.warn(`[generateText:${traceId}] model=${modelName} pass=natural_rewrite_failed message=${providerMessage(error)}`);
  }

  return {
    text: output,
    passMetrics: { ranDalilRepair, ranEditorialRewrite, ranNaturalRewrite }
  };
}

async function retryOpenAITextAfterInvalidPass(input: {
  modelName: string;
  prompt: string;
  outline: string;
  invalidText: string;
  jenis: string;
  parameters: Record<string, unknown>;
  dalilContext?: PromptDalilContext;
  traceId: string;
}) {
  const baseMessages = messagesWithOutline(input.prompt, input.traceId, input.outline);
  const invalidReason = providerTextFailureReason(input.jenis, input.invalidText, input.parameters, input.dalilContext);
  const generationSettings = retryGenerationSettingsFor(input.jenis, input.parameters, invalidReason);
  if (generationSettings.max_tokens > maxTokensForRequest(input.jenis, input.parameters)) {
    console.info(
      `[generateText:${input.traceId}] model=${input.modelName} pass=retry token_boost=${generationSettings.max_tokens} reason=${invalidReason}`
    );
  }

  const retryText = await createOpenAITextPass(
    input.modelName,
    [
      ...baseMessages,
      {
        role: "user",
        content: retryInstruction(input.jenis, input.parameters, invalidReason)
      }
    ],
    input.jenis,
    input.parameters,
    input.traceId,
    "retry",
    generationSettings.max_tokens,
    true
  );

  const retryPass = normalizeProviderText(input.jenis, retryText, input.parameters);
  if (!providerTextIsClean(input.jenis, retryPass, input.parameters, input.dalilContext)) {
    return {
      ok: false as const,
      retryPass,
      invalidReason: providerTextFailureReason(input.jenis, retryPass, input.parameters, input.dalilContext)
    };
  }

  return {
    ok: true as const,
    finalText: await finalizeOpenAIText(
      input.modelName,
      input.prompt,
      input.outline,
      retryPass,
      input.jenis,
      input.parameters,
      input.dalilContext,
      input.traceId
    )
  };
}

async function generateTemplatedRukunKhutbahWithOpenAI(
  jenis: string,
  parameters: Record<string, unknown>,
  traceId: string,
  dalilContext?: PromptDalilContext,
  selectedModel?: string
) {
  const webContext = await retrieveWebContextForPrompt(jenis, parameters, traceId);
  const prompt = editorialKhutbahPrompt(jenis, parameters, dalilContext, webContext);

  for (const modelName of modelsForRequest(selectedModel)) {
    try {
      const firstBody = await createOpenAITextPass(
        modelName,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
          { role: "user", content: variationInstruction(traceId) }
        ],
        jenis,
        parameters,
        traceId,
        "templated_rukun_first",
        undefined,
        true
      );
      const firstComposed = composeTemplatedRukunKhutbah(
        jenis,
        parametersWithVariation(parameters, traceId),
        sanitizeGeneratedText(firstBody),
        dalilContext,
        traceId
      );
      if (providerTextIsClean(jenis, firstComposed, parameters, dalilContext) && meetsMinimumLength(jenis, firstComposed, parameters)) {
        console.info(`[generateText:${traceId}] model=${modelName} mode=templated_rukun pass=first jenis=${jenis} status=ok`);
        return firstComposed;
      }

      const reason = providerTextFailureReason(jenis, firstComposed, parameters, dalilContext);
      console.warn(`[generateText:${traceId}] model=${modelName} mode=templated_rukun pass=first status=needs_retry reason=${reason}`);
      const retryBody = await createOpenAITextPass(
        modelName,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
          {
            role: "user",
            content: `Naskah hasil komposisi sistem masih bermasalah: ${reason}.
Tulis ulang hanya isi editorialnya dengan uraian lebih utuh, bahasa target lebih konsisten, dan tanpa menulis rukun/template Arab.`
          }
        ],
        jenis,
        parameters,
        traceId,
        "templated_rukun_retry",
        maxTokensForShortRetry(jenis, parameters, maxTokensForRequest(jenis, parameters)),
        true
      );
      const retryComposed = composeTemplatedRukunKhutbah(
        jenis,
        parametersWithVariation(parameters, traceId),
        sanitizeGeneratedText(retryBody),
        dalilContext,
        traceId
      );
      if (providerTextIsClean(jenis, retryComposed, parameters, dalilContext) && meetsMinimumLength(jenis, retryComposed, parameters)) {
        console.info(`[generateText:${traceId}] model=${modelName} mode=templated_rukun pass=retry jenis=${jenis} status=ok`);
        return retryComposed;
      }

      console.warn(
        `[generateText:${traceId}] model=${modelName} mode=templated_rukun pass=retry status=still_invalid reason=${providerTextFailureReason(jenis, retryComposed, parameters, dalilContext)}`
      );
    } catch (error) {
      console.warn(`[generateText:${traceId}] model=${modelName} mode=templated_rukun provider_failed message=${providerMessage(error)}`);
    }
  }

  return null;
}

export async function generateText(
  jenis: string,
  parameters: Record<string, unknown>,
  dalilContext?: PromptDalilContext,
  customOutline?: { title: string; description: string }[],
  selectedModel?: string
) {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  if (!client) return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  if (shouldUseTemplatedRukunKhutbah(jenis, parameters)) {
    const generated = await generateTemplatedRukunKhutbahWithOpenAI(jenis, parameters, traceId, dalilContext, selectedModel);
    if (generated) {
      logInfo("openai.generate", {
        traceId,
        jenis,
        provider: aiProvider,
        model: "templated-rukun",
        pass: "composed",
        durationMs: Date.now() - startedAt
      });
      return generated;
    }
  }
  const generationSettings = generationSettingsFor(jenis, parameters);
  const initialPrompt = await buildPromptWithRetrievedDalil(jenis, parameters, traceId, dalilContext, { promptMode: "initial" });
  const fullPrompt = await buildPromptWithRetrievedDalil(jenis, parameters, traceId, dalilContext, { promptMode: "full" });

  for (const modelName of modelsForRequest(selectedModel)) {
    try {
      const outline = customOutline
        ? customOutline.map((sec, idx) => `${idx + 1}. ${sec.title}\nDetail: ${sec.description}`).join("\n\n")
        : await createOpenAIOutline(modelName, initialPrompt, jenis, parameters, traceId);
      const baseMessages = messagesWithOutline(initialPrompt, traceId, outline);
      const firstText = await createOpenAITextPass(modelName, baseMessages, jenis, parameters, traceId, "first", undefined, true);
      const firstPass = normalizeProviderText(jenis, firstText, parameters);
      if (providerTextIsClean(jenis, firstPass, parameters, dalilContext)) {
        console.info(`[generateText:${traceId}] model=${modelName} pass=first jenis=${jenis} status=ok`);
        const finalized = await finalizeOpenAIText(modelName, fullPrompt, outline, firstPass, jenis, parameters, dalilContext, traceId);
        logInfo("openai.generate", {
          traceId,
          jenis,
          provider: aiProvider,
          model: modelName,
          pass: "first",
          durationMs: Date.now() - startedAt,
          ...finalized.passMetrics
        });
        return finalized.text;
      }

      const firstPassReason = providerTextFailureReason(jenis, firstPass, parameters, dalilContext);
      console.warn(
        `[generateText:${traceId}] model=${modelName} pass=first jenis=${jenis} status=needs_retry reason=${firstPassReason}`
      );

      const retryGenerationSettings = retryGenerationSettingsFor(jenis, parameters, firstPassReason);
      if (retryGenerationSettings.max_tokens > generationSettings.max_tokens) {
        console.info(
          `[generateText:${traceId}] model=${modelName} pass=retry token_boost=${retryGenerationSettings.max_tokens} reason=${firstPassReason}`
        );
      }
      const retryText = await createOpenAITextPass(
        modelName,
        [
          ...baseMessages,
          {
            role: "user",
            content: retryInstruction(jenis, parameters, firstPassReason)
          }
        ],
        jenis,
        parameters,
        traceId,
        "retry",
        retryGenerationSettings.max_tokens,
        true
      );

      const retryPass = normalizeProviderText(jenis, retryText, parameters);
      if (providerTextIsClean(jenis, retryPass, parameters, dalilContext)) {
        console.info(`[generateText:${traceId}] model=${modelName} pass=retry jenis=${jenis} status=ok`);
        const finalized = await finalizeOpenAIText(modelName, fullPrompt, outline, retryPass, jenis, parameters, dalilContext, traceId);
        logInfo("openai.generate", {
          traceId,
          jenis,
          provider: aiProvider,
          model: modelName,
          pass: "retry",
          durationMs: Date.now() - startedAt,
          ...finalized.passMetrics
        });
        return finalized.text;
      }

      console.warn(
        `[generateText:${traceId}] model=${modelName} pass=retry jenis=${jenis} status=still_invalid reason=${providerTextFailureReason(jenis, retryPass, parameters, dalilContext)}`
      );
    } catch (error) {
      const message = providerMessage(error);
      console.warn(`[generateText:${traceId}] model=${modelName} provider_failed message=${message}`);
    }
  }

  logInfo("openai.generate", {
    traceId,
    jenis,
    provider: aiProvider,
    model: "fallback",
    pass: "local",
    durationMs: Date.now() - startedAt
  });
  console.warn(`[generateText:${traceId}] provider_failed_all fallback=local models=${models.join(",")}`);
  return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
}

export async function* streamGeneratedText(
  jenis: string,
  parameters: Record<string, unknown>,
  dalilContext?: PromptDalilContext,
  customOutline?: { title: string; description: string }[],
  selectedModel?: string,
  hooks?: {
    onFirstChunk?: (info: { traceId: string; provider: string; model: string; firstChunkMs: number }) => void;
    onComplete?: (info: {
      traceId: string;
      provider: string;
      model: string;
      firstChunkMs: number | null;
      totalStreamMs: number;
      validationWarning: boolean;
      validationReason?: string;
      usedFallback: boolean;
      policyPass?: {
        stream: boolean;
        firstPass: boolean;
        final: boolean;
      };
    }) => void;
  }
) {
  if (!client) {
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const fallback = fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
    const firstChunkMs = Date.now() - startedAt;
    hooks?.onFirstChunk?.({ traceId, provider: "local", model: "fallback", firstChunkMs });
    hooks?.onComplete?.({
      traceId,
      provider: "local",
      model: "fallback",
      firstChunkMs,
      totalStreamMs: firstChunkMs,
      validationWarning: false,
      usedFallback: true,
      policyPass: {
        stream: true,
        firstPass: true,
        final: true
      }
    });
    for (const chunk of fallback.match(/[\s\S]{1,240}/g) ?? []) {
      yield chunk;
      await Bun.sleep(3);
    }
    return;
  }

  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  if (shouldUseTemplatedRukunKhutbah(jenis, parameters)) {
    const generated = await generateTemplatedRukunKhutbahWithOpenAI(jenis, parameters, traceId, dalilContext, selectedModel);
    if (generated) {
      const firstChunkMs = Date.now() - startedAt;
      hooks?.onFirstChunk?.({ traceId, provider: aiProvider, model: "templated-rukun", firstChunkMs });
      hooks?.onComplete?.({
        traceId,
        provider: aiProvider,
        model: "templated-rukun",
        firstChunkMs,
        totalStreamMs: firstChunkMs,
        validationWarning: false,
        usedFallback: false,
        policyPass: {
          stream: true,
          firstPass: true,
          final: true
        }
      });
      logInfo("openai.stream", {
        traceId,
        jenis,
        model: "templated-rukun",
        pass: "composed",
        durationMs: firstChunkMs,
        firstChunkMs
      });
      for (const chunk of generated.match(/[\s\S]{1,160}/g) ?? []) {
        yield chunk;
      }
      return;
    }
  }
  const generationSettings = generationSettingsFor(jenis, parameters);
  const prompt = await buildPromptWithRetrievedDalil(jenis, parameters, traceId, dalilContext, {
    preferStreaming: true,
    promptMode: "initial"
  });

  for (const modelName of modelsForRequest(selectedModel)) {
    try {
      const outline = customOutline
        ? customOutline.map((sec, idx) => `${idx + 1}. ${sec.title}\nDetail: ${sec.description}`).join("\n\n")
        : await createOpenAIOutline(modelName, prompt, jenis, parameters, traceId);
      const messages = messagesWithOutline(prompt, traceId, outline);
      let text = "";
      let yielded = false;
      let firstChunkMs: number | null = null;
      const stream = await createStreamingCompletionWithCreditRetry(
        {
          model: modelName,
          stream: true,
          messages,
          ...generationSettings
        },
        traceId
      );

      for await (const part of stream) {
        const content = part.choices[0]?.delta.content;
        if (!content) continue;
        text += content;
        yielded = true;
        if (firstChunkMs === null) {
          firstChunkMs = Date.now() - startedAt;
          hooks?.onFirstChunk?.({ traceId, provider: aiProvider, model: modelName, firstChunkMs });
        }
        yield content;
      }

      if (!yielded) {
        console.warn(`[streamGeneratedText:${traceId}] model=${modelName} jenis=${jenis} status=empty_stream`);
        continue;
      }

      const normalized = normalizeProviderText(jenis, text, parameters);
      const totalStreamMs = Date.now() - startedAt;
      const policyPass = {
        stream: providerTextMeetsAcceptancePolicy("stream", jenis, normalized, parameters, dalilContext),
        firstPass: providerTextMeetsAcceptancePolicy("first_pass", jenis, normalized, parameters, dalilContext),
        final: providerTextMeetsAcceptancePolicy("final", jenis, normalized, parameters, dalilContext)
      };
      if (!policyPass.stream) {
        const invalidReason = providerTextFailureReason(jenis, normalized, parameters, dalilContext);
        console.warn(
          `[streamGeneratedText:${traceId}] model=${modelName} jenis=${jenis} status=completed_with_streamed_validation_warning reason=${invalidReason}`
        );
        hooks?.onComplete?.({
          traceId,
          provider: aiProvider,
          model: modelName,
          firstChunkMs,
          totalStreamMs,
          validationWarning: true,
          validationReason: invalidReason,
          usedFallback: false,
          policyPass
        });
      } else {
        console.info(`[streamGeneratedText:${traceId}] model=${modelName} jenis=${jenis} status=ok_streamed`);
        hooks?.onComplete?.({
          traceId,
          provider: aiProvider,
          model: modelName,
          firstChunkMs,
          totalStreamMs,
          validationWarning: false,
          usedFallback: false,
          policyPass
        });
      }

      logInfo("openai.stream", {
        traceId,
        jenis,
        model: modelName,
        pass: "stream-first",
        durationMs: totalStreamMs,
        firstChunkMs: firstChunkMs ?? totalStreamMs
      });
      return;
    } catch (error) {
      const message = providerMessage(error);
      console.warn(`[streamGeneratedText:${traceId}] model=${modelName} provider_failed message=${message}`);
    }
  }

  const finalText = fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  logInfo("openai.stream", {
    traceId,
    jenis,
    model: "fallback",
    pass: "local",
    durationMs: Date.now() - startedAt
  });
  hooks?.onComplete?.({
    traceId,
    provider: "local",
    model: "fallback",
    firstChunkMs: null,
    totalStreamMs: Date.now() - startedAt,
    validationWarning: false,
    usedFallback: true,
    policyPass: {
      stream: true,
      firstPass: true,
      final: true
    }
  });
  console.warn(`[streamGeneratedText:${traceId}] provider_failed_all fallback=local models=${models.join(",")}`);
  for (const chunk of finalText.match(/[\s\S]{1,240}/g) ?? []) {
    yield chunk;
    await Bun.sleep(3);
  }
}

function revisionPrompt(input: {
  jenis: string;
  parameters: Record<string, unknown>;
  currentContent: string;
  instruction: string;
  targetSection?: string;
  dalilContext?: PromptDalilContext;
}) {
  const targetLanguage = normalizeLanguage(input.parameters.bahasa);
  const target = input.targetSection ? `\nBagian yang difokuskan: ${input.targetSection}` : "";
  const dalilLock = input.dalilContext
    ? `\nDalil yang wajib tetap dipakai dan tidak boleh diganti:
- Tema dalil: ${input.dalilContext.theme}
- Ayat: ${input.dalilContext.quran.map((item) => `${item.reference} | ${item.translation}`).join("; ") || "Tidak ada"}
- Hadits: ${input.dalilContext.hadith.map((item) => `${item.reference} | ${item.translation}`).join("; ") || "Tidak ada"}
`
    : "";
  return `Revisi naskah dakwah berikut sesuai instruksi pengguna.

Aturan:
- Kembalikan naskah final lengkap, bukan catatan perubahan.
- Semua narasi non-heading wajib 100% memakai bahasa ${targetLanguage}; jangan ada campuran bahasa lain, kecuali heading struktur standar yang memang diizinkan.
- Pertahankan struktur utama naskah, heading standar, rukun khutbah, ayat, hadits, dan doa yang sudah benar.
- Jika hanya satu bagian diminta, perbaiki bagian itu tanpa merusak bagian lain.
- Jangan mengganti tema, jenis naskah, ayat, hadits, referensi, teks Arab, atau terjemah inti kecuali instruksi pengguna secara eksplisit meminta koreksi dalil.
- Isi hasil revisi harus tetap sesuai parameter dan tema awal.
- Jangan tampilkan analisis, reasoning, ringkasan perubahan, atau Markdown.
- Semua teks Arab di bagian penting tetap berharakat.

Jenis naskah: ${input.jenis}${target}
Instruksi revisi: ${input.instruction}
${dalilLock}

Parameter:
${Object.entries(input.parameters)
  .map(([key, value]) => `- ${key}: ${String(value)}`)
  .join("\n")}

Naskah saat ini:
${input.currentContent}`;
}

const revisionStopwords = new Set([
  "agar",
  "akan",
  "atau",
  "dan",
  "dengan",
  "di",
  "dari",
  "dalam",
  "hal",
  "ini",
  "itu",
  "jangan",
  "jadi",
  "karena",
  "kepada",
  "lebih",
  "maka",
  "para",
  "pada",
  "saat",
  "sebagai",
  "supaya",
  "tentang",
  "terlalu",
  "untuk",
  "yang"
]);

function revisionFocusClause(instruction: string) {
  const clauseMatch = instruction.match(/\b(?:agar|tentang|pada|untuk|supaya)\s+([^.;:\n]+)/i);
  return (clauseMatch?.[1] ?? instruction).trim();
}

function revisionKeywords(instruction: string) {
  return Array.from(
    new Set(
      revisionFocusClause(instruction)
        .toLowerCase()
        .match(/[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ-]{2,}/g)
        ?.filter((word) => !revisionStopwords.has(word) && !/^per/.test(word) && !/^(tidak|bukan|sangat|cukup|terlalu)$/.test(word)) ?? []
    )
  ).slice(0, 4);
}

function revisionSentenceFor(instruction: string) {
  const keywords = revisionKeywords(instruction);
  if (keywords.length === 0) {
    return "";
  }

  if (keywords.length === 1) {
    return `Fokus pada ${keywords[0]} dipertegas.`;
  }

  if (keywords.length === 2) {
    return `Fokus pada ${keywords[0]} dan ${keywords[1]} dipertegas.`;
  }

  return `Fokus pada ${keywords.slice(0, 3).join(", ")} dipertegas.`;
}

function localRevisionFallback(currentContent: string, instruction: string) {
  console.warn(`[reviseNaskahContent] provider_failed_all applying_local_revision instruction=${instruction.trim().slice(0, 120)}`);

  const content = sanitizeGeneratedText(currentContent).trim();
  if (!content) return content;

  const literalRevision = applyLiteralRevisionInstruction(content, instruction);
  if (literalRevision && isMeaningfullyDifferentRevision(content, literalRevision)) {
    return sanitizeGeneratedText(literalRevision).trim();
  }

  return content;
}

export async function reviseNaskahContent(input: {
  jenis: string;
  parameters: Record<string, unknown>;
  currentContent: string;
  instruction: string;
  targetSection?: string;
  dalilContext?: PromptDalilContext;
}) {
  const literalRevision = applyLiteralRevisionInstruction(input.currentContent, input.instruction);
  if (literalRevision && isMeaningfullyDifferentRevision(input.currentContent, literalRevision)) {
    return sanitizeGeneratedText(literalRevision);
  }

  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const prompt = revisionPrompt(input);
  const quality = createQualityInspector(input.jenis, input.parameters, input.dalilContext);

  if (client) {
    const settings = generationSettingsFor(input.jenis, input.parameters);
    for (const modelName of models) {
      try {
        const response = await createCompletionWithCreditRetry(
          {
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
              { role: "user", content: variationInstruction(traceId) }
            ],
            ...settings
          },
          traceId,
          "revision"
        );
        const text = normalizeProviderText(input.jenis, response.choices[0]?.message.content ?? "", input.parameters);
        if (
          providerTextIsClean(input.jenis, text, input.parameters, input.dalilContext, "final") &&
          isMeaningfullyDifferentRevision(input.currentContent, text) &&
          !quality.needsDalilRepair(text) &&
          !quality.needsEditorialRepair(text)
        ) {
          logInfo("openai.revise", {
            traceId,
            jenis: input.jenis,
            provider: aiProvider,
            model: modelName,
            pass: "first",
            durationMs: Date.now() - startedAt
          });
          return text;
        }

        const retryResponse = await createCompletionWithCreditRetry(
          {
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
              { role: "user", content: repairInstructionFor(input.jenis, input.parameters, text, input.dalilContext) },
              { role: "user", content: editorialRewriteInstructionFor(input.jenis, input.parameters, text, input.dalilContext) },
              { role: "user", content: variationInstruction(traceId) }
            ],
            ...settings
          },
          traceId,
          "revision_repair"
        );
        const retryText = normalizeProviderText(input.jenis, retryResponse.choices[0]?.message.content ?? "", input.parameters);
        if (
          providerTextIsClean(input.jenis, retryText, input.parameters, input.dalilContext, "final") &&
          isMeaningfullyDifferentRevision(input.currentContent, retryText) &&
          !quality.needsDalilRepair(retryText) &&
          !quality.needsEditorialRepair(retryText)
        ) {
          logInfo("openai.revise", {
            traceId,
            jenis: input.jenis,
            provider: aiProvider,
            model: modelName,
            pass: "retry",
            durationMs: Date.now() - startedAt
          });
          return retryText;
        }
        console.warn(
          `[reviseNaskahContent:${traceId}] model=${modelName} invalid_revision reason=${providerTextFailureReason(input.jenis, retryText, input.parameters, input.dalilContext)}`
        );
      } catch (error) {
        console.warn(`[reviseNaskahContent:${traceId}] model=${modelName} provider_failed message=${providerMessage(error)}`);
      }
    }
  }

  logInfo("openai.revise", {
    traceId,
    jenis: input.jenis,
    provider: "fallback",
    model: "local",
    pass: "local",
    durationMs: Date.now() - startedAt
  });
  return localRevisionFallback(input.currentContent, input.instruction);
}

async function classifyThemeWithAI(theme: string): Promise<string | null> {
  const labels = thematicDalilSets.map((set) => set.label);
  const prompt = `Klasifikasikan tema ceramah/khutbah berikut ke dalam salah satu kategori yang paling relevan dari daftar di bawah ini.

Contoh pemetaan tema:
- "Hukum Pinjaman Online dan Bunga Bank" -> Klasifikasikan sebagai: "riba, muamalah, dan rezeki halal"
- "Bahaya judi online slot" -> Klasifikasikan sebagai: "judi, maisir, dan bahaya judi online"
- "Mengatasi pacaran bebas anak muda" -> Klasifikasikan sebagai: "menjauhi zina, pergaulan bebas, dan menjaga kehormatan"
- "Cara mendidik anak secara islami" -> Klasifikasikan sebagai: "pendidikan anak, parenting remaja, dan tanggung jawab keluarga"
- "Menghadiri kajian dan belajar fiqih" -> Klasifikasikan sebagai: "ilmu, belajar, dan mengamalkan ilmu"

Tema dari user: "${theme}"

Daftar kategori yang tersedia:
${labels.map((l) => `- ${l}`).join("\n")}

Aturan:
- Balas HANYA dengan nama kategori yang tepat dari daftar di atas, persis seperti yang tertulis (case-sensitive).
- Jangan berikan penjelasan, tanda kutip, atau teks tambahan apa pun.
- Jika tidak ada kategori yang relevan sama sekali, balas dengan: "tidak-ada"`;

  try {
    if (!client) return null;
    const modelName = models[0] || model;
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 60
    });
    const resultText = response.choices[0]?.message.content?.trim();
    if (resultText && labels.includes(resultText)) {
      return resultText;
    }
    return null;
  } catch (error) {
    console.warn("[classifyThemeWithAI] Error classifying theme:", error);
    return null;
  }
}

registerThemeClassifier(classifyThemeWithAI);

export async function generateOutlineProposal(
  jenis: string,
  parameters: Record<string, unknown>,
  dalilContext: PromptDalilContext,
  selectedModel?: string
): Promise<{ title: string; description: string }[]> {
  const traceId = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const theme = String(parameters.temaUtama ?? parameters.tema ?? parameters.topik ?? parameters.topikSingkat ?? "Ketakwaan");
  const targetLanguage = normalizeLanguage(parameters.bahasa);

  const prompt = `Buat usulan kerangka (outline) dakwah terstruktur untuk jenis naskah "${jenis}" dengan tema "${theme}" dalam bahasa "${targetLanguage}".
Gunakan dalil-dalil berikut sebagai landasan:
Quran: ${dalilContext.quran.map(d => `${d.reference} (${d.translation})`).join("; ")}
Hadits: ${dalilContext.hadith.map(d => `${d.reference} (${d.translation})`).join("; ")}

Kembalikan output dalam format JSON array valid yang berisi object dengan properti "title" (judul bagian/subbahasan) dan "description" (fokus bahasan atau instruksi detail bagian tersebut).
Format JSON wajib persis seperti ini:
[
  {
    "title": "...",
    "description": "..."
  }
]

Hanya kembalikan JSON array valid. Jangan berikan teks pembuka atau penutup lain di luar JSON.`;

  try {
    let rawText = "";
    if (client) {
      for (const modelName of modelsForRequest(selectedModel)) {
        try {
          const response = await client.chat.completions.create({
            model: modelName,
            messages: [
              { role: "system", content: "Anda adalah asisten pembuat kerangka dakwah terstruktur dalam format JSON." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1000
          });
          rawText = response.choices[0]?.message.content ?? "";
          break;
        } catch (error) {
          console.warn(`[generateOutlineProposal] model=${modelName} failed:`, error);
        }
      }
    } else {
      throw new Error("Provider AI tidak terkonfigurasi.");
    }

    const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim()
      })).filter(item => item.title);
    }
  } catch (error) {
    console.error(`[generateOutlineProposal] failed:`, error);
  }

  // Fallback static outline
  return [
    { title: "Mukadimah", description: "Pembuka khutbah/ceramah, salam, puji syukur kepada Allah, syahadat, shalawat, dan wasiat takwa." },
    { title: "Pembahasan Utama", description: "Menguraikan tema utama dan mengaitkannya dengan dalil Al-Qur'an dan Hadits yang relevan." },
    { title: "Pesan Praktis", description: "Langkah nyata sehari-hari yang bisa dipraktikkan jamaah dalam kehidupan berkeluarga dan bermasyarakat." },
    { title: "Doa Penutup", description: "Memohon ampunan, berkah, keselamatan, dan petunjuk bagi seluruh kaum muslimin." }
  ];
}
