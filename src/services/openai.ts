import OpenAI from "openai";
import {
  buildPrompt,
  completeMissingSecondKhutbah,
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
  rhetoricStyleGuidanceFor,
  sanitizeGeneratedText,
  thematicDalilSets
} from "../utils/content";
import { qualityReportFor } from "../utils/quality";
import { retrieveDalilContext } from "./myquran";
import { registerThemeClassifier } from "../utils/themeClassifier";

const apiKey = process.env.OPENAI_API_KEY;
const aiProvider = String(process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
export function parseOpenAIModels(modelsValue?: string, fallbackModel = "gpt-4o-mini") {
  return (modelsValue || fallbackModel)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const models = parseOpenAIModels(process.env.OPENAI_MODELS, model);
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const geminiModels = parseOpenAIModels(process.env.GEMINI_MODELS, geminiModel);
const baseURL = process.env.OPENAI_BASE_URL || undefined;
const requestTimeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 30_000);
const client = apiKey ? new OpenAI({ apiKey, baseURL, timeout: requestTimeout }) : null;
const configuredMaxTokens = Number(process.env.OPENAI_MAX_TOKENS ?? 5500);
const maxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0 ? Math.floor(configuredMaxTokens) : 5500;
const systemPrompt =
  "Anda adalah penulis naskah dakwah Islam yang natural, hangat, peka konteks jamaah, dan menulis naskah mimbar yang utuh, bukan ringkasan. Tampilkan hanya naskah final yang siap dibacakan. Ikuti bahasa target dari user untuk semua narasi non-heading. Dilarang menampilkan reasoning, analisis, rencana, komentar proses, catatan model, atau bahasa Inggris. Jangan gunakan Markdown. Gunakan rujukan ayat/hadits secara hati-hati dan jangan mengarang sumber. Jangan menambah klaim sejarah, faedah, atau hukum bila tidak benar-benar didukung konteks dan dalil yang tersedia. Semua teks Arab wajib berharakat, khususnya pada mukadimah, syahadat, ayat Al-Qur'an, hadits, penutup khutbah pertama, pembuka khutbah kedua, dan doa.";
const baseGenerationSettings = {
  temperature: 0.9,
  top_p: 0.95,
  presence_penalty: 0.35,
  frequency_penalty: 0.45
};

const maxTokensByDurationMinutes: Record<number, number> = {
  5: 1200,
  7: 1800,
  10: 2500,
  15: 3500,
  20: 4500
};

function contentTokenCeiling(jenis: string) {
  if (jenis === "kultum") return 2000;
  if (jenis === "ceramah") return 4000;
  if (jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha") return 4500;
  if (jenis === "nikah") return 3500;
  return 3000;
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

function providerTextIsClean(jenis: string, text: string, parameters: Record<string, unknown>) {
  return (
    isGeneratedTextAcceptable(jenis, text, parameters) &&
    meetsMinimumLength(jenis, text, parameters) &&
    hasSubstantialArabicOpening(jenis, text) &&
    hasSubstantialArabicClosingPrayer(jenis, text)
  );
}

function normalizeProviderText(jenis: string, text: string, parameters: Record<string, unknown>) {
  return completeMissingSecondKhutbah(jenis, sanitizeGeneratedText(text), parameters);
}

function providerTextFailureReason(jenis: string, text: string, parameters: Record<string, unknown>) {
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  const missingSections = missingRequiredArabicSections(jenis, text);
  const languageMismatch = !matchesTargetLanguage(text, targetLanguage);
  const contextLeak = hasContextLeak(jenis, text);
  const tooShort = !meetsMinimumLength(jenis, text, parameters);
  const thinOpening = !hasSubstantialArabicOpening(jenis, text);
  const thinClosingPrayer = !hasSubstantialArabicClosingPrayer(jenis, text);

  if (missingSections.length > 0) return `missing_required_arabic_sections:${missingSections.join(",")}`;
  if (languageMismatch) return `language_mismatch:${targetLanguage}`;
  if (contextLeak) return `context_leak:${jenis}`;
  if (tooShort) return `too_short:min_words_${minimumWordCountFor(jenis, parameters)}`;
  if (thinOpening) return "thin_arabic_opening";
  if (thinClosingPrayer) return "thin_arabic_closing_prayer";
  return "undiacritized_arabic_detected";
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
    return await withProviderTimeout(client!.chat.completions.create(params));
  } catch (error) {
    const message = providerMessage(error);
    const retryMaxTokens = retryMaxTokensForProviderError(message, params.max_tokens ?? maxTokens);
    if (!retryMaxTokens || retryMaxTokens >= (params.max_tokens ?? maxTokens)) throw error;

    console.warn(
      `[generateText:${traceId}] pass=${pass} provider_retry=max_tokens requested=${params.max_tokens ?? maxTokens} retry=${retryMaxTokens} message=${message}`
    );
    return await withProviderTimeout(client!.chat.completions.create({ ...params, max_tokens: retryMaxTokens }));
  }
}

async function createStreamingCompletionWithCreditRetry(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
  traceId: string
) {
  try {
    return await withProviderTimeout(client!.chat.completions.create(params));
  } catch (error) {
    const message = providerMessage(error);
    const retryMaxTokens = retryMaxTokensForProviderError(message, params.max_tokens ?? maxTokens);
    if (!retryMaxTokens || retryMaxTokens >= (params.max_tokens ?? maxTokens)) throw error;

    console.warn(
      `[streamGeneratedText:${traceId}] provider_retry=max_tokens requested=${params.max_tokens ?? maxTokens} retry=${retryMaxTokens} message=${message}`
    );
    return await withProviderTimeout(client!.chat.completions.create({ ...params, max_tokens: retryMaxTokens }));
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
  providedDalilContext?: PromptDalilContext
) {
  try {
    const dalilContext = providedDalilContext ?? (await retrieveDalilContext(jenis, parameters));
    console.info(
      `[generateText:${traceId}] dalil_source=${dalilContext.source} quran=${dalilContext.quran[0]?.reference ?? "none"} hadith=${dalilContext.hadith[0]?.reference ?? "none"}`
    );
    return buildPrompt(jenis, parameters, dalilContext);
  } catch (error) {
    console.warn(`[generateText:${traceId}] dalil_retrieval_failed message=${providerMessage(error)}`);
    return buildPrompt(jenis, parameters);
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

function retryInstruction(jenis: string, parameters: Record<string, unknown>, reason: string) {
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  const arabicOnlySecondInstruction = jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha"
    ? ' Setelah heading "Khutbah Kedua" seluruh isi harus hanya teks Arab berharakat sampai akhir naskah; jangan tulis Pesan Praktis, Doa Penutup, Takbir Pembuka Kedua, terjemah, transliterasi, sapaan Indonesia, atau narasi Indonesia di bagian itu. Jika perlu heading doa, gunakan heading Arab "الدُّعَاءُ". Untuk khutbah Idul Fitri/Idul Adha, awali isi Khutbah Kedua langsung dengan takbir Arab 7 kali.'
    : "";
  const styleGuidance = rhetoricStyleGuidanceFor(parameters);
  const styleInstruction = styleGuidance ? `\nIkuti instruksi gaya retorika berikut secara ketat:\n${styleGuidance}` : "";

  return `Ulangi naskah final dari awal. Bahasa target wajib ${targetLanguage}; semua sapaan, transisi, isi, renungan, terjemah/penjelasan ayat-hadits, pesan praktis, dan penutup harus memakai bahasa target tersebut, bukan bahasa Indonesia, kecuali heading struktur standar. Naskah sebelumnya bermasalah: ${reason}. Jangan ringkas; penuhi minimal ${minimumWordCountFor(jenis, parameters)} kata dan buat uraian utama mengalir dalam banyak paragraf. ${retryLengthInstructionFor(jenis)} Wajib ikuti rukun khutbah: hamdalah, shalawat Nabi, dan wasiat takwa harus ada di khutbah pertama dan kedua; syahadat Arab berharakat harus ada di mukadimah khutbah pertama; ayat Al-Qur'an Arab harus ada minimal di salah satu khutbah; doa untuk kaum mukminin harus ada di khutbah kedua.${arabicOnlySecondInstruction} Untuk khutbah Idul Fitri/Idul Adha, khutbah pertama diawali takbir Arab 9 kali dan khutbah kedua diawali takbir Arab 7 kali. Terapkan STYLE PROFILE: dakwah.id sesuai jenis naskah agar pembuka, isi, penutup, dan doa bervariasi, humanis, dan tidak terasa template. Pembuka Arab harus utuh, bukan satu baris pendek. Doa penutup Arab minimal 4-6 kalimat doa berharakat, memuat doa untuk kaum mukminin, dan jangan hanya satu doa pendek. Jangan tampilkan label teknis seperti Rukun 1/2/3/4/5 pada naskah final. Semua teks Arab wajib diberi harakat lengkap (tasykil), tanpa Arab gundul.${styleInstruction}`;
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
  return report.checks.some(
    (item) =>
      !item.passed &&
      (item.severity === "critical" ||
        item.id.includes("dalil") ||
        item.id.includes("quran") ||
        item.id.includes("hadith") ||
        item.id === "arabic_diacritics")
  );
}

function needsEditorialRepair(jenis: string, text: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  const report = qualityReportFor(jenis, text, parameters, dalilContext);
  return report.checks.some((item) => !item.passed && (item.id === "template_language" || item.id === "theme_focus_keywords"));
}

function repairInstructionFor(jenis: string, parameters: Record<string, unknown>, text: string, dalilContext?: PromptDalilContext) {
  const failures = failedQualityDetails(jenis, text, parameters, dalilContext) || "Validasi quality report belum memadai.";
  return `Perbaiki naskah final berikut agar lolos validasi. Kembalikan naskah final lengkap saja.

Masalah validasi:
${failures}

Aturan repair:
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
- Bahasa harus natural, lisan, jelas, dan tidak terasa template.
- Isi utama harus lebih spesifik melayani tema yang dipilih, bukan nasihat umum yang bisa dipakai untuk tema apa saja.
- Setelah dalil disebut, jelaskan kaitannya langsung dengan tema dan kondisi jamaah.
- Pertahankan semua bagian Arab penting tetap berharakat.${styleInstruction}
- Jangan tampilkan catatan proses, ringkasan perubahan, atau Markdown.

Naskah:
${text}`;
}

function naturalRewriteInstructionFor(text: string) {
  return `Haluskan naskah final berikut agar lebih natural, lisan, jernih, dan tidak terasa template.

Aturan:
- Jangan menambah, menghapus, atau mengganti ayat/hadits, referensi, teks Arab, terjemah inti, grade, takhrij, heading wajib, rukun khutbah, atau doa wajib.
- Kurangi pengulangan, perbaiki transisi, dan buat paragraf lebih enak dibacakan.
- Jangan menampilkan catatan proses, ringkasan perubahan, atau Markdown.
- Kembalikan naskah final lengkap saja.

Naskah:
${text}`;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function geminiTextFromResponse(data: GeminiResponse) {
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

function geminiStrictStructureInstruction(jenis: string) {
  if (jenis !== "khutbah-jumat" && jenis !== "idul-fitri" && jenis !== "idul-adha") return "";

  if (jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha") {
    const idulSecondTakbir = jenis === "idul-fitri" || jenis === "idul-adha"
      ? "\n- Setelah heading \"Khutbah Kedua\", awali langsung dengan takbir Arab 7 kali tanpa heading \"Takbir Pembuka Kedua\"."
      : "";
    const idulFirstTakbirInstruction = jenis === "idul-fitri" || jenis === "idul-adha"
      ? "- Setelah heading \"Khutbah Pertama\", awali langsung dengan takbir Arab 9 kali tanpa heading tambahan.\n"
      : "";
    return `ATURAN STRUKTUR MUTLAK UNTUK GEMINI:
- Gunakan heading persis seperti daftar ini. Jangan tambahkan titik dua setelah heading. Jangan terjemahkan heading. Jangan memakai Markdown.
- Urutan wajib:
Khutbah Pertama
Allah SWT berfirman dalam AlQuran
Rasulullah SAW bersabda
Penutup Khutbah Pertama
Khutbah Kedua
- Setelah heading "Khutbah Kedua", seluruh isi harus hanya teks Arab berharakat sampai akhir naskah.
- Jangan tulis heading "Pesan Praktis", "Doa Penutup", "Takbir Pembuka Kedua", terjemah, transliterasi, sapaan Indonesia, atau narasi Indonesia di bagian Khutbah Kedua.
- Jika perlu heading doa di Khutbah Kedua, gunakan heading Arab "الدُّعَاءُ".
- Di bawah "Khutbah Pertama" sebelum "Allah SWT berfirman dalam AlQuran", wajib ada Arab berharakat yang memuat hamdalah, syahadat lengkap أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ dan أَشْهَدُ أَنَّ مُحَمَّدًا رَسُوْلُ اللهِ, shalawat Nabi, dan wasiat takwa.
- Di bawah "Khutbah Kedua", wajib ada Arab berharakat yang memuat hamdalah, shalawat Nabi, wasiat takwa, dan doa untuk kaum mukminin memakai kata الْمُؤْمِنِيْنَ atau الْمُسْلِمِيْنَ.
${idulFirstTakbirInstruction}- Di bawah "Allah SWT berfirman dalam AlQuran", wajib ada ayat Arab berharakat, terjemah, dan rujukan.
- Di bawah "Rasulullah SAW bersabda", wajib ada hadits Arab berharakat, terjemah, dan rujukan.${idulSecondTakbir}
- Jika ada satu heading atau rukun yang tidak ditulis, hasil dianggap gagal.`;
  }

  return "";
}

async function createGeminiCompletion(modelName: string, prompt: string, jenis: string, parameters: Record<string, unknown>) {
  if (!geminiApiKey) throw new Error("GEMINI_API_KEY belum diisi.");
  const response = await withProviderTimeout(
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: baseGenerationSettings.temperature,
          topP: baseGenerationSettings.top_p,
          maxOutputTokens: maxTokensForRequest(jenis, parameters)
        }
      })
    })
  );

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) throw new Error(data.error?.message || `Gemini request gagal: ${response.status}`);
  return data;
}

async function createOpenAITextPass(
  modelName: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  jenis: string,
  parameters: Record<string, unknown>,
  traceId: string,
  pass: string,
  maxTokenOverride?: number
) {
  const response = await createCompletionWithCreditRetry(
    {
      model: modelName,
      messages,
      ...generationSettingsFor(jenis, parameters),
      ...(maxTokenOverride ? { max_tokens: maxTokenOverride } : {})
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
  let output = injectRetrievedDalil(normalizeProviderText(jenis, text, parameters), dalilContext);

  if (needsDalilRepair(jenis, output, parameters, dalilContext)) {
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
      if (providerTextIsClean(jenis, cleanRepair, parameters)) output = cleanRepair;
    } catch (error) {
      console.warn(`[generateText:${traceId}] model=${modelName} pass=quality_repair_failed message=${providerMessage(error)}`);
    }
  }

  if (needsEditorialRepair(jenis, output, parameters, dalilContext)) {
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
        providerTextIsClean(jenis, cleanEditorialRewrite, parameters) &&
        !needsDalilRepair(jenis, cleanEditorialRewrite, parameters, dalilContext) &&
        !needsEditorialRepair(jenis, cleanEditorialRewrite, parameters, dalilContext)
      ) {
        output = cleanEditorialRewrite;
      }
    } catch (error) {
      console.warn(`[generateText:${traceId}] model=${modelName} pass=editorial_rewrite_failed message=${providerMessage(error)}`);
    }
  }

  try {
    const rewritten = await createOpenAITextPass(
      modelName,
      [...messagesWithOutline(prompt, traceId, outline), { role: "user", content: naturalRewriteInstructionFor(output) }],
      jenis,
      parameters,
      traceId,
      "natural_rewrite"
    );
    const cleanRewrite = injectRetrievedDalil(normalizeProviderText(jenis, rewritten, parameters), dalilContext);
    if (
      providerTextIsClean(jenis, cleanRewrite, parameters) &&
      !needsDalilRepair(jenis, cleanRewrite, parameters, dalilContext) &&
      !needsEditorialRepair(jenis, cleanRewrite, parameters, dalilContext)
    ) {
      output = cleanRewrite;
    }
  } catch (error) {
    console.warn(`[generateText:${traceId}] model=${modelName} pass=natural_rewrite_failed message=${providerMessage(error)}`);
  }

  return output;
}

