import OpenAI from "openai";
import {
  buildPrompt,
  completeMissingSecondKhutbah,
  fallbackNaskah,
  hasContextLeak,
  hasSubstantialArabicClosingPrayer,
  hasSubstantialArabicOpening,
  isGeneratedTextAcceptable,
  matchesTargetLanguage,
  meetsMinimumLength,
  minimumWordCountFor,
  missingRequiredArabicSections,
  normalizeLanguage,
  sanitizeGeneratedText
} from "../utils/content";

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
  "Anda adalah penulis naskah dakwah Islam yang natural, hangat, peka konteks jamaah, dan menulis naskah mimbar yang utuh, bukan ringkasan. Tampilkan hanya naskah final yang siap dibacakan. Ikuti bahasa target dari user untuk semua narasi non-heading. Dilarang menampilkan reasoning, analisis, rencana, komentar proses, catatan model, atau bahasa Inggris. Jangan gunakan Markdown. Gunakan rujukan ayat/hadits secara hati-hati dan jangan mengarang sumber. Semua teks Arab wajib berharakat, khususnya pada mukadimah, syahadat, ayat Al-Qur'an, hadits, penutup khutbah pertama, pembuka khutbah kedua, dan doa.";
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
  return `Ulangi naskah final dari awal. Bahasa target wajib ${targetLanguage}; semua sapaan, transisi, isi, renungan, terjemah/penjelasan ayat-hadits, pesan praktis, dan penutup harus memakai bahasa target tersebut, bukan bahasa Indonesia, kecuali heading struktur standar. Naskah sebelumnya bermasalah: ${reason}. Jangan ringkas; penuhi minimal ${minimumWordCountFor(jenis, parameters)} kata dan buat uraian utama mengalir dalam banyak paragraf. ${retryLengthInstructionFor(jenis)} Wajib ikuti rukun khutbah: hamdalah, shalawat Nabi, dan wasiat takwa harus ada di khutbah pertama dan kedua; syahadat Arab berharakat harus ada di mukadimah khutbah pertama; ayat Al-Qur'an Arab harus ada minimal di salah satu khutbah; doa untuk kaum mukminin harus ada di khutbah kedua.${arabicOnlySecondInstruction} Untuk khutbah Idul Fitri/Idul Adha, khutbah pertama diawali takbir Arab 9 kali dan khutbah kedua diawali takbir Arab 7 kali. Terapkan STYLE PROFILE: dakwah.id sesuai jenis naskah agar pembuka, isi, penutup, dan doa bervariasi, humanis, dan tidak terasa template. Pembuka Arab harus utuh, bukan satu baris pendek. Doa penutup Arab minimal 4-6 kalimat doa berharakat, memuat doa untuk kaum mukminin, dan jangan hanya satu doa pendek. Jangan tampilkan label teknis seperti Rukun 1/2/3/4/5 pada naskah final. Semua teks Arab wajib diberi harakat lengkap (tasykil), tanpa Arab gundul.`;
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

async function generateTextWithGemini(jenis: string, parameters: Record<string, unknown>, traceId: string) {
  const basePrompt = `${buildPrompt(jenis, parameters)}\n\n${geminiStrictStructureInstruction(jenis)}\n\n${variationInstruction(traceId)}`;

  for (const modelName of geminiModels) {
    try {
      const firstResponse = await createGeminiCompletion(modelName, basePrompt, jenis, parameters);
      const firstPass = normalizeProviderText(jenis, geminiTextFromResponse(firstResponse), parameters);
      if (providerTextIsClean(jenis, firstPass, parameters)) {
        console.info(`[generateText:${traceId}] provider=gemini model=${modelName} pass=first jenis=${jenis} status=ok`);
        return firstPass;
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
        return retryPass;
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

export async function generateText(jenis: string, parameters: Record<string, unknown>) {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (aiProvider === "gemini") return generateTextWithGemini(jenis, parameters, traceId);
  if (!client) return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  const generationSettings = generationSettingsFor(jenis, parameters);
  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt
    },
    { role: "user", content: buildPrompt(jenis, parameters) },
    { role: "user", content: variationInstruction(traceId) }
  ];

  for (const modelName of models) {
    try {
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
        return firstPass;
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
        return retryPass;
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

export async function* streamGeneratedText(jenis: string, parameters: Record<string, unknown>) {
  if (aiProvider === "gemini") {
    const finalText = await generateText(jenis, parameters);
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
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt
    },
    { role: "user", content: buildPrompt(jenis, parameters) },
    { role: "user", content: variationInstruction(traceId) }
  ];
  let hadProviderOutput = false;

  for (const modelName of models) {
    try {
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
        for (const chunk of clean.match(/[\s\S]{1,160}/g) ?? []) {
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

  const finalText = hadProviderOutput ? await generateText(jenis, parameters) : fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  if (!hadProviderOutput) console.warn(`[streamGeneratedText:${traceId}] provider_failed_all fallback=local models=${models.join(",")}`);
  for (const chunk of finalText.match(/[\s\S]{1,240}/g) ?? []) {
    yield chunk;
    if (!hadProviderOutput) {
      await Bun.sleep(3);
    }
  }
}
