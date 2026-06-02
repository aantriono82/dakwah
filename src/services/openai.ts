import OpenAI from "openai";
import {
  buildPrompt,
  fallbackNaskah,
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
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const baseURL = process.env.OPENAI_BASE_URL || undefined;
const requestTimeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 30_000);
const client = apiKey ? new OpenAI({ apiKey, baseURL, timeout: requestTimeout }) : null;
const systemPrompt =
  "Anda adalah penulis naskah dakwah Islam yang natural, hangat, peka konteks jamaah, dan menulis naskah mimbar yang utuh, bukan ringkasan. Tampilkan hanya naskah final yang siap dibacakan. Ikuti bahasa target dari user untuk semua narasi non-heading. Dilarang menampilkan reasoning, analisis, rencana, komentar proses, catatan model, atau bahasa Inggris. Jangan gunakan Markdown. Gunakan rujukan ayat/hadits secara hati-hati dan jangan mengarang sumber. Semua teks Arab wajib berharakat, khususnya pada mukadimah, syahadat, ayat Al-Qur'an, hadits, penutup khutbah pertama, pembuka khutbah kedua, dan doa.";
const generationSettings = {
  temperature: 0.9,
  top_p: 0.95,
  presence_penalty: 0.35,
  frequency_penalty: 0.45,
  max_tokens: 6000
};

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