async function createGeminiOutline(modelName: string, prompt: string, jenis: string, parameters: Record<string, unknown>, traceId: string) {
  try {
    const response = await createGeminiCompletion(modelName, `${prompt}\n\n${outlineInstruction(jenis, parameters)}`, jenis, parameters);
    return sanitizeGeneratedText(geminiTextFromResponse(response)) || staticOutlineFor(jenis);
  } catch (error) {
    console.warn(`[generateText:${traceId}] provider=gemini model=${modelName} pass=outline_failed message=${providerMessage(error)}`);
    return staticOutlineFor(jenis);
  }
}

async function finalizeGeminiText(
  modelName: string,
  prompt: string,
  outline: string,
  text: string,
  jenis: string,
  parameters: Record<string, unknown>,
  dalilContext: PromptDalilContext | undefined,
  traceId: string
) {
  let output = injectRetrievedDalil(normalizeProviderText(jenis, text, parameters), dalilContext);
  const contextualPrompt = `${prompt}\n\nKerangka internal yang wajib diikuti tetapi jangan ditampilkan:\n${outline}`;

  if (needsDalilRepair(jenis, output, parameters, dalilContext)) {
    try {
      const response = await createGeminiCompletion(
        modelName,
        `${contextualPrompt}\n\n${repairInstructionFor(jenis, parameters, output, dalilContext)}`,
        jenis,
        parameters
      );
      const cleanRepair = injectRetrievedDalil(normalizeProviderText(jenis, geminiTextFromResponse(response), parameters), dalilContext);
      if (providerTextIsClean(jenis, cleanRepair, parameters)) output = cleanRepair;
    } catch (error) {
      console.warn(`[generateText:${traceId}] provider=gemini model=${modelName} pass=quality_repair_failed message=${providerMessage(error)}`);
    }
  }

  if (needsEditorialRepair(jenis, output, parameters, dalilContext)) {
    try {
      const response = await createGeminiCompletion(
        modelName,
        `${contextualPrompt}\n\n${editorialRewriteInstructionFor(jenis, parameters, output, dalilContext)}`,
        jenis,
        parameters
      );
      const cleanEditorialRewrite = injectRetrievedDalil(normalizeProviderText(jenis, geminiTextFromResponse(response), parameters), dalilContext);
      if (
        providerTextIsClean(jenis, cleanEditorialRewrite, parameters) &&
        !needsDalilRepair(jenis, cleanEditorialRewrite, parameters, dalilContext) &&
        !needsEditorialRepair(jenis, cleanEditorialRewrite, parameters, dalilContext)
      ) {
        output = cleanEditorialRewrite;
      }
    } catch (error) {
      console.warn(`[generateText:${traceId}] provider=gemini model=${modelName} pass=editorial_rewrite_failed message=${providerMessage(error)}`);
    }
  }

  try {
    const response = await createGeminiCompletion(modelName, `${contextualPrompt}\n\n${naturalRewriteInstructionFor(output)}`, jenis, parameters);
    const cleanRewrite = injectRetrievedDalil(normalizeProviderText(jenis, geminiTextFromResponse(response), parameters), dalilContext);
    if (
      providerTextIsClean(jenis, cleanRewrite, parameters) &&
      !needsDalilRepair(jenis, cleanRewrite, parameters, dalilContext) &&
      !needsEditorialRepair(jenis, cleanRewrite, parameters, dalilContext)
    ) output = cleanRewrite;
  } catch (error) {
    console.warn(`[generateText:${traceId}] provider=gemini model=${modelName} pass=natural_rewrite_failed message=${providerMessage(error)}`);
  }

  return output;
}

async function generateTextWithGemini(
  jenis: string,
  parameters: Record<string, unknown>,
  traceId: string,
  dalilContext?: PromptDalilContext
) {
  const prompt = await buildPromptWithRetrievedDalil(jenis, parameters, traceId, dalilContext);
  const basePromptRoot = `${prompt}\n\n${geminiStrictStructureInstruction(jenis)}\n\n${variationInstruction(traceId)}`;

  for (const modelName of geminiModels) {
    try {
      const outline = await createGeminiOutline(modelName, basePromptRoot, jenis, parameters, traceId);
      const basePrompt = `${basePromptRoot}\n\nKerangka internal yang wajib diikuti tetapi jangan ditampilkan:\n${outline}`;
      const firstResponse = await createGeminiCompletion(modelName, basePrompt, jenis, parameters);
      const firstPass = normalizeProviderText(jenis, geminiTextFromResponse(firstResponse), parameters);
      if (providerTextIsClean(jenis, firstPass, parameters)) {
        console.info(`[generateText:${traceId}] provider=gemini model=${modelName} pass=first jenis=${jenis} status=ok`);
        return finalizeGeminiText(modelName, basePromptRoot, outline, firstPass, jenis, parameters, dalilContext, traceId);
      }

      const firstPassReason = providerTextFailureReason(jenis, firstPass, parameters);
      console.warn(
        `[generateText:${traceId}] provider=gemini model=${modelName} pass=first jenis=${jenis} status=needs_retry reason=${firstPassReason}`
      );

      const retryResponse = await createGeminiCompletion(
        modelName,
        `${basePrompt}\n\n${retryInstruction(jenis, parameters, firstPassReason)}`,
        jenis,
        parameters
      );
      const retryPass = normalizeProviderText(jenis, geminiTextFromResponse(retryResponse), parameters);
      if (providerTextIsClean(jenis, retryPass, parameters)) {
        console.info(`[generateText:${traceId}] provider=gemini model=${modelName} pass=retry jenis=${jenis} status=ok`);
        return finalizeGeminiText(modelName, basePromptRoot, outline, retryPass, jenis, parameters, dalilContext, traceId);
      }

      console.warn(
        `[generateText:${traceId}] provider=gemini model=${modelName} pass=retry jenis=${jenis} status=still_invalid reason=${providerTextFailureReason(jenis, retryPass, parameters)}`
      );
    } catch (error) {
      console.warn(`[generateText:${traceId}] provider=gemini model=${modelName} provider_failed message=${providerMessage(error)}`);
    }
  }

  console.warn(`[generateText:${traceId}] provider=gemini provider_failed_all fallback=local models=${geminiModels.join(",")}`);
  return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
}