export async function generateText(jenis: string, parameters: Record<string, unknown>) {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!client) return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  const targetLanguage = normalizeLanguage(parameters.bahasa);

  try {
    const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      },
      { role: "user", content: buildPrompt(jenis, parameters) },
      { role: "user", content: variationInstruction(traceId) }
    ];

    const response = await withProviderTimeout(
      client.chat.completions.create({
        model,
        messages: baseMessages,
        ...generationSettings
      })
    );

    const firstPass = sanitizeGeneratedText(response.choices[0]?.message.content ?? "");
    const firstPassAcceptable =
      isGeneratedTextAcceptable(jenis, firstPass, parameters) &&
      meetsMinimumLength(jenis, firstPass, parameters) &&
      hasSubstantialArabicOpening(jenis, firstPass) &&
      hasSubstantialArabicClosingPrayer(jenis, firstPass);
    if (firstPassAcceptable) {
      console.info(`[generateText:${traceId}] pass=first jenis=${jenis} status=ok`);
      return firstPass;
    }

    const missingFirstPassSections = missingRequiredArabicSections(jenis, firstPass);
    const firstPassLanguageMismatch = !matchesTargetLanguage(firstPass, targetLanguage);
    const firstPassTooShort = !meetsMinimumLength(jenis, firstPass, parameters);
    const firstPassThinOpening = !hasSubstantialArabicOpening(jenis, firstPass);
    const firstPassThinClosingPrayer = !hasSubstantialArabicClosingPrayer(jenis, firstPass);
    const firstPassReason =
      missingFirstPassSections.length > 0
        ? `missing_required_arabic_sections:${missingFirstPassSections.join(",")}`
        : firstPassLanguageMismatch
          ? `language_mismatch:${targetLanguage}`
          : firstPassTooShort
            ? `too_short:min_words_${minimumWordCountFor(jenis, parameters)}`
            : firstPassThinOpening
              ? "thin_arabic_opening"
              : firstPassThinClosingPrayer
                ? "thin_arabic_closing_prayer"
                : "undiacritized_arabic_detected";
    console.warn(
      `[generateText:${traceId}] pass=first jenis=${jenis} status=needs_retry reason=${firstPassReason}`
    );

    const retryResponse = await withProviderTimeout(
      client.chat.completions.create({
        model,
        messages: [
          ...baseMessages,
          {
            role: "user",
            content:
              `Ulangi naskah final dari awal. Bahasa target wajib ${targetLanguage}; semua sapaan, transisi, isi, renungan, terjemah/penjelasan ayat-hadits, pesan praktis, dan penutup harus memakai bahasa target tersebut, bukan bahasa Indonesia, kecuali heading struktur standar. Naskah sebelumnya bermasalah: ${firstPassReason}. Jangan ringkas; penuhi minimal ${minimumWordCountFor(jenis, parameters)} kata dan buat uraian utama mengalir dalam banyak paragraf. ${retryLengthInstructionFor(jenis)} Wajib ikuti rukun khutbah: hamdalah, shalawat Nabi, dan wasiat takwa harus ada di khutbah pertama dan kedua; syahadat Arab berharakat harus ada di mukadimah khutbah pertama; ayat Al-Qur'an Arab harus ada minimal di salah satu khutbah; doa untuk kaum mukminin harus ada di khutbah kedua dan digabungkan dalam bagian Doa Penutup, bukan heading terpisah. Untuk khutbah Idul Fitri/Idul Adha, khutbah pertama diawali takbir Arab 9 kali dan khutbah kedua diawali takbir Arab 7 kali. Terapkan STYLE PROFILE: dakwah.id sesuai jenis naskah agar pembuka, isi, penutup, dan doa bervariasi, humanis, dan tidak terasa template. Pembuka Arab harus utuh, bukan satu baris pendek. Doa penutup Arab minimal 4-6 kalimat doa berharakat, memuat doa untuk kaum mukminin, dan jangan hanya satu doa pendek. Jangan tampilkan label teknis seperti Rukun 1/2/3/4/5 pada naskah final. Semua teks Arab wajib diberi harakat lengkap (tasykil), tanpa Arab gundul.`
          }
        ],
        ...generationSettings
      })
    );

    const retryPass = sanitizeGeneratedText(retryResponse.choices[0]?.message.content ?? "");
    const retryClean =
      isGeneratedTextAcceptable(jenis, retryPass, parameters) &&
      meetsMinimumLength(jenis, retryPass, parameters) &&
      hasSubstantialArabicOpening(jenis, retryPass) &&
      hasSubstantialArabicClosingPrayer(jenis, retryPass);

    if (retryClean) {
      console.info(`[generateText:${traceId}] pass=retry jenis=${jenis} status=ok`);
      return retryPass;
    }

    console.warn(
      `[generateText:${traceId}] pass=retry jenis=${jenis} status=still_invalid fallback=local`
    );

    const bestProviderPass = retryPass || firstPass;
    return bestProviderPass &&
      isGeneratedTextAcceptable(jenis, bestProviderPass, parameters) &&
      meetsMinimumLength(jenis, bestProviderPass, parameters) &&
      hasSubstantialArabicOpening(jenis, bestProviderPass) &&
      hasSubstantialArabicClosingPrayer(jenis, bestProviderPass)
      ? bestProviderPass
      : fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[generateText:${traceId}] provider_failed fallback=local message=${message}`);
    return fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
  }
}

export async function* streamGeneratedText(jenis: string, parameters: Record<string, unknown>) {
  if (!client) {
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fallback = fallbackNaskah(jenis, parametersWithVariation(parameters, traceId));
    for (const chunk of fallback.match(/[\s\S]{1,80}/g) ?? []) {
      yield chunk;
      await Bun.sleep(15);
    }
    return;
  }

  try {
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const stream = await withProviderTimeout(
      client.chat.completions.create({
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: buildPrompt(jenis, parameters) },
          { role: "user", content: variationInstruction(traceId) }
        ],
        ...generationSettings
      })
    );

    let text = "";
    for await (const part of stream) {
      const content = part.choices[0]?.delta.content;
      if (content) text += content;
    }

    const clean = sanitizeGeneratedText(text);
    const finalText = clean &&
      isGeneratedTextAcceptable(jenis, clean, parameters) &&
      meetsMinimumLength(jenis, clean, parameters) &&
      hasSubstantialArabicOpening(jenis, clean) &&
      hasSubstantialArabicClosingPrayer(jenis, clean)
      ? clean
      : (await generateText(jenis, parameters)) || fallbackNaskah(jenis, parameters);
    for (const chunk of finalText.match(/[\s\S]{1,160}/g) ?? []) {
      yield chunk;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[streamGeneratedText] provider_failed fallback=local message=${message}`);
    const fallback = fallbackNaskah(jenis, parametersWithVariation(parameters, `${Date.now()}`));
    for (const chunk of fallback.match(/[\s\S]{1,80}/g) ?? []) {
      yield chunk;
      await Bun.sleep(15);
    }
  }
}