export async function generateText(jenis: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (aiProvider === "gemini") return generateTextWithGemini(jenis, parameters, traceId, dalilContext);
  if (!client) return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  const generationSettings = generationSettingsFor(jenis, parameters);
  const prompt = await buildPromptWithRetrievedDalil(jenis, parameters, traceId, dalilContext);

  for (const modelName of models) {
    try {
      const outline = await createOpenAIOutline(modelName, prompt, jenis, parameters, traceId);
      const baseMessages = messagesWithOutline(prompt, traceId, outline);
      const response = await createCompletionWithCreditRetry(
        {
          model: modelName,
          messages: baseMessages,
          ...generationSettings
        },
        traceId,
        "first"
      );

      const firstPass = normalizeProviderText(jenis, response.choices[0]?.message.content ?? "", parameters);
      if (providerTextIsClean(jenis, firstPass, parameters)) {
        console.info(`[generateText:${traceId}] model=${modelName} pass=first jenis=${jenis} status=ok`);
        return finalizeOpenAIText(modelName, prompt, outline, firstPass, jenis, parameters, dalilContext, traceId);
      }

      const firstPassReason = providerTextFailureReason(jenis, firstPass, parameters);
      console.warn(
        `[generateText:${traceId}] model=${modelName} pass=first jenis=${jenis} status=needs_retry reason=${firstPassReason}`
      );

      const retryResponse = await createCompletionWithCreditRetry(
        {
          model: modelName,
          messages: [
            ...baseMessages,
            {
              role: "user",
              content: retryInstruction(jenis, parameters, firstPassReason)
            }
          ],
          ...generationSettings
        },
        traceId,
        "retry"
      );

      const retryPass = normalizeProviderText(jenis, retryResponse.choices[0]?.message.content ?? "", parameters);
      if (providerTextIsClean(jenis, retryPass, parameters)) {
        console.info(`[generateText:${traceId}] model=${modelName} pass=retry jenis=${jenis} status=ok`);
        return finalizeOpenAIText(modelName, prompt, outline, retryPass, jenis, parameters, dalilContext, traceId);
      }

      console.warn(
        `[generateText:${traceId}] model=${modelName} pass=retry jenis=${jenis} status=still_invalid reason=${providerTextFailureReason(jenis, retryPass, parameters)}`
      );
    } catch (error) {
      const message = providerMessage(error);
      console.warn(`[generateText:${traceId}] model=${modelName} provider_failed message=${message}`);
    }
  }

  console.warn(`[generateText:${traceId}] provider_failed_all fallback=local models=${models.join(",")}`);
  return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
}

export async function* streamGeneratedText(jenis: string, parameters: Record<string, unknown>, dalilContext?: PromptDalilContext) {
  if (aiProvider === "gemini") {
    const finalText = await generateText(jenis, parameters, dalilContext);
    for (const chunk of finalText.match(/[\s\S]{1,240}/g) ?? []) {
      yield chunk;
    }
    return;
  }

  if (!client) {
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fallback = fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
    for (const chunk of fallback.match(/[\s\S]{1,240}/g) ?? []) {
      yield chunk;
      await Bun.sleep(3);
    }
    return;
  }

  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generationSettings = generationSettingsFor(jenis, parameters);
  const prompt = await buildPromptWithRetrievedDalil(jenis, parameters, traceId, dalilContext);
  let hadProviderOutput = false;

  for (const modelName of models) {
    try {
      const outline = await createOpenAIOutline(modelName, prompt, jenis, parameters, traceId);
      const messages = messagesWithOutline(prompt, traceId, outline);
      const stream = await createStreamingCompletionWithCreditRetry(
        {
          model: modelName,
          stream: true,
          messages,
          ...generationSettings
        },
        traceId
      );

      let text = "";
      for await (const part of stream) {
        const content = part.choices[0]?.delta.content;
        if (content) text += content;
      }

      const clean = normalizeProviderText(jenis, text, parameters);
      if (providerTextIsClean(jenis, clean, parameters)) {
        console.info(`[streamGeneratedText:${traceId}] model=${modelName} jenis=${jenis} status=ok`);
        const finalText = await finalizeOpenAIText(modelName, prompt, outline, clean, jenis, parameters, dalilContext, traceId);
        for (const chunk of finalText.match(/[\s\S]{1,160}/g) ?? []) {
          yield chunk;
        }
        return;
      }

      hadProviderOutput = Boolean(clean);
      console.warn(
        `[streamGeneratedText:${traceId}] model=${modelName} jenis=${jenis} status=invalid reason=${providerTextFailureReason(jenis, clean, parameters)}`
      );
    } catch (error) {
      const message = providerMessage(error);
      console.warn(`[streamGeneratedText:${traceId}] model=${modelName} provider_failed message=${message}`);
    }
  }

  const finalText = hadProviderOutput ? await generateText(jenis, parameters, dalilContext) : fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  if (!hadProviderOutput) console.warn(`[streamGeneratedText:${traceId}] provider_failed_all fallback=local models=${models.join(",")}`);
  for (const chunk of finalText.match(/[\s\S]{1,240}/g) ?? []) {
    yield chunk;
    if (!hadProviderOutput) {
      await Bun.sleep(3);
    }
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

function localRevisionFallback(currentContent: string, instruction: string) {
  console.warn(`[reviseNaskahContent] provider_failed_all keeping_current_content instruction=${instruction.trim().slice(0, 120)}`);
  return sanitizeGeneratedText(currentContent);
}

export async function reviseNaskahContent(input: {
  jenis: string;
  parameters: Record<string, unknown>;
  currentContent: string;
  instruction: string;
  targetSection?: string;
  dalilContext?: PromptDalilContext;
}) {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const prompt = revisionPrompt(input);

  if (aiProvider === "gemini" && geminiApiKey) {
    for (const modelName of geminiModels) {
      try {
        const response = await createGeminiCompletion(modelName, prompt, input.jenis, input.parameters);
        const text = normalizeProviderText(input.jenis, geminiTextFromResponse(response), input.parameters);
        if (
          providerTextIsClean(input.jenis, text, input.parameters) &&
          !needsDalilRepair(input.jenis, text, input.parameters, input.dalilContext) &&
          !needsEditorialRepair(input.jenis, text, input.parameters, input.dalilContext)
        ) return text;

        const retryResponse = await createGeminiCompletion(
          modelName,
          `${prompt}\n\n${repairInstructionFor(input.jenis, input.parameters, text, input.dalilContext)}\n\n${editorialRewriteInstructionFor(input.jenis, input.parameters, text, input.dalilContext)}`,
          input.jenis,
          input.parameters
        );
        const retryText = normalizeProviderText(input.jenis, geminiTextFromResponse(retryResponse), input.parameters);
        if (
          providerTextIsClean(input.jenis, retryText, input.parameters) &&
          !needsDalilRepair(input.jenis, retryText, input.parameters, input.dalilContext) &&
          !needsEditorialRepair(input.jenis, retryText, input.parameters, input.dalilContext)
        ) return retryText;
        console.warn(
          `[reviseNaskahContent:${traceId}] provider=gemini model=${modelName} invalid_revision reason=${providerTextFailureReason(input.jenis, retryText, input.parameters)}`
        );
      } catch (error) {
        console.warn(`[reviseNaskahContent:${traceId}] provider=gemini model=${modelName} provider_failed message=${providerMessage(error)}`);
      }
    }
  }

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
          providerTextIsClean(input.jenis, text, input.parameters) &&
          !needsDalilRepair(input.jenis, text, input.parameters, input.dalilContext) &&
          !needsEditorialRepair(input.jenis, text, input.parameters, input.dalilContext)
        ) return text;

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
          providerTextIsClean(input.jenis, retryText, input.parameters) &&
          !needsDalilRepair(input.jenis, retryText, input.parameters, input.dalilContext) &&
          !needsEditorialRepair(input.jenis, retryText, input.parameters, input.dalilContext)
        ) return retryText;
        console.warn(
          `[reviseNaskahContent:${traceId}] model=${modelName} invalid_revision reason=${providerTextFailureReason(input.jenis, retryText, input.parameters)}`
        );
      } catch (error) {
        console.warn(`[reviseNaskahContent:${traceId}] model=${modelName} provider_failed message=${providerMessage(error)}`);
      }
    }
  }

  return localRevisionFallback(input.currentContent, input.instruction);
}

async function classifyThemeWithAI(theme: string): Promise<string | null> {
  const labels = thematicDalilSets.map((set) => set.label);
  const prompt = `Klasifikasikan tema ceramah/khutbah berikut ke dalam salah satu kategori yang paling relevan dari daftar di bawah ini.
Tema dari user: "${theme}"

Daftar kategori yang tersedia:
${labels.map((l) => `- ${l}`).join("\n")}

Aturan:
- Balas HANYA dengan nama kategori yang tepat dari daftar di atas, persis seperti yang tertulis (case-sensitive).
- Jangan berikan penjelasan, tanda kutip, atau teks tambahan apa pun.
- Jika tidak ada kategori yang relevan sama sekali, balas dengan: "tidak-ada"`;

  try {
    if (aiProvider === "gemini") {
      if (!geminiApiKey) return null;
      const modelName = geminiModels[0] || geminiModel;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 60
            }
          })
        }
      );
      if (!response.ok) return null;
      const data = (await response.json().catch(() => ({}))) as any;
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (resultText && labels.includes(resultText)) {
        return resultText;
      }
      return null;
    } else {
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
    }
  } catch (error) {
    console.warn("[classifyThemeWithAI] Error classifying theme:", error);
    return null;
  }
}

registerThemeClassifier(classifyThemeWithAI);
