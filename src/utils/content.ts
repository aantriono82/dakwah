export const CONTENT_TYPES = [
  "khutbah-jumat",
  "idul-fitri",
  "idul-adha",
  "nikah",
  "ceramah",
  "kultum"
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const contentTypeLabels: Record<ContentType, string> = {
  "khutbah-jumat": "Khutbah Jumat",
  "idul-fitri": "Khutbah Idul Fitri",
  "idul-adha": "Khutbah Idul Adha",
  nikah: "Khutbah Nikah",
  ceramah: "Ceramah Umum",
  kultum: "Kultum"
};

export type SupportedLanguage = "Indonesia" | "Jawa" | "Sunda" | "Ogan (Baturaja)" | "Arab";

export type PromptWebResult = {
  title: string;
  url: string;
  excerpt: string;
};

export type PromptWebContext = {
  query: string;
  source: string;
  results: PromptWebResult[];
  warnings?: string[];
};

type PromptBuildMode = "initial" | "full";

const editorialParameterLabels: Record<string, string> = {
  fokusAkurasi: "Fokus akurasi",
  gayaBahasaNaskah: "Gaya bahasa naskah",
  gayaRetorika: "Gaya retorika",
  strategiDalil: "Strategi dalil",
  haditsReferensi: "Hadits referensi",
  sumberInternet: "Sumber internet",
  modeSumberInternet: "Mode sumber internet",
  catatanEditor: "Catatan editor"
};

const QURAN_HEADING = "Allah SWT berfirman dalam AlQuran";
const HADITH_HEADING = "Rasulullah SAW bersabda";

export function normalizeLanguage(value: unknown): SupportedLanguage {
  const language = String(value ?? "Indonesia").trim().toLowerCase();
  if (language.includes("jawa")) return "Jawa";
  if (language.includes("sunda")) return "Sunda";
  if (language.includes("ogan") || language.includes("baturaja")) return "Ogan (Baturaja)";
  if (language.includes("arab")) return "Arab";
  return "Indonesia";
}

export function titleFromParameters(jenis: string, parameters: Record<string, unknown>) {
  const label = contentTypeLabels[jenis as ContentType] ?? "Naskah";
  const topic =
    jenis === "khutbah-jumat"
      ? topicFromParameters(parameters)
      : parameters.tema ?? parameters.topik ?? parameters.topikSingkat ?? parameters.temaPesan ?? "Tanpa Tema";
  return `${label}: ${String(topic)}`;
}

const requiredFields: Partial<Record<ContentType, string[]>> = {
  "khutbah-jumat": ["temaUtama"],
  nikah: ["temaPesan"],
  ceramah: ["topik"],
  kultum: ["topikSingkat"]
};

const fieldLabels: Record<string, string> = {
  temaUtama: "Tema utama",
  temaPesan: "Tema pesan pernikahan",
  topik: "Topik",
  topikSingkat: "Topik singkat"
};

export function validateContentParameters(jenis: string, parameters: Record<string, unknown>) {
  const required = requiredFields[jenis as ContentType] ?? [];
  const missing = required.filter((field) => String(parameters[field] ?? "").trim() === "");
  if (missing.length === 0) return "";

  return `${missing.map((field) => fieldLabels[field] ?? field).join(", ")} wajib diisi.`;
}

function structureRequirementsFor(jenis: string) {
  if (jenis === "khutbah-jumat") {
    return `Khutbah Jumat harus terdiri dari:
  Judul
  Khutbah Pertama
  Mukadimah Arab berharakat yang memuat hamdalah, syahadat, shalawat Nabi, dan wasiat takwa
  Isi Khutbah dengan 2-4 subbahasan
  Di dalam Isi Khutbah, masukkan heading ${QURAN_HEADING} berisi ayat Arab berharakat, terjemah, dan rujukan
  Di dalam Isi Khutbah, masukkan heading ${HADITH_HEADING} berisi hadits Arab berharakat, terjemah, dan rujukan
  Penutup Khutbah Pertama
  Khutbah Kedua
  Seluruh isi Khutbah Kedua hanya teks Arab berharakat: mukadimah, shalawat, wasiat takwa, dan doa penutup untuk kaum mukminin
  Jangan menulis Pesan Praktis, terjemah, transliterasi, atau narasi bahasa Indonesia di Khutbah Kedua`;
  }

  if (jenis === "idul-fitri") {
    return `Khutbah Idul Fitri harus terdiri dari:
  Judul
  Khutbah Pertama
  Takbir Arab berharakat sebanyak 9 kali
  Mukadimah Arab berharakat yang memuat hamdalah, syahadat, shalawat Nabi, dan wasiat takwa
  Isi Khutbah dengan 2-4 subbahasan
  Di dalam Isi Khutbah, masukkan heading ${QURAN_HEADING} berisi ayat Arab berharakat, terjemah, dan rujukan
  Di dalam Isi Khutbah, masukkan heading ${HADITH_HEADING} berisi hadits Arab berharakat, terjemah, dan rujukan yang masyhur
  Penutup Khutbah Pertama
  Khutbah Kedua
  Seluruh isi Khutbah Kedua hanya teks Arab berharakat: takbir 7 kali, mukadimah, shalawat, wasiat takwa, dan doa penutup untuk kaum mukminin
  Jangan menulis Pesan Praktis, Doa Penutup, terjemah, transliterasi, atau narasi bahasa Indonesia di Khutbah Kedua`;
  }

  if (jenis === "idul-adha") {
    return `Khutbah Idul Adha harus terdiri dari:
  Judul
  Khutbah Pertama
  Takbir Arab berharakat sebanyak 9 kali
  Mukadimah Arab berharakat yang memuat hamdalah, syahadat, shalawat Nabi, dan wasiat takwa
  Isi Khutbah dengan 2-4 subbahasan tentang kurban, haji, ketakwaan, dan kepedulian sosial
  Di dalam Isi Khutbah, masukkan heading ${QURAN_HEADING} berisi ayat Arab berharakat, terjemah, dan rujukan
  Di dalam Isi Khutbah, masukkan heading ${HADITH_HEADING} berisi hadits Arab berharakat, terjemah, dan rujukan yang masyhur
  Penutup Khutbah Pertama
  Khutbah Kedua
  Seluruh isi Khutbah Kedua hanya teks Arab berharakat: takbir 7 kali, mukadimah, shalawat, wasiat takwa, dan doa penutup untuk kaum mukminin
  Jangan menulis Pesan Praktis, Doa Penutup, terjemah, transliterasi, atau narasi bahasa Indonesia di Khutbah Kedua`;
  }

  if (jenis === "nikah") {
    return `Khutbah Nikah harus terdiri dari:
  Judul
  Pembukaan Arab berharakat yang memuat hamdalah, syahadat, dan shalawat Nabi
  Nasihat untuk Mempelai
  Di dalam isi nasihat, masukkan heading ${QURAN_HEADING} berisi ayat Arab berharakat yang relevan dengan pernikahan/tema pesan, terjemah, dan rujukan
  Di dalam isi nasihat, masukkan heading ${HADITH_HEADING} berisi hadits Arab berharakat yang relevan dengan pernikahan/tema pesan, terjemah, dan rujukan
  Pesan untuk Keluarga
  Doa Penutup`;
  }

  return `Naskah harus terdiri dari:
  Judul
  Pembukaan
  Isi Utama
  Di dalam Isi Utama, masukkan heading ${QURAN_HEADING} berisi ayat Arab berharakat yang relevan dengan tema, terjemah, dan rujukan
  Di dalam Isi Utama, masukkan heading ${HADITH_HEADING} berisi hadits Arab berharakat yang relevan dengan tema, terjemah, dan rujukan
  Pesan Praktis
  Penutup`;
}

function styleGuidanceFor(jenis: string) {
  if (jenis === "khutbah-jumat") {
    return `Gaya Khutbah Jumat:
- Jangan hanya memberi definisi. Bangun alur: realitas jamaah hari ini, ayat/hadits, renungan, contoh dekat, ajakan amal.
- Variasikan mukadimah Arab, redaksi wasiat takwa, penutup khutbah pertama, dan doa khutbah kedua.
- Hindari kalimat template seperti "tema ini mengingatkan kita" sebagai pembuka isi utama.`;
  }

  if (jenis === "idul-fitri") {
    return `Gaya Khutbah Idul Fitri:
- Nuansa harus hangat, syukur, haru, rekonsiliasi, zakat fitrah, silaturahmi, dan kembali bersih.
- Isi perlu terasa seperti momen hari raya: setelah Ramadhan, keluarga, maaf, tetangga, dan komitmen menjaga ibadah.
- Variasikan takbir, mukadimah, transisi ke tema, dan doa agar tidak kaku.`;
  }

  if (jenis === "idul-adha") {
    return `Gaya Khutbah Idul Adha:
- Nuansa harus kuat pada tauhid, pengorbanan, keteladanan Nabi Ibrahim dan Nabi Ismail, kurban, haji, serta kepedulian sosial.
- Isi jangan berhenti pada kisah; tarik pelajaran praktis tentang ego, harta, keluarga, dan berbagi.
- Variasikan takbir, mukadimah, transisi ke tema, dan doa kurban.`;
  }

  if (jenis === "nikah") {
    return `Gaya Khutbah Nikah:
- Awali dengan hamdalah, shalawat, syahadat, lalu nasihat yang lembut untuk kedua mempelai dan keluarga.
- Bahas sakinah, mawaddah, rahmah, amanah, komunikasi, saling memaafkan, nafkah lahir batin, dan doa pengantin.
- Hindari nada menggurui; gunakan kalimat yang khidmat, singkat, dan menyentuh.`;
  }

  if (jenis === "ceramah") {
    return `Gaya Ceramah:
- Buat alur hidup: pembuka yang mengait ke keadaan jamaah, dalil, kisah/analogi, refleksi, langkah praktis, doa.
- Variasikan sapaan, contoh, dan penutup. Jangan hanya daftar nasihat.
- Gunakan bahasa lisan yang enak didengar dan tidak monoton.`;
  }

  if (jenis === "kultum") {
    return `Gaya Kultum:
- Singkat, padat, satu pesan utama, satu dalil, satu contoh dekat, dan tiga langkah praktis.
- Pembuka tetap rapi, tetapi jangan terlalu panjang.
- Penutup harus mengikat pesan dalam satu ajakan yang mudah diingat.`;
  }

  return "Gaya: gunakan alur pembuka, isi, renungan, langkah praktis, dan doa yang natural.";
}

function styleProfileFor(jenis: string) {
  if (jenis === "khutbah-jumat") {
    return `STYLE PROFILE: dakwah.id (Khutbah Jumat)
- Pembuka Arab dibuat khidmat dan bervariasi: hamdalah, syahadat, shalawat, lalu wasiat takwa.
- Isi ditulis dengan 2-4 subtema yang mengalir: problem nyata jamaah -> dalil -> penjelasan -> ajakan amal.
- Penutup khutbah pertama gunakan redaksi istighfar atau doa pendek yang beragam.
- Khutbah kedua lebih ringkas namun tetap kuat pada doa untuk kaum mukminin.
- Doa penutup jangan satu pola; variasikan redaksi ampunan, keteguhan iman, keberkahan keluarga, dan keselamatan umat.`;
  }

  if (jenis === "idul-fitri") {
    return `STYLE PROFILE: dakwah.id (Khutbah Idul Fitri)
- Buka dengan takbir, lanjutkan mukadimah Arab yang hangat dan membangkitkan rasa syukur.
- Isi menonjolkan evaluasi pasca Ramadhan: istiqamah ibadah, penjagaan lisan, maaf, silaturahmi, zakat/empati sosial.
- Bangun suasana emosional yang lembut: syukur, haru, harap, dan tekad memperbaiki diri.
- Variasikan transisi antar bagian agar tidak terasa membaca template.
- Doa penutup dipilih sesuai nuansa fitri: penerimaan amal, persatuan keluarga, dan keteguhan takwa.`;
  }

  if (jenis === "idul-adha") {
    return `STYLE PROFILE: dakwah.id (Khutbah Idul Adha)
- Buka dengan takbir, lalu mukadimah Arab dengan nuansa pengagungan Allah.
- Isi mengalir dari kisah Nabi Ibrahim-Ismail menuju pelajaran praktis: pengorbanan ego, kepedulian sosial, dan ketaatan.
- Kaitkan tema kurban dengan realitas jamaah: keluarga, ekonomi, amanah, dan solidaritas.
- Penutup khutbah pertama dan doa khutbah kedua dibuat variatif, tidak monoton.
- Doa penutup menegaskan penerimaan kurban, ampunan, dan kekuatan iman umat.`;
  }

  return "";
}

function styleExamplesFor(jenis: string) {
  const examples: Record<string, string> = {
    "khutbah-jumat": `Contoh rasa bahasa Khutbah Jumat:
- "Jamaah Jumat rahimakumullah, sering kali amanah tidak hilang sekaligus, tetapi mulai retak dari hal-hal kecil yang kita anggap biasa."
- "Ayat ini tidak hanya memerintahkan, tetapi juga menegur cara kita memperlakukan titipan Allah dalam keluarga, pekerjaan, dan masyarakat."`,
    "idul-fitri": `Contoh rasa bahasa Idul Fitri:
- "Hari ini kita pulang dari madrasah Ramadhan dengan hati yang berharap diterima, bukan dengan kesombongan merasa sudah sempurna."
- "Maaf yang kita ucapkan hari ini semestinya menjadi awal akhlak baru, bukan sekadar kalimat musiman."`,
    "idul-adha": `Contoh rasa bahasa Idul Adha:
- "Kurban mengajarkan bahwa cinta kepada Allah harus lebih besar daripada rasa memiliki terhadap apa pun yang paling kita sayangi."
- "Daging kurban sampai kepada manusia, tetapi yang naik kepada Allah adalah takwa dan keikhlasan."`,
    nikah: `Contoh rasa bahasa Khutbah Nikah:
- "Rumah tangga yang kuat bukan rumah tanpa masalah, tetapi rumah yang punya adab ketika berbeda pendapat."
- "Sakinah tumbuh dari kesediaan saling mendengar, saling memaafkan, dan saling kembali kepada Allah."`,
    ceramah: `Contoh rasa bahasa Ceramah:
- "Kadang yang melelahkan bukan beratnya ujian, tetapi cara kita memikulnya sendirian tanpa kembali kepada Allah."
- "Mari kita turunkan nasihat ini ke hal yang dekat: rumah, pekerjaan, percakapan, dan keputusan kecil setiap hari."`,
    kultum: `Contoh rasa bahasa Kultum:
- "Pesan malam ini sederhana: jangan menunggu lapang untuk berbuat baik."
- "Satu amal kecil yang dijaga dengan ikhlas sering lebih mendidik hati daripada rencana besar yang tidak pernah dimulai."`
  };

  return `${examples[jenis] ?? examples.ceramah}
- Gunakan contoh ini hanya sebagai rasa bahasa: natural, lisan, jernih, dan tidak kaku. Jangan menyalin kalimatnya mentah-mentah jika tidak sesuai tema.`;
}

function languageGuidanceFor(parameters: Record<string, unknown>) {
  const language = normalizeLanguage(parameters.bahasa);
  const specific: Record<SupportedLanguage, string> = {
    Indonesia:
      "- Gunakan bahasa Indonesia lisan yang hangat, jernih, dan tidak terasa seperti template.",
    Jawa:
      "- Gunakan bahasa Jawa Krama Inggil/Krama Alus yang sangat santun dan khidmat (untuk menghormati jamaah dan sesepuh masjid).\n- Hindari penggunaan kosakata Jawa Ngoko kasar (seperti: kowe, mangan, turu, ndelok, dll). Gantilah dengan Krama Alus (seperti: panjenengan, dhahar, sare, mirsani, dll).\n- Selain heading struktur, jangan menulis narasi, transisi, terjemah dalil, pesan praktis, atau penutup dalam bahasa Indonesia.",
    Sunda:
      "- Gunakan bahasa Sunda Lemes/Lemes Pisan yang santun, luhur, dan natural untuk ceramah atau khutbah.\n- Hindari kata Sunda kasar/loma (seperti: maneh, urang, dahar, sare, dll). Gunakan kosakata Sunda Lemes (seperti: salira, simkuring, tuang, kulem, nitenan, dll).\n- Selain heading struktur, jangan menulis narasi, transisi, terjemah dalil, pesan praktis, atau penutup dalam bahasa Indonesia.",
    "Ogan (Baturaja)":
      "- Gunakan bahasa Ogan dialek Baturaja yang natural, sopan, dan mudah dipahami jamaah di wilayah Ogan Komering Ulu/Baturaja.\n- Pakai kosakata dan rasa tutur Ogan Baturaja seperti kite, jeme, dang, nian, pacak, idak, nak, bae, galak, dusun, dan sapaan jamaah yang sesuai, tanpa membuatnya terasa karikatural.\n- Selain heading struktur, jangan menulis narasi, transisi, terjemah dalil, pesan praktis, atau penutup dalam bahasa Indonesia baku.",
    Arab:
      "- Gunakan bahasa Arab fushah yang fasih untuk seluruh narasi, transisi, penjelasan dalil, pesan praktis, dan penutup.\n- Semua teks Arab, termasuk narasi biasa, wajib memakai harakat/tasykil. Jangan menulis Arab gundul.\n- Selain heading struktur yang diperlukan, jangan memakai bahasa Indonesia."
  };

  return `Bahasa output:
- Bahasa target: ${language}.
- Semua bagian non-heading harus mengikuti bahasa target: sapaan jamaah, transisi, isi, renungan, terjemah/penjelasan ayat-hadits, pesan praktis, dan kalimat penutup.
- Heading struktur seperti "Khutbah Pertama", "${QURAN_HEADING}", "${HADITH_HEADING}", "Khutbah Kedua", dan "Doa Penutup" boleh tetap memakai label standar agar naskah rapi.
${specific[language]}`;
}

function normalizedEditorialMode(parameters: Record<string, unknown>, key: string, fallback: string) {
  return String(parameters[key] ?? fallback).trim().toLowerCase();
}

function editorialGuidanceFor(parameters: Record<string, unknown>) {
  const accuracyFocus = normalizedEditorialMode(parameters, "fokusAkurasi", "ketat");
  const languageStyle = normalizedEditorialMode(parameters, "gayaBahasaNaskah", "natural-jelas");
  const dalilStrategy = normalizedEditorialMode(parameters, "strategiDalil", "relevan");
  const editorNote = String(parameters.catatanEditor ?? "").trim();

  const accuracyRule =
    accuracyFocus === "maksimal"
      ? "- Akurasi isi wajib sangat ketat. Jangan menambah kisah, data sejarah, sebab nuzul, faedah fiqih, atau klaim keutamaan yang tidak benar-benar aman dari dalil yang tersedia.\n- Jika detail tertentu tidak tersedia atau tidak pasti, jangan berspekulasi. Pilih redaksi yang jujur, aman, dan tetap enak didengar."
      : "- Akurasi isi wajib dijaga. Hindari klaim yang terlalu rinci jika dalil atau konteksnya tidak benar-benar mendukung.\n- Jangan menisbatkan ayat, hadits, makna, atau hukum secara serampangan.";

  const languageRule =
    languageStyle === "sangat-natural"
      ? "- Bahasa harus terdengar seperti dai yang matang: natural, hangat, lisan, dan mengalir, tanpa kesan template atau kalimat mesin.\n- Gunakan transisi yang halus, variasi panjang kalimat, dan penjelasan yang mudah dicerna jamaah."
      : "- Bahasa harus natural, jelas, dan enak dibacakan.\n- Utamakan kalimat yang jernih, langsung, tidak bertele-tele, dan tidak kaku.";

  const dalilRule =
    dalilStrategy === "sangat-relevan"
      ? '- Dalil wajib benar-benar melayani tema yang dipilih. Jangan sekadar menempelkan ayat atau hadits umum.\n- Setelah mengutip dalil, jelaskan kaitannya langsung dengan tema utama agar jamaah paham mengapa dalil itu dipakai.'
      : "- Pilih dan jelaskan dalil yang paling dekat dengan tema.\n- Hindari dalil yang terlalu umum bila ada dalil yang lebih tepat.";

  const editorNoteRule = editorNote ? `- Catatan editor yang wajib diikuti: ${editorNote}` : "";

  return `Standar editorial:
${accuracyRule}
${languageRule}
${dalilRule}
- Penjelasan harus runtut: pernyataan, dalil, makna, contoh dekat, lalu ajakan amal.
- Jika menyebut hadits, jangan menaikkan derajat hadits melebihi data retrieval.
${editorNoteRule}`.trim();
}

function userReferenceGuidanceFor(parameters: Record<string, unknown>) {
  const hadithReference = String(parameters.haditsReferensi ?? "").trim();
  const internetSources = String(parameters.sumberInternet ?? "").trim();
  const sections: string[] = [];

  if (hadithReference) {
    sections.push(`Referensi hadits dari user:
${hadithReference}

Aturan:
- Prioritaskan referensi hadits dari user jika relevan dengan tema dan aman.
- Jika teks Arab, terjemah, takhrij, atau derajat belum tersedia dari data retrieval, jangan mengarang detailnya.
- Jika referensi user berbeda dari hasil retrieval, jelaskan dengan redaksi aman atau gunakan hadits yang paling dapat diverifikasi.`);
  }

  if (internetSources) {
    sections.push(`Sumber internet dari user:
${internetSources}

Aturan:
- Sumber internet hanya dipakai untuk penguat penjelasan sosial, contoh, atau konteks umum; jangan jadikan sumber utama ayat, hadits, takhrij, derajat hadits, atau hukum syar'i.
- Jangan menyalin artikel panjang. Olah menjadi narasi mimbar yang orisinal dan ringkas.
- Jika web search tersedia, telusuri sumber/tema ini dan utamakan website yang kredibel.`);
  }

  return sections.join("\n\n");
}

function normalizedDuration(value: unknown) {
  const duration = String(value ?? "sedang").trim().toLowerCase();
  if (duration.includes("pendek")) return "pendek";
  if (duration.includes("panjang")) return "panjang";
  return "sedang";
}

function lengthGuidanceFor(jenis: string, parameters: Record<string, unknown>) {
  const duration = normalizedDuration(parameters.durasi);

  if (jenis === "kultum") {
    const range = duration === "pendek" ? "500-700" : duration === "panjang" ? "850-1100" : "700-900";
    return `Panjang naskah:
- Jangan terlalu ringkas. Targetkan ${range} kata untuk kultum, dengan pembuka singkat, isi yang tetap utuh, satu renungan, tiga langkah praktis, dan penutup.
- Isi utama minimal 4 paragraf narasi, bukan daftar poin pendek.
- Jaga kultum tetap fokus pada satu pesan utama, tetapi pastikan uraian cukup lengkap untuk dibacakan.`;
  }

  if (jenis === "ceramah") {
    const range = duration === "pendek" ? "900-1200" : duration === "panjang" ? "1600-2200" : "1300-1800";
    return `Panjang naskah:
- Jangan terlalu ringkas. Targetkan ${range} kata untuk ceramah; jangan berhenti di batas bawah jika uraian masih bisa dikembangkan.
- Isi utama minimal 8 paragraf narasi yang utuh: pengantar masalah, dalil, penjelasan dalil, contoh dekat jamaah, kisah/analogi, renungan, langkah praktis, penguatan akhir, lalu doa.
- Setiap paragraf isi utama harus berupa uraian naratif, bukan satu-dua kalimat pendek atau daftar poin.`;
  }

  if (jenis === "nikah") {
    const range = duration === "pendek" ? "800-1100" : duration === "panjang" ? "1300-1800" : "1100-1500";
    return `Panjang naskah:
- Jangan terlalu ringkas. Targetkan ${range} kata untuk khutbah nikah.
- Nasihat untuk mempelai minimal 6 paragraf narasi yang lembut dan konkret, ditambah pesan untuk keluarga dan doa.
- Jangan hanya memberi nasihat umum; uraikan sakinah, mawaddah, rahmah, komunikasi, nafkah, sabar, dan saling memaafkan secara praktis.`;
  }

  const range = duration === "pendek" ? "1000-1300" : duration === "panjang" ? "1700-2300" : "1500-2000";
  const secondKhutbahGuidance = isKhutbahRukunType(jenis)
    ? "- Khutbah Kedua harus hanya berisi teks Arab berharakat: mukadimah, shalawat, wasiat takwa, dan doa; khusus Idul Fitri/Idul Adha diawali takbir Arab 7 kali. Jangan ada Pesan Praktis, Doa Penutup, terjemah, transliterasi, atau narasi bahasa Indonesia di bagian itu."
    : "- Khutbah Kedua tetap lebih ringkas, tetapi jangan hanya doa; beri 2-3 paragraf penguatan takwa sebelum doa.";

  return `Panjang naskah:
- Jangan terlalu ringkas. Targetkan ${range} kata untuk khutbah.
- Khutbah Pertama harus menjadi bagian utama: setelah mukadimah Arab, tulis minimal 4 subbahasan, masing-masing 2 paragraf narasi yang mengalir.
${secondKhutbahGuidance}
- Pesan praktis boleh bernomor, tetapi jangan menggantikan uraian utama.`;
}

function themeAlignmentGuidanceFor(jenis: string, tema: string, parameters: Record<string, unknown>) {
  if (jenis === "nikah") {
    const names = coupleNameText(parameters);
    return `Kesesuaian tema Khutbah Nikah:
- Semua nasihat wajib spesifik mengikuti tema pesan pernikahan "${tema}", bukan nasihat rumah tangga umum.
- Mempelai pria: ${names.groom || "(tidak diisi)"}.
- Mempelai wanita: ${names.bride || "(tidak diisi)"}.
- Sebutkan pasangan sebagai "${names.couple}" secara natural di bagian pengantar, nasihat untuk mempelai, dan doa penutup.
- Jangan salah menukar peran atau nama mempelai. Gunakan nama yang diberikan user persis sebagaimana tertulis.
- Tulis nasihat sebagai narasi khutbah yang mengalir. Jangan memakai pola template seperti "Nasihat pertama", "Nasihat kedua", dan seterusnya.
- Jika tema berupa masalah negatif seperti saling curiga, cemburu berlebihan, prasangka, konflik, atau ego, framing-nya harus sebagai penyakit hati/rumah tangga yang perlu diobati, bukan sebagai bekal yang perlu dijaga.
- Nasihat untuk mempelai harus menghubungkan "${tema}" dengan kehidupan nyata setelah akad: komunikasi, tanggung jawab, keluarga, ibadah, nafkah, kesabaran, dan saling memaafkan sesuai relevansi tema.`;
  }

  if (jenis === "ceramah") {
    return `Kesesuaian tema Ceramah:
- Semua bagian Ceramah wajib spesifik membahas "${tema}", bukan ceramah umum yang hanya menyisipkan frasa tema berulang-ulang.
- Isi utama harus menjawab langsung: apa definisi/ruang lingkup tema, dalil utama, amalan yang dianjurkan, batasan yang perlu dihindari, contoh penerapan jamaah, dan langkah praktis.
- Jika tema menyebut waktu ibadah seperti Muharram, Ramadhan, Dzulhijjah, Jumat, atau awal tahun Hijriah, bahas keutamaan waktu tersebut, amalan sunnah yang masyhur, tanggal/momen penting bila relevan, dan peringatan dari klaim yang tidak berdalil kuat.
- Jika tema tentang syukur, bahas nikmat dan cara bersyukur; jika sabar, bahas ujian dan keteguhan; jika sedekah, bahas kepedulian dan infak; jika taubat, bahas istighfar dan harapan; jika amanah, bahas kejujuran dan tanggung jawab.
- Jangan memakai contoh generik seperti menjaga lisan, pekerjaan, atau keluarga kecuali memang mendukung tema yang dipilih dan dijelaskan hubungannya secara eksplisit.`;
  }

  if (jenis !== "kultum") return "";

  return `Kesesuaian tema Kultum:
- Semua bagian Kultum wajib spesifik membahas "${tema}", bukan nasihat umum yang hanya menyebut tema di awal.
- Pembuka, contoh, renungan, tiga langkah praktis, dan doa harus memakai kosakata serta situasi yang relevan dengan "${tema}".
- Jika tema tentang syukur, bahas nikmat dan cara bersyukur; jika sabar, bahas ujian dan keteguhan; jika sedekah, bahas kepedulian dan infak; jika taubat, bahas istighfar dan harapan; jika amanah, bahas kejujuran dan tanggung jawab.
- Jangan memakai contoh generik seperti menjaga lisan, pekerjaan, atau keluarga kecuali memang mendukung tema yang dipilih.`;
}

function arabicVariationGuidanceFor(jenis: string) {
  if (jenis !== "khutbah-jumat" && jenis !== "idul-fitri" && jenis !== "idul-adha" && jenis !== "nikah") {
    return `Variasi teks Arab:
- Pembuka Arab dan doa penutup jangan selalu memakai satu pola. Gunakan redaksi hamdalah, shalawat, munajat, dan doa yang wajar, berharakat, serta sesuai tema.
- Hindari mengulang persis pembukaan atau doa penutup dari hasil sebelumnya. Variasikan pilihan diksi seperti isti'anah, istighfar, syukur, perlindungan, keteguhan iman, dan keberkahan amal.
- Doa penutup Arab minimal 3 kalimat doa, bukan hanya satu ayat doa pendek.`;
  }

  return `Variasi teks Arab:
- Mukadimah Arab jangan monoton. Jangan hanya menulis satu kalimat hamdalah lalu langsung isi; rangkai hamdalah, isti'anah/istighfar, syahadat, shalawat, dan wasiat takwa dalam redaksi yang utuh.
- Variasikan pembuka khutbah pertama dan khutbah kedua. Jangan mengulang mukadimah yang sama persis di dua khutbah.
- Penutup khutbah pertama gunakan variasi istighfar, permohonan keberkahan Al-Qur'an, doa penerimaan amal, atau ajakan kembali kepada Allah yang sesuai tema.
- Doa untuk kaum mukminin harus digabungkan dalam rangkaian doa khutbah kedua, bukan dibuat sebagai heading terpisah.
- Doa akhir khutbah kedua harus lebih kaya dan tidak repetitif: minimal 4-6 kalimat Arab berharakat, mencakup doa untuk kaum mukminin, ampunan, keteguhan iman, keluarga, rezeki halal, keselamatan negeri, dan kebaikan akhirat.
- Jangan hanya memakai satu doa pendek seperti "Rabbana atina..." sebagai seluruh doa penutup. Doa tersebut boleh dipakai sebagai salah satu bagian saja.`;
}

function mainThemeConstraintPrompt(tema: string) {
  return `Tema utama: "${tema}"

Semua isi naskah khutbah, ceramah, dan kultum harus menjelaskan tema tersebut.
Jangan membahas topik lain kecuali berkaitan langsung dengan tema.
Setiap paragraf harus mendukung tema utama.
Jika menyebut ayat atau hadits, pilih yang relevan dengan tema.`;
}

function arabicOnlySecondKhutbahGuidanceFor(jenis: string) {
  if (!isKhutbahRukunType(jenis)) return "";
  const idulTakbir = jenis === "idul-fitri" || jenis === "idul-adha"
    ? "\n- Untuk Khutbah Idul Fitri/Idul Adha, awali Khutbah Kedua langsung dengan takbir Arab 7 kali tanpa heading \"Takbir Pembuka Kedua\"."
    : "";

  return `Aturan khusus Khutbah Kedua:
- Setelah heading "Khutbah Kedua", seluruh isi harus hanya teks Arab berharakat.
- Jangan tulis heading "Pesan Praktis", "Doa Penutup", "Takbir Pembuka Kedua", terjemah, transliterasi, sapaan Indonesia, atau narasi Indonesia di bagian Khutbah Kedua.
- Jika perlu heading doa, gunakan heading Arab "الدُّعَاءُ".
- Isi Khutbah Kedua harus memuat hamdalah, shalawat Nabi, wasiat takwa, doa untuk kaum mukminin, dan doa penutup dalam bahasa Arab berharakat.${idulTakbir}`;
}

export function rhetoricStyleGuidanceFor(parameters: Record<string, unknown>): string {
  const style = String(parameters.gayaRetorika ?? "").trim().toLowerCase();
  if (style === "quraish-shihab" || style === "teduh") {
    return `GAYA RETORIKA: Teduh & Akademik (seperti Prof. Quraish Shihab)
- Gunakan bahasa yang tenang, mendalam, santun, dan menyejukkan.
- Fokus pada penjelasan tafsir ayat secara logis, pemaknaan kosakata dalil yang kaya, dan menghindari nada menghakimi/keras.
- Uraikan pesan dengan penjelasan yang berbobot secara intelektual, mengedepankan kasih sayang (rahmah), toleransi, dan kedamaian batin.`;
  }
  if (style === "zainuddin-mz" || style === "komunikatif") {
    return `GAYA RETORIKA: Praktis & Komunikatif (seperti KH. Zainuddin MZ)
- Gunakan bahasa yang dinamis, akrab, komunikatif, dan diselingi analogi kehidupan sehari-hari yang sederhana dan mengena.
- Sampaikan nasihat secara lugas, sesekali gunakan gaya interaksi verbal yang hangat (seperti menyapa jamaah dengan sapaan akrab "hadirin rahimakumullah" atau "saudara-saudaraku yang dirahmati Allah" di tengah naskah untuk menarik perhatian).
- Berikan pesan praktis yang langsung relevan dengan kehidupan sosial nyata, hubungan suami-istri/anak, dan tetangga.`;
  }
  if (style === "buya-hamka" || style === "sastra") {
    return `GAYA RETORIKA: Sastra & Filosofis (seperti Buya Hamka)
- Gunakan diksi yang puitis, kaya akan perenungan mendalam (tasawuf ringan), narasi sejarah/hikmah yang mengunggah batin, dan susunan kalimat yang indah serta santun.
- Hadirkan analogi filosofis tentang kebersihan jiwa, makna hidup, waktu, alam semesta, dan kemuliaan akhlak.
- Tulis kalimat-kalimat yang mengalir indah, menyentuh batin pembaca/pendengar, dan membangkitkan keinsyafan moral.`;
  }
  return "";
}

export function buildPrompt(
  jenis: string,
  parameters: Record<string, unknown>,
  retrievedDalil?: PromptDalilContext,
  retrievedWeb?: PromptWebContext,
  options?: { mode?: PromptBuildMode }
) {
  const mode = options?.mode ?? "full";
  const label = contentTypeLabels[jenis as ContentType] ?? jenis;
  const tema = topicFromParameters(parameters);
  const thematicDalil =
    retrievedDalil && (retrievedDalil.quran.length > 0 || retrievedDalil.hadith.length > 0)
      ? "Dalil retrieval sudah tersedia di bagian atas. Pakai dalil retrieval itu saja; jangan menampilkan paket dalil tematik fallback dan jangan mengulang kutipan dalil yang sama."
      : dalilGuidanceFor(jenis, tema);
  const coreParameterKeys = new Set([
    "bahasa",
    "durasi",
    "temaUtama",
    "tema",
    "temaPesan",
    "topik",
    "topikSingkat",
    "subTema",
    "mempelaiPria",
    "mempelaiWanita",
    "nuansa",
    "momenSpesifik",
    "kisahNabi",
    "targetAudiens",
    "setting",
    "waktu"
  ]);
  const parameterList = Object.entries(parameters)
    .filter(([key]) => mode === "full" || coreParameterKeys.has(key))
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `- ${editorialParameterLabels[key] ?? key}: ${String(value)}`)
    .join("\n");
  const editorialGuidance = mode === "full" ? editorialGuidanceFor(parameters) : "";
  const userReferenceGuidance = mode === "full" ? userReferenceGuidanceFor(parameters) : "";
  const rhetoricGuidance = mode === "full" ? rhetoricStyleGuidanceFor(parameters) : "";
  const styleProfile = mode === "full" ? styleProfileFor(jenis) : "";
  const styleExamples = mode === "full" ? styleExamplesFor(jenis) : "";
  const parameterSection = parameterList ? `\n\nParameter:\n${parameterList}` : "";

  return `Tulis ${label} FINAL yang siap dibacakan oleh dai/khatib.

${languageGuidanceFor(parameters)}

${lengthGuidanceFor(jenis, parameters)}

${mainThemeConstraintPrompt(tema)}

${themeAlignmentGuidanceFor(jenis, tema, parameters)}

${rhetoricGuidance}

${editorialGuidance}

${userReferenceGuidance}

${retrievedDalilGuidanceFor(retrievedDalil)}

${retrievedWebGuidanceFor(retrievedWeb)}

${arabicVariationGuidanceFor(jenis)}

${arabicOnlySecondKhutbahGuidanceFor(jenis)}

WAJIB:
- Fokus pembahasan utama: ${tema}. Jika ada sub-tema, jadikan sub-tema sebagai arah isi yang lebih spesifik daripada tema utama.
- Jawaban harus langsung berupa naskah final. Jangan tampilkan analisis, rencana, pertimbangan sumber, catatan model, atau komentar proses.
- Jangan memakai bahasa Inggris kecuali istilah yang memang diminta pengguna.
- Jangan memakai format Markdown seperti **tebal**, ### heading, blockquote >, garis ---, atau bullet dekoratif.
- Gunakan heading teks biasa yang konsisten.
- Jangan tampilkan label teknis seperti "Rukun 1/Rukun 2/Rukun 3/Rukun 4/Rukun 5" pada naskah final.
- WAJIB gunakan heading persis: "Allah SWT berfirman dalam AlQuran" untuk ayat dan "Rasulullah SAW bersabda" untuk hadits. Jangan tambahkan variasi heading lain untuk bagian dalil.
- Jangan tempatkan heading "Allah SWT berfirman dalam AlQuran" atau "Rasulullah SAW bersabda" di mukadimah/pembukaan. Keduanya harus muncul di dalam isi naskah atau isi khutbah setelah pengantar selesai.
- Tempatkan ayat dan hadits di paragraf yang paling relevan dengan alurnya. Tidak wajib berdampingan, tidak wajib urut baris pertama-kedua, dan jangan biasakan menaruh keduanya sekaligus di awal bagian isi.
- Untuk teks Arab dan terjemahan di bawah heading dalil tersebut, tuliskan secara ringkas saja. Sistem kami akan secara otomatis menimpa teks tersebut dengan teks Arab berharakat dan terjemahan resmi hasil verifikasi dari database/API untuk menjamin 100% akurasi. Oleh karena itu, jangan mengarang atau mengubah teks Arab dalil hasil retrieval.
- Semua teks Arab wajib memakai harakat (tasykil), jangan menulis Arab gundul.
- Ikuti rukun khutbah mazhab Syafi'i yang umum dipakai di Indonesia: hamdalah, shalawat Nabi, dan wasiat takwa wajib ada di khutbah pertama dan khutbah kedua; ayat Al-Qur'an wajib ada minimal di salah satu khutbah; doa untuk kaum mukminin wajib ada di khutbah kedua dan digabungkan dalam bagian Doa Penutup.
- Untuk khutbah Jumat, Idul Fitri, dan Idul Adha, mukadimah khutbah pertama wajib memuat syahadat Arab berharakat setelah hamdalah dan sebelum/bersama shalawat.
- Untuk Khutbah Jumat, pembuka khutbah dimulai dengan hamdalah, bukan takbir.
- Untuk Khutbah Jumat, Idul Fitri, dan Idul Adha, bagian setelah heading "Khutbah Kedua" tidak boleh memuat bahasa Indonesia sama sekali; isi hanya Arab berharakat sampai akhir naskah.
- Untuk khutbah Idul Fitri/Idul Adha, khutbah pertama dibuka dengan takbir 9 kali, khutbah kedua langsung diawali takbir Arab 7 kali tanpa heading "Takbir Pembuka Kedua", lalu tetap memuat hamdalah, shalawat, wasiat takwa, ayat, dan doa sesuai rukun.
- Jangan menghilangkan bagian Arab wajib: hamdalah, shalawat Nabi, wasiat takwa, ayat Al-Qur'an, doa mukminin, serta takbir pembuka untuk khutbah Idul Fitri/Idul Adha.
- Jangan membuat heading terpisah "Doa untuk Kaum Mukminin"; untuk Khutbah Jumat masukkan langsung dalam rangkaian doa Arab di Khutbah Kedua, sedangkan untuk khutbah Idul masukkan di bawah heading "Doa Penutup".
- Jika rujukan hadits tidak yakin, gunakan hadits masyhur yang aman dan cantumkan rujukan singkat.
- Jangan menyebut "saya akan", "let's craft", "need", "maybe", "could", "harus hati-hati", atau catatan serupa.

Ketentuan:
- Gunakan bahasa yang santun, jernih, dan mudah dipahami.
- Sertakan struktur pembuka, isi utama, transisi, dan penutup yang rapi.
- Jika menyebut ayat atau hadits, tuliskan dengan kehati-hatian dan hindari mengarang sumber yang tidak pasti.
- Beri penekanan pesan praktis untuk jamaah.
- Rukun khutbah harus hadir dalam teks Arab, tetapi jangan dijadikan heading bernomor.
- Tema, ayat Al-Quran, hadits, isi utama, contoh, pesan praktis, dan doa harus saling sinkron. Jangan memakai dalil umum yang tidak mendukung tema bila ada dalil yang lebih tepat.
- Jika user memberi referensi ayat/hadits, prioritaskan referensi itu selama relevan dan sumbernya aman. Jika tidak ada, gunakan dalil tematik berikut atau dalil lain yang sama relevan dan masyhur:
${thematicDalil}

${styleGuidanceFor(jenis)}
${styleProfile}
${styleExamples}

Struktur wajib:
${structureRequirementsFor(jenis)}${parameterSection}`;
}

const finalStartPatterns = [
  /^\s*(\*\*)?\s*(judul|khutbah pertama|khutbah jumat|khutbah idul|khutbah nikah|ceramah umum|kultum|pembuka|pembukaan)\b/im,
  /^اَلْحَمْدُ/im,
  /^الحمد لله/im
];

const metaLeakPattern =
  /\b(need|maybe|could|should|let'?s|craft|produce|avoid|mention|authenticity|reasoning|thinking|analysis|cautious|better use|we can|we should)\b/i;

export function sanitizeGeneratedText(text: string) {
  let output = text.replace(/\r\n/g, "\n").trim();
  if (!output) return output;

  const startIndexes = finalStartPatterns
    .map((pattern) => output.match(pattern)?.index)
    .filter((index): index is number => typeof index === "number");
  const firstStart = startIndexes.length > 0 ? Math.min(...startIndexes) : -1;
  if (firstStart > 0 && metaLeakPattern.test(output.slice(0, firstStart))) {
    output = output.slice(firstStart).trimStart();
  }

  const cleaned = output
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s*/, "")
        .replace(/^\s{0,3}>\s?/, "")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/<\/?(?:strong|b)\b[^>]*>/gi, "")
        .replace(/^\s*-{3,}\s*$/, "")
        .trimEnd()
    )
    .filter((line, index, lines) => !(line.trim() === "" && lines[index - 1]?.trim() === ""))
    .join("\n")
    .trim();

  return dedupeRepeatedDalilBlocks(cleaned);
}

const arabicSegmentPattern = /[\u0600-\u06FF]{3,}/g;
const arabicPattern = /[\u0600-\u06FF]/;
const harakatPattern = /[\u064B-\u065F\u0670]/;

export function hasUndiacritizedArabic(text: string) {
  const segments = text.match(arabicSegmentPattern) ?? [];
  if (segments.length === 0) return false;
  return segments.some((segment) => !harakatPattern.test(segment));
}

const criticalSectionHeaderPattern =
  /^\s*(mukadimah|pembuka(?:an)?|ayat(?:\s+al[- ]?qur['’`a]?n)?|hadits|hadis|penutup khutbah pertama|khutbah kedua|pembuka khutbah kedua|doa(?:\s+penutup)?)\s*:?/i;

function sectionHasUndiacritizedArabic(section: string) {
  const segments = section.match(arabicSegmentPattern) ?? [];
  if (segments.length === 0) return false;
  return segments.some((segment) => !harakatPattern.test(segment));
}

export function hasUndiacritizedArabicInCriticalSections(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections: string[] = [];
  let buffer: string[] = [];
  let inCriticalSection = false;

  for (const line of lines) {
    if (criticalSectionHeaderPattern.test(line)) {
      if (inCriticalSection && buffer.length > 0) sections.push(buffer.join("\n"));
      inCriticalSection = true;
      buffer = [line];
      continue;
    }

    if (/^\s*[A-Za-zÀ-ÿ][^:]{0,80}\s*:?\s*$/.test(line) && inCriticalSection) {
      sections.push(buffer.join("\n"));
      inCriticalSection = false;
      buffer = [];
    }

    if (inCriticalSection) {
      buffer.push(line);
    }
  }

  if (inCriticalSection && buffer.length > 0) sections.push(buffer.join("\n"));
  if (sections.length === 0) return false;
  return sections.some(sectionHasUndiacritizedArabic);
}

const jawaSignalPattern =
  /\b(ingkang|dhumateng|mugi|boten|menawi|dados|awisan|dhawuh|kabecikan|rahmatipun|kagem|saking|wonten|dipun|piyambak)\b/i;
const sundaSignalPattern =
  /\b(anu|urang|mugia|dina|henteu|ngalaksanakeun|parentah|larangan|dipikarahmat|kahadean|rahmat-Na|ngajaga|ngalereskeun|jeung|anjeun)\b/i;
const oganBaturajaSignalPattern =
  /\b(ogan|baturaja|kite|jeme|dang|nian|pacak|idak|nak|bae|galak|dusun|jamaah sekalian|sedekah|ngaji)\b/i;

function stripArabicText(text: string) {
  return text.replace(/[\u0600-\u06FF]+/g, " ");
}

const indonesiaSignalPatterns = [
  /\b(yang|untuk|dengan|dalam|kepada|adalah|kita|kami|agar|karena|sebagai|jangan|tetapi|semoga|hendaknya|marilah|saudara-saudaraku|hadirin)\b/gi,
  /\b(dirahmati|kehidupan|masyarakat|menjaga|memperbaiki|menjalani|melaksanakan|kebaikan|keburukan|amanah|ketakwaan)\b/gi
];
const jawaStrongSignalPatterns = [
  /\b(ingkang|menawi|boten|mugi|kagem|saking|wonten|dados|piyambak|dhumateng|dipun|saged|kedah|sampun|monggo|panjenengan)\b/gi,
  /\b(rahmatipun|tegesipun|pitedah|pangandikan|pambuka|donga)\b/gi
];
const sundaStrongSignalPatterns = [
  /\b(urang|mugia|henteu|kanggo|sangkan|anjeun|simkuring|anjeunna|kumaha|saenyana|ngajaga|ngalereskeun)\b/gi,
  /\b(hartina|pituduh|panganteur|bubuka|panutup|kahadean)\b/gi
];
const oganBaturajaStrongSignalPatterns = [
  /\b(kite|jeme|dang|nian|pacak|idak|nak|bae|galak|dusun|griye|keluarge|artinye|penganten)\b/gi,
  /\b(penganten|pacaklah|idaklah)\b/gi
];
const standardHeadingLinePattern = /^(?:khutbah\s+pertama|khutbah\s+kedua|penutup\s+khutbah\s+pertama|duduk\s+di\s+antara\s+dua\s+khutbah|allah\s+swt\s+berfirman\s+dalam\s+alquran|rasulullah\s+saw\s+bersabda|doa\s+penutup|pembuka|pengantar|renungan|isi\s+utama|poin-poin\s+(?:kunci|utama|wigati)|pesan\s+praktis|pambuka|pangandikan|bubuka|panganteur|panutup|pitedah\s+praktis|pituduh\s+praktis|pokok-pokok\s+penting)\s*:?\s*$/i;
const referenceLinePattern = /^(?:qs\.|hr\.|rujukan|reference|rujukan:|arti(?:nya|nye|na|nipun)?|tegesipun|hartina|artinye)\b/i;

function languageAssessmentText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (standardHeadingLinePattern.test(trimmed)) return false;
      if (referenceLinePattern.test(trimmed)) return false;
      if (/^(?:tema|bahasa|basa|اَللُّغَةُ|اَلْمَوْضُوعُ)\s*:/i.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

function countPatternMatches(text: string, patterns: RegExp[]) {
  let total = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    total += matches?.length ?? 0;
  }
  return total;
}

export function matchesTargetLanguage(text: string, languageValue: unknown) {
  const language = normalizeLanguage(languageValue);
  const assessmentText = languageAssessmentText(text);
  if (!assessmentText.trim()) return false;

  if (language === "Arab") {
    const arabicLetters = (assessmentText.match(/[\u0600-\u06FF]/g) ?? []).length;
    const latinLetters = (assessmentText.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
    const totalLetters = arabicLetters + latinLetters;
    return totalLetters > 0 && arabicLetters / totalLetters >= 0.7 && arabicLetters >= 120 && latinLetters <= arabicLetters * 0.35;
  }

  const nonArabicText = stripArabicText(assessmentText).toLowerCase();
  const indonesiaHits = countPatternMatches(nonArabicText, indonesiaSignalPatterns);
  const jawaHits = countPatternMatches(nonArabicText, jawaStrongSignalPatterns);
  const sundaHits = countPatternMatches(nonArabicText, sundaStrongSignalPatterns);
  const oganHits = countPatternMatches(nonArabicText, oganBaturajaStrongSignalPatterns);

  if (language === "Indonesia") {
    const foreignHits = jawaHits + sundaHits + oganHits;
    return indonesiaHits >= 3 && foreignHits <= 1;
  }

  const targetHits = language === "Jawa" ? jawaHits : language === "Sunda" ? sundaHits : oganHits;
  const competingHits =
    language === "Jawa"
      ? indonesiaHits + sundaHits + oganHits
      : language === "Sunda"
        ? indonesiaHits + jawaHits + oganHits
        : indonesiaHits + jawaHits + sundaHits;

  if (language === "Ogan (Baturaja)") {
    return targetHits >= 3 && targetHits >= Math.max(2, Math.ceil(competingHits * 0.6));
  }

  return targetHits >= 3 && targetHits > competingHits;
}

const hamdalahPattern = /(?:اَلْحَمْدُ|الْحَمْدُ|حَمْدًا|نَحْمَدُ)/;
const syahadatPattern = /(?:أَشْهَدُ|اَشْهَدُ|نَشْهَدُ)[\s\S]{0,160}(?:لَا إِلٰهَ إِلَّا اللهُ|لَا إِلَهَ إِلَّا اللهُ)[\s\S]{0,220}(?:مُحَمَّدًا|مُحَمَّدٌ|مُحَمَّد)/;
const shalawatPattern = /(?:الصَّلَاةُ|الصَّلَاةُ|صَلِّ|صَلِّ|صَلَّى|صَلَّى|صَلُّوا|صَلُّوا|مُحَم|النَّبِي|النَّبِي)/;
const wasiatTakwaPattern = /(?:أُوْصِي|أُوصِي|اُوْصِي|اِتَّقُوا|اتَّقُوا|اتَّقُوا|فَاتَّقُوا|تَقْو|تَّقْو|بِتَقْو|التَّقْوَى|التَّقْوَى|الْمُتَّق|الْمُتَّق)/;
const mukmininDoaPattern = /(?:الْمُسْلِمِيْنَ|الْمُسْلِمِينَ|الْمُؤْمِنِيْنَ|الْمُؤْمِنِينَ|الْمُسْلِمَاتِ|الْمُؤْمِنَاتِ)/;
const takbirPattern = /(?:اَللهُ أَكْبَرُ|اللهُ أَكْبَرُ|اللّٰهُ أَكْبَرُ)/;
const khutbahPertamaHeaderPattern = /^\s*Khutbah\s+Pertama\s*:?\s*$/im;
const khutbahKeduaHeaderPattern = /^\s*Khutbah\s+Kedua\s*:?\s*$/im;
const sittingHeaderPattern = /^\s*Duduk\s+di\s+Antara\s+Dua\s+Khutbah\s*:?\s*$/im;
const ayatHeaderPattern = /^\s*(?:Rukun\s+4:\s*)?(?:Ayat\s+Al[- ]?Qur['’`a]?n|Allah\s+SWT\s+berfirman\s+dalam\s+AlQuran)\s*:?\s*$/im;
const hadithHeaderPattern = /^\s*(?:Hadits|Hadis|Rasulullah\s+SAW\s+bersabda)\s*:?\s*$/im;
const doaPenutupHeaderPattern = /^\s*(?:Doa\s+Penutup|الدُّعَاءُ|الدعاء)\s*:?\s*$/im;
const arabicDoaHeaderPattern = /^\s*(?:الدُّعَاءُ|الدعاء)\s*:?\s*$/im;

function collectSections(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ header: string; body: string }> = [];
  let currentHeader = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’`: -]{1,80}:?$/.test(trimmed);
    if (isHeading) {
      if (currentHeader) sections.push({ header: currentHeader, body: currentBody.join("\n") });
      currentHeader = trimmed.replace(/:$/, "");
      currentBody = [];
      continue;
    }

    if (currentHeader) currentBody.push(line);
  }

  if (currentHeader) sections.push({ header: currentHeader, body: currentBody.join("\n") });
  return sections;
}

export function missingRequiredArabicSections(jenis: string, text: string) {
  if (jenis === "nikah") return missingRequiredNikahRukun(text);
  if (!isKhutbahRukunType(jenis)) return [];
  return missingRequiredKhutbahRukun(jenis, text);
}

function missingRequiredNikahRukun(text: string) {
  const pembukaan = sectionText(text, /^\s*(?:Pembukaan|Pembuka|Khutbah Nikah)\s*:?/im, ayatHeaderPattern) || text;
  const checks: Array<[string, boolean]> = [
    ["hamdalah_pembukaan", hamdalahPattern.test(pembukaan)],
    ["syahadat_pembukaan", syahadatPattern.test(pembukaan)],
    ["shalawat_pembukaan", shalawatPattern.test(pembukaan)],
    ["wasiat_takwa_pembukaan", wasiatTakwaPattern.test(pembukaan)],
    ["ayat_al_quran", ayatHeaderPattern.test(text) && arabicPattern.test(sectionText(text, ayatHeaderPattern))],
    ["hadits", hadithHeaderPattern.test(text) && arabicPattern.test(sectionText(text, hadithHeaderPattern))],
    ["doa_penutup", doaPenutupHeaderPattern.test(text) || arabicDoaHeaderPattern.test(text) || /^\s*(?:Doa\s+Penutup|Doa)\s*:?\s*$/im.test(text)]
  ];

  return checks
    .map(([name, passed]) => (passed ? "" : name))
    .filter(Boolean);
}

function isKhutbahRukunType(jenis: string) {
  return jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha";
}

function sectionText(text: string, start: RegExp, end?: RegExp) {
  const startMatch = text.match(start);
  if (!startMatch || startMatch.index === undefined) return "";
  const startIndex = startMatch.index;
  const rest = text.slice(startIndex);
  if (!end) return rest;

  const endMatch = rest.slice(startMatch[0].length).match(end);
  if (!endMatch || endMatch.index === undefined) return rest;
  return rest.slice(0, startMatch[0].length + endMatch.index);
}

export function wordCount(text: string) {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}'’]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function minimumWordCountFor(jenis: string, parameters: Record<string, unknown> = {}) {
  const duration = normalizedDuration(parameters.durasi);

  if (jenis === "kultum") {
    if (duration === "pendek") return 500;
    if (duration === "panjang") return 850;
    return 700;
  }

  if (jenis === "ceramah") {
    if (duration === "pendek") return 900;
    if (duration === "panjang") return 1600;
    return 1300;
  }

  if (jenis === "nikah") {
    if (duration === "pendek") return 800;
    if (duration === "panjang") return 1300;
    return 1100;
  }

  if (duration === "pendek") return 700;
  if (duration === "panjang") return 1400;
  return 1100;
}

export function meetsMinimumLength(jenis: string, text: string, parameters: Record<string, unknown> = {}) {
  return wordCount(text) >= minimumWordCountFor(jenis, parameters);
}

export function appearsTruncatedText(text: string) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = lines.at(-1) ?? "";
  if (!lastLine) return false;
  if (/[,:;،؛]$/.test(lastLine)) return true;
  return /\b(?:yang|dan|atau|untuk|dengan|di|ke|dari|pada|dalam|karena|agar|supaya|sebagai|bisa|dapat|akan|adalah|menjadi|lebih|tidak|belum|sudah|juga|kita|harus)$/i.test(lastLine);
}

export function hasSubstantialArabicOpening(jenis: string, text: string) {
  if (jenis === "nikah") {
    const opening = sectionText(text, /^\s*(?:Pembukaan|Pembuka|Khutbah Nikah)\s*:?/im, ayatHeaderPattern);
    const arabicChars = (opening.match(/[\u0600-\u06FF]/g) ?? []).length;
    return arabicChars >= 120;
  }
  if (!isKhutbahRukunType(jenis)) return true;
  const khutbahOpening = sectionText(text, khutbahPertamaHeaderPattern, ayatHeaderPattern);
  const arabicChars = (khutbahOpening.match(/[\u0600-\u06FF]/g) ?? []).length;
  return arabicChars >= 220;
}

export function hasSubstantialArabicClosingPrayer(jenis: string, text: string) {
  if (jenis === "nikah") {
    const closingPrayer = sectionText(text, doaPenutupHeaderPattern) || sectionText(text, /Doa/i);
    const arabicChars = (closingPrayer.match(/[\u0600-\u06FF]/g) ?? []).length;
    return arabicChars >= 60;
  }
  if (!isKhutbahRukunType(jenis)) return true;
  const closingPrayer = sectionText(text, doaPenutupHeaderPattern) || sectionText(text, khutbahKeduaHeaderPattern);
  const arabicChars = (closingPrayer.match(/[\u0600-\u06FF]/g) ?? []).length;
  const sentenceMarks = (closingPrayer.match(/[.،؛؟]/g) ?? []).length;
  return arabicChars >= 140 && sentenceMarks >= 2;
}

function missingRequiredKhutbahRukun(jenis: string, text: string) {
  if (!isKhutbahRukunType(jenis)) return [];

  const khutbahPertama = sectionText(text, khutbahPertamaHeaderPattern, khutbahKeduaHeaderPattern);
  const khutbahKedua = sectionText(text, khutbahKeduaHeaderPattern);
  const checks: Array<[string, boolean]> = [
    ["khutbah_pertama", khutbahPertama.length > 0],
    ["khutbah_kedua", khutbahKedua.length > 0],
    ["hamdalah_khutbah_pertama", hamdalahPattern.test(khutbahPertama)],
    ["syahadat_khutbah_pertama", syahadatPattern.test(khutbahPertama)],
    ["shalawat_khutbah_pertama", shalawatPattern.test(khutbahPertama)],
    ["wasiat_takwa_khutbah_pertama", wasiatTakwaPattern.test(khutbahPertama)],
    ["hamdalah_khutbah_kedua", hamdalahPattern.test(khutbahKedua)],
    ["shalawat_khutbah_kedua", shalawatPattern.test(khutbahKedua)],
    ["wasiat_takwa_khutbah_kedua", wasiatTakwaPattern.test(khutbahKedua)],
    ["ayat_al_quran", ayatHeaderPattern.test(text) && arabicPattern.test(sectionText(text, ayatHeaderPattern))],
    ["hadits", hadithHeaderPattern.test(text) && arabicPattern.test(sectionText(text, hadithHeaderPattern))],
    ["doa_mukminin_khutbah_kedua", mukmininDoaPattern.test(khutbahKedua)]
  ];

  if (jenis === "idul-fitri" || jenis === "idul-adha") {
    checks.push(["takbir_khutbah_pertama", takbirPattern.test(khutbahPertama)]);
    checks.push(["takbir_khutbah_kedua", takbirPattern.test(khutbahKedua)]);
  }

  return checks
    .map(([name, passed]) => (passed ? "" : name))
    .filter(Boolean);
}

function hasRequiredKhutbahRukun(jenis: string, text: string) {
  return missingRequiredKhutbahRukun(jenis, text).length === 0;
}

function hasRequiredIdulArabicSections(jenis: string, text: string) {
  if (jenis !== "idul-fitri" && jenis !== "idul-adha") return true;

  const khutbahPertama = sectionText(text, khutbahPertamaHeaderPattern, khutbahKeduaHeaderPattern);
  const khutbahKedua = sectionText(text, khutbahKeduaHeaderPattern);
  return (
    takbirPattern.test(khutbahPertama) &&
    takbirPattern.test(khutbahKedua) &&
    arabicPattern.test(sectionText(text, ayatHeaderPattern)) &&
    arabicPattern.test(sectionText(text, hadithHeaderPattern))
  );
}

export function isGeneratedTextAcceptable(jenis: string, text: string, parameters: Record<string, unknown> = {}) {
  if (!text) return false;
  if (jenis === "nikah" && missingRequiredNikahRukun(text).length > 0) return false;
  return (
    hasRequiredIdulArabicSections(jenis, text) &&
    hasRequiredKhutbahRukun(jenis, text) &&
    (!isKhutbahRukunType(jenis) || isKhutbahSecondSectionArabicOnly(text)) &&
    !hasContextLeak(jenis, text) &&
    !hasUndiacritizedArabicInCriticalSections(text) &&
    !hasUndiacritizedArabic(text) &&
    matchesTargetLanguage(text, parameters.bahasa)
  );
}

export function hasContextLeak(jenis: string, text: string) {
  if (jenis === "idul-fitri" || jenis === "idul-adha") {
    return /\b(?:shalat\s+jumat|salat\s+jumat|khutbah\s+jumat|majelis\s+jumat|jumat\s+meminta|setiap\s+jumat|ibadah\s+jumat)\b/i.test(text);
  }

  if (jenis === "khutbah-jumat") {
    return /\b(?:idul\s+fitri|idul\s+adha|hari\s+raya\s+ini|syawal\s+menguji|gema\s+takbir)\b/i.test(text);
  }

  return false;
}

export function completeMissingSecondKhutbah(jenis: string, text: string, parameters: Record<string, unknown>) {
  if (!isKhutbahRukunType(jenis)) return text;
  const missing = missingRequiredKhutbahRukun(jenis, text);
  const onlySecondKhutbahMissing = missing.length > 0 && missing.every((item) => item.includes("khutbah_kedua") || item === "doa_mukminin_khutbah_kedua");
  if (!onlySecondKhutbahMissing) return text;

  const fallback = fallbackNaskah(jenis, { ...parameters, __variationSeed: "second-khutbah-completion" });
  const fallbackSecondKhutbah = sectionText(fallback, khutbahKeduaHeaderPattern);
  if (!fallbackSecondKhutbah) return text;

  const withoutIncompleteSecond = text
    .replace(new RegExp(`${sittingHeaderPattern.source}[\\s\\S]*$`, "im"), "")
    .replace(new RegExp(`${khutbahKeduaHeaderPattern.source}[\\s\\S]*$`, "im"), "")
    .trimEnd();
  return `${withoutIncompleteSecond}

${fallbackSecondKhutbah}`.trim();
}

export function isKhutbahSecondSectionArabicOnly(text: string) {
  const secondKhutbah = sectionText(text, khutbahKeduaHeaderPattern);
  if (!secondKhutbah) return false;
  const nonArabicText = stripArabicText(secondKhutbah)
    .replace(khutbahKeduaHeaderPattern, "")
    .replace(arabicDoaHeaderPattern, "")
    .replace(/[0-9\s.,:;!?'"()\-–—/\\[\]{}،؛؟]+/g, "")
    .trim();
  return nonArabicText.length === 0;
}

export function isKhutbahJumatSecondSectionArabicOnly(text: string) {
  return isKhutbahSecondSectionArabicOnly(text);
}

function variantIndex(seed: string, length: number, salt = 0) {
  let hash = salt + 17;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

function pick<T>(items: T[], seed: string, salt = 0) {
  return items[variantIndex(seed, items.length, salt)];
}

const khutbahArabicVariants = {
  hamdalah: [
    "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِيْنَ، حَمْدًا كَثِيْرًا طَيِّبًا مُبَارَكًا فِيْهِ.",
    "إِنَّ الْحَمْدَ لِلّٰهِ، نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ.",
    "اَلْحَمْدُ لِلّٰهِ الَّذِيْ أَنْعَمَ عَلَيْنَا بِنِعْمَةِ الْإِيْمَانِ وَالْإِسْلَامِ.",
    "اَلْحَمْدُ لِلّٰهِ الَّذِيْ هَدَانَا لِهٰذَا، وَمَا كُنَّا لِنَهْتَدِيَ لَوْلَا أَنْ هَدَانَا اللهُ.",
    "اَلْحَمْدُ لِلّٰهِ نَحْمَدُهُ حَمْدَ الشَّاكِرِيْنَ، وَنَسْأَلُهُ ثَبَاتَ الْمُؤْمِنِيْنَ.",
    "اَلْحَمْدُ لِلّٰهِ الَّذِيْ جَعَلَ التَّقْوَى زَادًا لِعِبَادِهِ، وَفَتَحَ لَهُمْ أَبْوَابَ رَحْمَتِهِ.",
    "اَلْحَمْدُ لِلّٰهِ الَّذِيْ بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ، وَبِفَضْلِهِ تَنْزِلُ الْبَرَكَاتُ.",
    "اَلْحَمْدُ لِلّٰهِ نَحْمَدُهُ عَلَى نِعَمِهِ الظَّاهِرَةِ وَالْبَاطِنَةِ، وَنَسْأَلُهُ عَوْنًا عَلَى طَاعَتِهِ.",
    "اَلْحَمْدُ لِلّٰهِ الَّذِيْ وَسِعَتْ رَحْمَتُهُ كُلَّ شَيْءٍ، وَغَلَبَ فَضْلُهُ كُلَّ تَقْصِيْرٍ.",
    "سُبْحَانَ مَنْ تَفَرَّدَ بِالْجَلَالِ وَالْكَمَالِ، وَلَهُ الْحَمْدُ فِي الْأُوْلَى وَالْآخِرَةِ.",
    "اَلْحَمْدُ لِلّٰهِ الَّذِيْ أَحْيَا قُلُوْبَ عِبَادِهِ بِالذِّكْرِ، وَزَيَّنَ أَعْمَالَهُمْ بِالْإِخْلَاصِ."
  ],
  syahadat: [
    "أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ، وَحْدَهُ لَا شَرِيْكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.",
    "نَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ، وَنَشْهَدُ أَنَّ سَيِّدَنَا مُحَمَّدًا رَسُوْلُ اللهِ.",
    "أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُوْلُ اللهِ.",
    "وَأَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ الْمَلِكُ الْحَقُّ الْمُبِيْنُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا صَادِقُ الْوَعْدِ الْأَمِيْنُ.",
    "أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ إِقْرَارًا بِرُبُوْبِيَّتِهِ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ الدَّاعِيْ إِلَى رِضْوَانِهِ."
  ],
  shalawat: [
    "اَللّٰهُمَّ صَلِّ وَسَلِّمْ عَلَى سَيِّدِنَا مُحَمَّدٍ، وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِيْنَ.",
    "وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُوْلِ اللهِ، سَيِّدِنَا مُحَمَّدٍ، وَعَلَى آلِهِ وَصَحْبِهِ وَمَنْ وَالَاهُ.",
    "اَللّٰهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ.",
    "اَللّٰهُمَّ صَلِّ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ، صَلَاةً تُزَكِّيْ بِهَا قُلُوْبَنَا وَتَرْفَعُ بِهَا دَرَجَاتِنَا.",
    "اَللّٰهُمَّ صَلِّ وَسَلِّمْ عَلَى مَنْ أَرْسَلْتَهُ رَحْمَةً لِلْعَالَمِيْنَ، وَعَلَى آلِهِ وَأَصْحَابِهِ الطَّيِّبِيْنَ.",
    "اَللّٰهُمَّ صَلِّ وَسَلِّمْ عَلَى النَّبِيِّ الْمُصْطَفَى، وَعَلَى آلِهِ أَهْلِ الْوَفَاءِ وَالتُّقَى.",
    "اَللّٰهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ صَلَاةً تَفْتَحُ لَنَا بِهَا أَبْوَابَ الرَّحْمَةِ وَالْهِدَايَةِ.",
    "وَنُصَلِّيْ وَنُسَلِّمُ عَلَى خَيْرِ خَلْقِ اللهِ، سَيِّدِنَا مُحَمَّدٍ، وَعَلَى آلِهِ وَصَحْبِهِ وَالتَّابِعِيْنَ."
  ],
  wasiat: [
    "أُوْصِيْكُمْ وَنَفْسِيْ بِتَقْوَى اللهِ، فَقَدْ فَازَ الْمُتَّقُوْنَ.",
    "فَيَا عِبَادَ اللهِ، اِتَّقُوا اللهَ حَقَّ تُقَاتِهِ، وَلَا تَمُوْتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُوْنَ.",
    "أُوْصِيْ نَفْسِيَ الْمُقَصِّرَةَ وَإِيَّاكُمْ بِتَقْوَى اللهِ فِي السِّرِّ وَالْعَلَنِ.",
    "فَاتَّقُوا اللهَ عِبَادَ اللهِ، وَرَاقِبُوْهُ فِي الْخَلَوَاتِ قَبْلَ الْجَلَوَاتِ.",
    "لِنَجْعَلِ التَّقْوَى نُوْرَ قُلُوْبِنَا، وَمِعْيَارَ أَقْوَالِنَا، وَحَارِسَ أَعْمَالِنَا.",
    "اِتَّقُوا اللهَ فِيْمَا تَقُوْلُوْنَ وَتَعْمَلُوْنَ، فَإِنَّهُ يَعْلَمُ خَائِنَةَ الْأَعْيُنِ وَمَا تُخْفِي الصُّدُوْرُ.",
    "أُوْصِيْكُمْ وَنَفْسِيْ بِمُرَاقَبَةِ اللهِ، فَمَنْ رَاقَبَ اللهَ أَصْلَحَ اللهُ سِرَّهُ وَعَلَانِيَتَهُ.",
    "يَا عِبَادَ اللهِ، جَدِّدُوا التَّقْوَى فِي قُلُوْبِكُمْ، وَاسْتَكْثِرُوا مِنَ الْخَيْرِ قَبْلَ فَوَاتِ الْأَوَانِ."
  ],
  ayat: [
    {
      arab: "يَا أَيُّهَا الَّذِيْنَ آمَنُوا اتَّقُوا اللهَ حَقَّ تُقَاتِهِ وَلَا تَمُوْتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُوْنَ.",
      arti: "Wahai orang-orang yang beriman, bertakwalah kepada Allah dengan sebenar-benar takwa kepada-Nya, dan janganlah kamu mati kecuali dalam keadaan muslim.",
      rujukan: "QS. Ali 'Imran: 102"
    },
    {
      arab: "فَاتَّقُوا اللهَ مَا اسْتَطَعْتُمْ وَاسْمَعُوا وَأَطِيْعُوا وَأَنْفِقُوا خَيْرًا لِأَنْفُسِكُمْ.",
      arti: "Maka bertakwalah kamu kepada Allah menurut kesanggupanmu, dengarlah, taatlah, dan infakkanlah harta yang baik untuk dirimu.",
      rujukan: "QS. At-Taghabun: 16"
    },
    {
      arab: "إِنَّ اللهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيْتَاءِ ذِي الْقُرْبَى.",
      arti: "Sesungguhnya Allah menyuruh berlaku adil, berbuat ihsan, dan memberi bantuan kepada kerabat.",
      rujukan: "QS. An-Nahl: 90"
    }
  ],
  hadith: [
    {
      arab: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى.",
      arti: "Sesungguhnya amal-amal itu bergantung pada niat, dan setiap orang mendapatkan sesuai dengan apa yang ia niatkan.",
      rujukan: "HR. Bukhari dan Muslim"
    },
    {
      arab: "مَنْ كَانَ يُؤْمِنُ بِاللهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ.",
      arti: "Siapa yang beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.",
      rujukan: "HR. Bukhari dan Muslim"
    },
    {
      arab: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيْهِ مَا يُحِبُّ لِنَفْسِهِ.",
      arti: "Tidak sempurna iman salah seorang dari kalian sampai ia mencintai saudaranya sebagaimana ia mencintai dirinya sendiri.",
      rujukan: "HR. Bukhari dan Muslim"
    }
  ],
  penutupPertama: [
    "بَارَكَ اللهُ لِيْ وَلَكُمْ فِي الْقُرْآنِ الْعَظِيْمِ، وَنَفَعَنِيْ وَإِيَّاكُمْ بِمَا فِيْهِ مِنَ الْآيَاتِ وَالذِّكْرِ الْحَكِيْمِ.",
    "أَقُوْلُ قَوْلِيْ هٰذَا، وَأَسْتَغْفِرُ اللهَ الْعَظِيْمَ لِيْ وَلَكُمْ، فَاسْتَغْفِرُوْهُ إِنَّهُ هُوَ الْغَفُوْرُ الرَّحِيْمُ.",
    "نَسْأَلُ اللهَ أَنْ يَجْعَلَ الْقُرْآنَ رَبِيْعَ قُلُوْبِنَا، وَنُوْرَ صُدُوْرِنَا، وَجَلَاءَ أَحْزَانِنَا.",
    "فَيَا فَوْزَ مَنْ سَمِعَ الْمَوْعِظَةَ فَعَمِلَ بِهَا، وَيَا سَعَادَةَ مَنْ رَجَعَ إِلَى رَبِّهِ تَائِبًا مُنِيْبًا.",
    "نَفَعَنَا اللهُ وَإِيَّاكُمْ بِهَدْيِ كِتَابِهِ، وَجَعَلَنَا مِنَ الَّذِيْنَ يَسْتَمِعُوْنَ الْقَوْلَ فَيَتَّبِعُوْنَ أَحْسَنَهُ.",
    "جَعَلَنَا اللهُ وَإِيَّاكُمْ مِنْ أَهْلِ الْقُرْآنِ الَّذِيْنَ هُمْ أَهْلُ اللهِ وَخَاصَّتُهُ.",
    "فَاسْتَغْفِرُوا رَبَّكُمْ وَتُوْبُوا إِلَيْهِ، إِنَّهُ كَانَ لِلْمُسْتَغْفِرِيْنَ غَفُوْرًا رَحِيْمًا.",
    "أَسْأَلُ اللهَ أَنْ يَفْتَحَ لَنَا أَبْوَابَ الْفَهْمِ وَالْعَمَلِ، وَأَنْ يَصْرِفَ عَنَّا أَبْوَابَ الْغَفْلَةِ وَالزَّلَلِ.",
    "تَقَبَّلَ اللهُ مِنَّا وَمِنْكُمْ صَالِحَ الْأَعْمَالِ، وَغَفَرَ لَنَا مَا كَانَ مِنَ الزَّلَلِ وَالتَّقْصِيْرِ."
  ],
  doaMukminin: [
    "اَللّٰهُمَّ اغْفِرْ لِلْمُسْلِمِيْنَ وَالْمُسْلِمَاتِ، وَالْمُؤْمِنِيْنَ وَالْمُؤْمِنَاتِ، اَلْأَحْيَاءِ مِنْهُمْ وَالْأَمْوَاتِ.",
    "اَللّٰهُمَّ ارْحَمِ الْمُؤْمِنِيْنَ وَالْمُؤْمِنَاتِ، وَأَصْلِحْ قُلُوْبَنَا، وَاجْمَعْنَا عَلَى طَاعَتِكَ.",
    "اَللّٰهُمَّ اغْفِرْ لَنَا وَلِوَالِدِيْنَا وَلِجَمِيْعِ الْمُسْلِمِيْنَ وَالْمُسْلِمَاتِ، يَا أَرْحَمَ الرَّاحِمِيْنَ.",
    "اَللّٰهُمَّ أَصْلِحْ أَحْوَالَ الْمُؤْمِنِيْنَ، وَاشْفِ مَرْضَاهُمْ، وَارْحَمْ ضُعَفَاءَهُمْ، وَفَرِّجْ هُمُوْمَهُمْ.",
    "اَللّٰهُمَّ اجْمَعْ قُلُوْبَ الْمُسْلِمِيْنَ عَلَى الْهُدَى، وَاحْفَظْهُمْ مِنَ الْفِتَنِ مَا ظَهَرَ مِنْهَا وَمَا بَطَنَ.",
    "اَللّٰهُمَّ أَعِزَّ الْإِسْلَامَ وَالْمُسْلِمِيْنَ، وَأَلِّفْ بَيْنَ قُلُوْبِ الْمُؤْمِنِيْنَ.",
    "اَللّٰهُمَّ اسْتُرْ عَوْرَاتِ الْمُسْلِمِيْنَ، وَآمِنْ رَوْعَاتِهِمْ، وَاقْضِ حَوَائِجَهُمْ بِرَحْمَتِكَ.",
    "اَللّٰهُمَّ لَا تَدَعْ لِلْمُؤْمِنِيْنَ ذَنْبًا إِلَّا غَفَرْتَهُ، وَلَا هَمًّا إِلَّا فَرَّجْتَهُ، وَلَا مَرِيْضًا إِلَّا شَفَيْتَهُ."
  ],
  doaPenutup: [
    "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً، وَفِي الْآخِرَةِ حَسَنَةً، وَقِنَا عَذَابَ النَّارِ.",
    "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا، وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُوْنَنَّ مِنَ الْخَاسِرِيْنَ.",
    "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ، وَاجْعَلْنَا لِلْمُتَّقِيْنَ إِمَامًا.",
    "اَللّٰهُمَّ أَحْيِنَا عَلَى الْإِيْمَانِ، وَأَمِتْنَا عَلَى الْإِسْلَامِ، وَاحْشُرْنَا فِيْ زُمْرَةِ الصَّالِحِيْنَ.",
    "اَللّٰهُمَّ اجْعَلْنَا مِنْ عِبَادِكَ الشَّاكِرِيْنَ، وَمِنْ أَوْلِيَائِكَ الْمُتَّقِيْنَ، وَمِنْ أَهْلِ الْقُرْآنِ الْعَامِلِيْنَ.",
    "رَبَّنَا اغْفِرْ لَنَا ذُنُوْبَنَا، وَاسْتُرْ عُيُوْبَنَا، وَبَارِكْ فِيْ أَهْلِنَا وَأَرْزَاقِنَا، وَاخْتِمْ لَنَا بِحُسْنِ الْخَاتِمَةِ.",
    "اَللّٰهُمَّ اجْعَلْ أَعْمَالَنَا خَالِصَةً لِوَجْهِكَ، وَأَلْسِنَتَنَا رَطْبَةً بِذِكْرِكَ، وَقُلُوْبَنَا مُطْمَئِنَّةً بِقُرْبِكَ.",
    "رَبَّنَا لَا تُزِغْ قُلُوْبَنَا بَعْدَ إِذْ هَدَيْتَنَا، وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً، إِنَّكَ أَنْتَ الْوَهَّابُ.",
    "اَللّٰهُمَّ بَارِكْ لَنَا فِيْ أَعْمَارِنَا وَأَوْقَاتِنَا، وَارْزُقْنَا تَوْبَةً صَادِقَةً قَبْلَ الْمَمَاتِ.",
    "اَللّٰهُمَّ احْفَظْ بِلَادَنَا وَأَهْلَنَا، وَاجْعَلْنَا مَفَاتِيْحَ لِلْخَيْرِ مَغَالِيْقَ لِلشَّرِّ.",
    "رَبَّنَا أَصْلِحْ لَنَا دِيْنَنَا الَّذِيْ هُوَ عِصْمَةُ أَمْرِنَا، وَأَصْلِحْ لَنَا دُنْيَانَا الَّتِيْ فِيْهَا مَعَاشُنَا."
  ]
};

function pickDistinct(items: string[], seed: string, salts: number[]) {
  const selected: string[] = [];
  for (const salt of salts) {
    const item = pick(items, seed, salt);
    if (!selected.includes(item)) selected.push(item);
  }
  return selected.join("\n");
}

type FallbackSection = { title: string; body: string };
export type DalilText = { arab: string; arti: string; rujukan: string };

export type PromptDalilItem = {
  kind: "quran" | "hadith";
  reference: string;
  arab?: string;
  translation: string;
  source: string;
  grade?: string;
  takhrij?: string;
  tafsir?: string;
  relevance?: string;
  fallback?: boolean;
};

export type PromptDalilContext = {
  theme: string;
  source: string;
  quran: PromptDalilItem[];
  hadith: PromptDalilItem[];
  warnings?: string[];
};

export type CuratedDalilSeedItem = {
  id: string;
  kind: "quran" | "hadith";
  reference: string;
  arab: string;
  translation: string;
  source: string;
  grade?: string | null;
  takhrij?: string | null;
  tafsir?: string | null;
  tags: string[];
};

type ThematicDalilSet = {
  label: string;
  keywords: string[];
  ayat: DalilText[];
  hadith: DalilText[];
};

export const thematicDalilSets: ThematicDalilSet[] = [
  {
    label: "Muharram, Asyura, bulan haram, dan tahun baru Hijriah",
    keywords: [
      "muharram",
      "muharam",
      "asyura",
      "ashura",
      "tasua",
      "tasu'a",
      "tahun baru islam",
      "tahun baru hijriah",
      "hijriyah",
      "hijriah",
      "bulan haram",
      "syahrullah",
      "puasa muharram",
      "puasa asyura",
      "puasa tasua",
      "amalan muharram",
      "amalan bulan muharram"
    ],
    ayat: [
      {
        arab: "إِنَّ عِدَّةَ الشُّهُوْرِ عِنْدَ اللهِ اثْنَا عَشَرَ شَهْرًا فِيْ كِتَابِ اللهِ يَوْمَ خَلَقَ السَّمٰوَاتِ وَالْأَرْضَ مِنْهَا أَرْبَعَةٌ حُرُمٌ، ذٰلِكَ الدِّيْنُ الْقَيِّمُ، فَلَا تَظْلِمُوْا فِيْهِنَّ أَنْفُسَكُمْ.",
        arti:
          "Sesungguhnya bilangan bulan di sisi Allah adalah dua belas bulan dalam ketetapan Allah sejak Dia menciptakan langit dan bumi; di antaranya ada empat bulan haram. Itulah agama yang lurus, maka janganlah kalian menzalimi diri di dalamnya.",
        rujukan: "QS. At-Taubah: 36"
      }
    ],
    hadith: [
      {
        arab: "أَفْضَلُ الصِّيَامِ بَعْدَ رَمَضَانَ شَهْرُ اللهِ الْمُحَرَّمُ، وَأَفْضَلُ الصَّلَاةِ بَعْدَ الْفَرِيْضَةِ صَلَاةُ اللَّيْلِ.",
        arti:
          "Puasa yang paling utama setelah Ramadhan adalah puasa di bulan Allah, Muharram. Shalat yang paling utama setelah shalat fardhu adalah shalat malam.",
        rujukan: "HR. Muslim"
      },
      {
        arab: "صِيَامُ يَوْمِ عَاشُوْرَاءَ، أَحْتَسِبُ عَلَى اللهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِيْ قَبْلَهُ.",
        arti: "Puasa hari Asyura, aku berharap kepada Allah agar menghapus dosa setahun sebelumnya.",
        rujukan: "HR. Muslim"
      },
      {
        arab: "لَئِنْ بَقِيْتُ إِلَى قَابِلٍ لَأَصُوْمَنَّ التَّاسِعَ.",
        arti: "Jika aku masih hidup sampai tahun depan, sungguh aku akan berpuasa pada hari kesembilan.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "shalat, shalat sunah, dan kedekatan kepada Allah",
    keywords: [
      "shalat",
      "salat",
      "sholat",
      "sembahyang",
      "sunah",
      "sunnah",
      "rawatib",
      "tahajud",
      "dhuha",
      "witir",
      "qiyam"
    ],
    ayat: [
      {
        arab: "وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَلَذِكْرُ اللهِ أَكْبَرُ.",
        arti:
          "Dirikanlah shalat. Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar, dan mengingat Allah melalui shalat adalah lebih besar keutamaannya.",
        rujukan: "QS. Al-'Ankabut: 45"
      },
      {
        arab: "قَدْ أَفْلَحَ الْمُؤْمِنُوْنَ، الَّذِيْنَ هُمْ فِيْ صَلَاتِهِمْ خَاشِعُوْنَ.",
        arti: "Sungguh beruntung orang-orang yang beriman, yaitu mereka yang khusyuk dalam shalatnya.",
        rujukan: "QS. Al-Mu'minun: 1-2"
      }
    ],
    hadith: [
      {
        arab: "مَا مِنْ عَبْدٍ مُسْلِمٍ يُصَلِّيْ لِلّٰهِ كُلَّ يَوْمٍ ثِنْتَيْ عَشْرَةَ رَكْعَةً تَطَوُّعًا غَيْرَ فَرِيْضَةٍ إِلَّا بَنَى اللهُ لَهُ بَيْتًا فِي الْجَنَّةِ.",
        arti:
          "Tidaklah seorang hamba muslim shalat karena Allah setiap hari dua belas rakaat sunah selain shalat wajib, kecuali Allah membangunkan baginya sebuah rumah di surga.",
        rujukan: "HR. Muslim"
      },
      {
        arab: "أَفْضَلُ الصَّلَاةِ بَعْدَ الْفَرِيْضَةِ صَلَاةُ اللَّيْلِ.",
        arti: "Shalat yang paling utama setelah shalat fardhu adalah shalat malam.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "riba, muamalah, dan rezeki halal",
    keywords: ["riba", "bunga", "pinjaman", "utang", "hutang", "paylater", "muamalah", "rezeki haram", "rezeki halal"],
    ayat: [
      {
        arab: "يَمْحَقُ اللهُ الرِّبَا وَيُرْبِي الصَّدَقَاتِ وَاللهُ لَا يُحِبُّ كُلَّ كَفَّارٍ أَثِيْمٍ.",
        arti: "Allah memusnahkan riba dan menyuburkan sedekah. Allah tidak menyukai setiap orang yang tetap kafir dan bergelimang dosa.",
        rujukan: "QS. Al-Baqarah: 276"
      }
    ],
    hadith: [
      {
        arab: "لَعَنَ رَسُوْلُ اللهِ آكِلَ الرِّبَا وَمُؤْكِلَهُ وَكَاتِبَهُ وَشَاهِدَيْهِ، وَقَالَ: هُمْ سَوَاءٌ.",
        arti: "Rasulullah melaknat pemakan riba, pemberi riba, pencatatnya, dan dua saksinya; beliau bersabda bahwa mereka sama.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "rezeki halal, bekerja, dan mencari nafkah",
    keywords: ["halal", "haram", "rezeki", "nafkah halal", "kerja", "bekerja", "usaha", "dagang", "penghasilan", "mencari nafkah"],
    ayat: [
      {
        arab: "يَا أَيُّهَا النَّاسُ كُلُوْا مِمَّا فِي الْأَرْضِ حَلَالًا طَيِّبًا وَلَا تَتَّبِعُوْا خُطُوَاتِ الشَّيْطَانِ.",
        arti: "Wahai manusia, makanlah dari apa yang ada di bumi yang halal lagi baik, dan janganlah mengikuti langkah-langkah setan.",
        rujukan: "QS. Al-Baqarah: 168"
      }
    ],
    hadith: [
      {
        arab: "إِنَّ اللهَ طَيِّبٌ لَا يَقْبَلُ إِلَّا طَيِّبًا.",
        arti: "Sesungguhnya Allah itu Mahabaik dan tidak menerima kecuali yang baik.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "judi, maisir, dan bahaya judi online",
    keywords: ["judi", "maisir", "maysir", "gambling", "slot", "togel", "taruhan", "betting", "judi online", "judol"],
    ayat: [
      {
        arab: "يَا أَيُّهَا الَّذِيْنَ آمَنُوا إِنَّمَا الْخَمْرُ وَالْمَيْسِرُ وَالْأَنْصَابُ وَالْأَزْلَامُ رِجْسٌ مِنْ عَمَلِ الشَّيْطَانِ فَاجْتَنِبُوْهُ لَعَلَّكُمْ تُفْلِحُوْنَ.",
        arti:
          "Wahai orang-orang yang beriman, sesungguhnya khamar, judi, berhala, dan mengundi nasib adalah perbuatan keji dari perbuatan setan. Maka jauhilah agar kamu beruntung.",
        rujukan: "QS. Al-Ma'idah: 90"
      }
    ],
    hadith: [
      {
        arab: "مَنْ قَالَ لِصَاحِبِهِ: تَعَالَ أُقَامِرْكَ، فَلْيَتَصَدَّقْ.",
        arti: "Siapa yang berkata kepada temannya, 'Mari aku berjudi denganmu,' hendaklah ia bersedekah.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "ikhlas, niat, dan menjauhi riya",
    keywords: ["ikhlas", "keikhlasan", "niat", "riya", "pamer", "popularitas", "sum'ah", "pamrih"],
    ayat: [
      {
        arab: "وَمَا أُمِرُوْا إِلَّا لِيَعْبُدُوا اللهَ مُخْلِصِيْنَ لَهُ الدِّيْنَ حُنَفَاءَ.",
        arti: "Padahal mereka tidak diperintah kecuali agar menyembah Allah dengan memurnikan ketaatan kepada-Nya dalam agama yang lurus.",
        rujukan: "QS. Al-Bayyinah: 5"
      }
    ],
    hadith: [
      {
        arab: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى.",
        arti: "Sesungguhnya amal-amal itu bergantung pada niat, dan setiap orang mendapatkan sesuai dengan apa yang ia niatkan.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "ilmu, belajar, dan mengamalkan ilmu",
    keywords: ["ilmu", "belajar", "menuntut ilmu", "kajian", "ngaji", "ustadz", "guru", "pendidikan", "fikih", "faqih"],
    ayat: [
      {
        arab: "قُلْ هَلْ يَسْتَوِي الَّذِيْنَ يَعْلَمُوْنَ وَالَّذِيْنَ لَا يَعْلَمُوْنَ.",
        arti: "Katakanlah, apakah sama orang-orang yang mengetahui dengan orang-orang yang tidak mengetahui?",
        rujukan: "QS. Az-Zumar: 9"
      }
    ],
    hadith: [
      {
        arab: "مَنْ يُرِدِ اللهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّيْنِ.",
        arti: "Siapa yang Allah kehendaki kebaikan baginya, Allah akan memberinya pemahaman dalam agama.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "tawakal dan bersandar kepada Allah",
    keywords: ["tawakal", "bertawakal", "pasrah", "berserah", "ikhtiar", "cemas", "khawatir", "takut masa depan"],
    ayat: [
      {
        arab: "وَمَنْ يَتَوَكَّلْ عَلَى اللهِ فَهُوَ حَسْبُهُ.",
        arti: "Siapa yang bertawakal kepada Allah, niscaya Allah akan mencukupkannya.",
        rujukan: "QS. Ath-Thalaq: 3"
      }
    ],
    hadith: [
      {
        arab: "لَوْ أَنَّكُمْ تَتَوَكَّلُوْنَ عَلَى اللهِ حَقَّ تَوَكُّلِهِ لَرَزَقَكُمْ كَمَا يَرْزُقُ الطَّيْرَ.",
        arti: "Seandainya kalian bertawakal kepada Allah dengan sebenar-benar tawakal, niscaya Allah memberi rezeki kepada kalian sebagaimana Dia memberi rezeki kepada burung.",
        rujukan: "HR. Tirmidzi"
      }
    ]
  },
  {
    label: "istiqamah dan konsistensi amal",
    keywords: ["istiqamah", "konsisten", "konsistensi", "kontinu", "rutin", "terus menerus", "teguh", "komitmen ibadah"],
    ayat: [
      {
        arab: "إِنَّ الَّذِيْنَ قَالُوْا رَبُّنَا اللهُ ثُمَّ اسْتَقَامُوْا تَتَنَزَّلُ عَلَيْهِمُ الْمَلَائِكَةُ.",
        arti: "Sesungguhnya orang-orang yang berkata, Tuhan kami adalah Allah, kemudian mereka istiqamah, malaikat akan turun kepada mereka.",
        rujukan: "QS. Fussilat: 30"
      }
    ],
    hadith: [
      {
        arab: "قُلْ آمَنْتُ بِاللهِ ثُمَّ اسْتَقِمْ.",
        arti: "Katakanlah, aku beriman kepada Allah, kemudian istiqamahlah.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "kematian, akhirat, dan persiapan pulang kepada Allah",
    keywords: ["kematian", "mati", "ajal", "akhirat", "kubur", "alam kubur", "sakratul", "hisab", "kiamat"],
    ayat: [
      {
        arab: "كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ وَإِنَّمَا تُوَفَّوْنَ أُجُوْرَكُمْ يَوْمَ الْقِيَامَةِ.",
        arti: "Setiap yang bernyawa akan merasakan mati, dan sesungguhnya pada hari kiamat sajalah pahala kalian disempurnakan.",
        rujukan: "QS. Ali 'Imran: 185"
      }
    ],
    hadith: [
      {
        arab: "أَكْثِرُوا ذِكْرَ هَاذِمِ اللَّذَّاتِ: الْمَوْتِ.",
        arti: "Perbanyaklah mengingat pemutus segala kenikmatan, yaitu kematian.",
        rujukan: "HR. Tirmidzi, An-Nasa'i, dan Ibnu Majah"
      }
    ]
  },
  {
    label: "waktu, umur, dan memanfaatkan kesempatan",
    keywords: ["waktu", "umur", "usia", "kesempatan", "produktif", "menunda", "lalai", "masa muda", "hari ini"],
    ayat: [
      {
        arab: "وَالْعَصْرِ، إِنَّ الْإِنْسَانَ لَفِيْ خُسْرٍ، إِلَّا الَّذِيْنَ آمَنُوْا وَعَمِلُوا الصَّالِحَاتِ.",
        arti: "Demi masa, sesungguhnya manusia benar-benar berada dalam kerugian, kecuali orang-orang yang beriman dan beramal saleh.",
        rujukan: "QS. Al-'Ashr: 1-3"
      }
    ],
    hadith: [
      {
        arab: "نِعْمَتَانِ مَغْبُوْنٌ فِيْهِمَا كَثِيْرٌ مِنَ النَّاسِ: الصِّحَّةُ وَالْفَرَاغُ.",
        arti: "Ada dua nikmat yang banyak manusia tertipu di dalamnya: kesehatan dan waktu luang.",
        rujukan: "HR. Bukhari"
      }
    ]
  },
  {
    label: "pendidikan anak, parenting remaja, dan tanggung jawab keluarga",
    keywords: [
      "anak",
      "remaja",
      "pemuda",
      "parenting",
      "pengasuhan",
      "mendidik",
      "pendidikan anak",
      "keluarga",
      "generasi"
    ],
    ayat: [
      {
        arab: "يَا بُنَيَّ أَقِمِ الصَّلَاةَ وَأْمُرْ بِالْمَعْرُوْفِ وَانْهَ عَنِ الْمُنْكَرِ وَاصْبِرْ عَلَىٰ مَا أَصَابَكَ.",
        arti:
          "Wahai anakku, dirikanlah shalat, suruhlah manusia berbuat yang makruf, cegahlah dari yang mungkar, dan bersabarlah terhadap apa yang menimpamu.",
        rujukan: "QS. Luqman: 17"
      }
    ],
    hadith: [
      {
        arab: "كُلُّكُمْ رَاعٍ وَكُلُّكُمْ مَسْؤُوْلٌ عَنْ رَعِيَّتِهِ.",
        arti: "Setiap kalian adalah pemimpin, dan setiap kalian akan dimintai pertanggungjawaban atas yang dipimpinnya.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "pemuda, masa muda, dan penjagaan diri",
    keywords: ["pemuda", "remaja", "anak muda", "gen z", "mahasiswa", "pelajar", "masa muda"],
    ayat: [
      {
        arab: "إِنَّهُمْ فِتْيَةٌ آمَنُوْا بِرَبِّهِمْ وَزِدْنَاهُمْ هُدًى.",
        arti: "Sesungguhnya mereka adalah pemuda-pemuda yang beriman kepada Tuhan mereka, dan Kami tambahkan petunjuk kepada mereka.",
        rujukan: "QS. Al-Kahf: 13"
      }
    ],
    hadith: [
      {
        arab: "سَبْعَةٌ يُظِلُّهُمُ اللهُ فِيْ ظِلِّهِ، وَشَابٌّ نَشَأَ فِيْ عِبَادَةِ رَبِّهِ.",
        arti: "Ada tujuh golongan yang Allah naungi dalam naungan-Nya, di antaranya pemuda yang tumbuh dalam ibadah kepada Rabbnya.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "menjauhi zina, pergaulan bebas, dan menjaga kehormatan",
    keywords: [
      "zina",
      "mendekati zina",
      "pergaulan bebas",
      "seks bebas",
      "sex bebas",
      "pacaran bebas",
      "khalwat",
      "ikhtilat",
      "pornografi",
      "syahwat",
      "menjaga kehormatan",
      "menjaga kemaluan",
      "menjaga pandangan"
    ],
    ayat: [
      {
        arab: "وَلَا تَقْرَبُوا الزِّنٰى إِنَّهُ كَانَ فَاحِشَةً وَسَاءَ سَبِيْلًا.",
        arti: "Janganlah kamu mendekati zina; sesungguhnya zina itu adalah perbuatan keji dan jalan yang buruk.",
        rujukan: "QS. Al-Isra: 32"
      },
      {
        arab: "قُلْ لِلْمُؤْمِنِيْنَ يَغُضُّوا مِنْ أَبْصَارِهِمْ وَيَحْفَظُوا فُرُوْجَهُمْ ذٰلِكَ أَزْكَى لَهُمْ.",
        arti: "Katakanlah kepada laki-laki beriman agar mereka menundukkan pandangan dan menjaga kemaluan mereka; yang demikian itu lebih suci bagi mereka.",
        rujukan: "QS. An-Nur: 30"
      }
    ],
    hadith: [
      {
        arab: "لَا يَخْلُوَنَّ رَجُلٌ بِامْرَأَةٍ إِلَّا وَمَعَهَا ذُوْ مَحْرَمٍ.",
        arti: "Janganlah seorang laki-laki berduaan dengan seorang perempuan kecuali perempuan itu bersama mahramnya.",
        rujukan: "HR. Bukhari dan Muslim"
      },
      {
        arab: "مَنْ يَضْمَنْ لِيْ مَا بَيْنَ لَحْيَيْهِ وَمَا بَيْنَ رِجْلَيْهِ أَضْمَنْ لَهُ الْجَنَّةَ.",
        arti: "Siapa yang menjamin untukku apa yang ada di antara dua rahangnya dan apa yang ada di antara dua kakinya, aku menjamin surga baginya.",
        rujukan: "HR. Bukhari"
      }
    ]
  },
  {
    label: "persaudaraan umat, ukhuwah, dan perdamaian",
    keywords: ["ukhuwah", "persaudaraan", "saudara", "umat", "persatuan", "perpecahan", "damai", "ishlah", "konflik"],
    ayat: [
      {
        arab: "إِنَّمَا الْمُؤْمِنُوْنَ إِخْوَةٌ فَأَصْلِحُوْا بَيْنَ أَخَوَيْكُمْ وَاتَّقُوا اللهَ لَعَلَّكُمْ تُرْحَمُوْنَ.",
        arti:
          "Sesungguhnya orang-orang beriman itu bersaudara. Maka damaikanlah antara kedua saudaramu dan bertakwalah kepada Allah agar kamu mendapat rahmat.",
        rujukan: "QS. Al-Hujurat: 10"
      }
    ],
    hadith: [
      {
        arab: "الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا.",
        arti: "Seorang mukmin dengan mukmin lainnya seperti bangunan yang saling menguatkan satu sama lain.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "tolong-menolong, gotong royong, dan solidaritas",
    keywords: ["tolong", "menolong", "tolong-menolong", "bantu", "membantu", "gotong royong", "solidaritas", "kerja sama", "relawan", "peduli sesama"],
    ayat: [
      {
        arab: "وَتَعَاوَنُوْا عَلَى الْبِرِّ وَالتَّقْوَى وَلَا تَعَاوَنُوْا عَلَى الْإِثْمِ وَالْعُدْوَانِ.",
        arti: "Tolong-menolonglah dalam kebaikan dan ketakwaan, dan jangan tolong-menolong dalam dosa dan permusuhan.",
        rujukan: "QS. Al-Ma'idah: 2"
      }
    ],
    hadith: [
      {
        arab: "وَاللهُ فِيْ عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِيْ عَوْنِ أَخِيْهِ.",
        arti: "Allah akan menolong seorang hamba selama hamba itu menolong saudaranya.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "hak tetangga dan kepedulian lingkungan",
    keywords: ["tetangga", "jiran", "lingkungan", "warga", "rt", "kampung", "komplek", "sebelah rumah", "masyarakat sekitar"],
    ayat: [
      {
        arab: "وَاعْبُدُوا اللهَ وَلَا تُشْرِكُوا بِهِ شَيْئًا وَبِالْوَالِدَيْنِ إِحْسَانًا وَبِذِي الْقُرْبَى وَالْيَتَامَى وَالْمَسَاكِيْنِ وَالْجَارِ ذِي الْقُرْبَى وَالْجَارِ الْجُنُبِ.",
        arti: "Sembahlah Allah dan jangan mempersekutukan-Nya dengan sesuatu apa pun; berbuat baiklah kepada kedua orang tua, kerabat, anak yatim, orang miskin, tetangga dekat, dan tetangga jauh.",
        rujukan: "QS. An-Nisa: 36"
      }
    ],
    hadith: [
      {
        arab: "مَا زَالَ جِبْرِيْلُ يُوْصِيْنِيْ بِالْجَارِ حَتَّى ظَنَنْتُ أَنَّهُ سَيُوَرِّثُهُ.",
        arti: "Jibril terus-menerus berpesan kepadaku tentang tetangga sampai aku menyangka ia akan menjadikannya ahli waris.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "silaturahmi dan menyambung keluarga",
    keywords: ["silaturahmi", "silaturahim", "kerabat", "keluarga besar", "memutus hubungan", "saudara kandung", "lebaran keluarga"],
    ayat: [
      {
        arab: "وَاتَّقُوا اللهَ الَّذِيْ تَسَاءَلُوْنَ بِهِ وَالْأَرْحَامَ.",
        arti: "Bertakwalah kepada Allah yang dengan nama-Nya kamu saling meminta, dan peliharalah hubungan kekerabatan.",
        rujukan: "QS. An-Nisa: 1"
      }
    ],
    hadith: [
      {
        arab: "مَنْ أَحَبَّ أَنْ يُبْسَطَ لَهُ فِيْ رِزْقِهِ وَيُنْسَأَ لَهُ فِيْ أَثَرِهِ فَلْيَصِلْ رَحِمَهُ.",
        arti: "Siapa yang ingin dilapangkan rezekinya dan dipanjangkan jejak kebaikannya, hendaklah ia menyambung silaturahmi.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "taubat, istighfar, dan harapan kepada rahmat Allah",
    keywords: ["taubat", "tobat", "istighfar", "dosa", "maksiat", "ampunan", "hijrah", "rahmat allah"],
    ayat: [
      {
        arab: "قُلْ يَا عِبَادِيَ الَّذِيْنَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللهِ.",
        arti: "Katakanlah, wahai hamba-hamba-Ku yang melampaui batas terhadap diri mereka sendiri, janganlah berputus asa dari rahmat Allah.",
        rujukan: "QS. Az-Zumar: 53"
      }
    ],
    hadith: [
      {
        arab: "وَاللهِ إِنِّي لَأَسْتَغْفِرُ اللهَ وَأَتُوْبُ إِلَيْهِ فِي الْيَوْمِ أَكْثَرَ مِنْ سَبْعِيْنَ مَرَّةً.",
        arti: "Demi Allah, sungguh aku beristighfar kepada Allah dan bertaubat kepada-Nya dalam sehari lebih dari tujuh puluh kali.",
        rujukan: "HR. Bukhari"
      }
    ]
  },
  {
    label: "dzikir, doa, dan ketenangan hati",
    keywords: ["dzikir", "zikir", "doa", "berdoa", "wirid", "ketenangan", "gelisah", "hati tenang", "ingat Allah"],
    ayat: [
      {
        arab: "أَلَا بِذِكْرِ اللهِ تَطْمَئِنُّ الْقُلُوْبُ.",
        arti: "Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.",
        rujukan: "QS. Ar-Ra'd: 28"
      }
    ],
    hadith: [
      {
        arab: "مَثَلُ الَّذِيْ يَذْكُرُ رَبَّهُ وَالَّذِيْ لَا يَذْكُرُ رَبَّهُ مَثَلُ الْحَيِّ وَالْمَيِّتِ.",
        arti: "Perumpamaan orang yang mengingat Rabbnya dan yang tidak mengingat Rabbnya seperti orang hidup dan orang mati.",
        rujukan: "HR. Bukhari"
      }
    ]
  },
  {
    label: "sedekah, zakat, infak, dan kepedulian sosial",
    keywords: ["sedekah", "zakat", "infak", "infaq", "berbagi", "kepedulian", "fakir", "miskin", "bantuan sosial"],
    ayat: [
      {
        arab: "مَثَلُ الَّذِيْنَ يُنْفِقُوْنَ أَمْوَالَهُمْ فِيْ سَبِيْلِ اللهِ كَمَثَلِ حَبَّةٍ أَنْبَتَتْ سَبْعَ سَنَابِلَ فِيْ كُلِّ سُنْبُلَةٍ مِائَةُ حَبَّةٍ.",
        arti:
          "Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai; pada setiap tangkai ada seratus biji.",
        rujukan: "QS. Al-Baqarah: 261"
      }
    ],
    hadith: [
      {
        arab: "مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ.",
        arti: "Sedekah tidak akan mengurangi harta.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "adil, kepemimpinan, dan tanggung jawab sosial",
    keywords: ["adil", "keadilan", "pemimpin", "kepemimpinan", "pejabat", "hakim", "rakyat", "masyarakat", "zalim", "kezaliman"],
    ayat: [
      {
        arab: "إِنَّ اللهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيْتَاءِ ذِي الْقُرْبَى.",
        arti: "Sesungguhnya Allah menyuruh berlaku adil, berbuat ihsan, dan memberi bantuan kepada kerabat.",
        rujukan: "QS. An-Nahl: 90"
      }
    ],
    hadith: [
      {
        arab: "سَبْعَةٌ يُظِلُّهُمُ اللهُ فِيْ ظِلِّهِ، إِمَامٌ عَادِلٌ.",
        arti: "Ada tujuh golongan yang Allah naungi dalam naungan-Nya, di antaranya pemimpin yang adil.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "berbakti kepada orang tua dan adab keluarga",
    keywords: ["orang tua", "ortu", "ibu", "ayah", "bapak", "birrul walidain", "durhaka", "keluarga", "bakti"],
    ayat: [
      {
        arab: "وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوْا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا.",
        arti: "Tuhanmu telah memerintahkan agar kamu tidak menyembah selain Dia dan hendaklah berbuat baik kepada kedua orang tua.",
        rujukan: "QS. Al-Isra: 23"
      }
    ],
    hadith: [
      {
        arab: "رِضَى الرَّبِّ فِيْ رِضَى الْوَالِدِ، وَسَخَطُ الرَّبِّ فِيْ سَخَطِ الْوَالِدِ.",
        arti: "Ridha Allah terletak pada ridha orang tua, dan murka Allah terletak pada murka orang tua.",
        rujukan: "HR. Tirmidzi"
      }
    ]
  },
  {
    label: "menahan marah, memaafkan, dan mengendalikan emosi",
    keywords: ["marah", "amarah", "emosi", "memaafkan", "maaf", "pemaaf", "dendam", "tersinggung", "kontrol emosi", "mengendalikan diri"],
    ayat: [
      {
        arab: "وَالْكَاظِمِيْنَ الْغَيْظَ وَالْعَافِيْنَ عَنِ النَّاسِ وَاللهُ يُحِبُّ الْمُحْسِنِيْنَ.",
        arti: "Mereka menahan amarah dan memaafkan manusia. Allah mencintai orang-orang yang berbuat ihsan.",
        rujukan: "QS. Ali 'Imran: 134"
      }
    ],
    hadith: [
      {
        arab: "لَيْسَ الشَّدِيْدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيْدُ الَّذِيْ يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ.",
        arti: "Orang kuat bukanlah yang pandai bergulat, tetapi orang kuat adalah yang mampu menguasai dirinya ketika marah.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "ghibah, prasangka buruk, dan adab media sosial",
    keywords: ["ghibah", "gibah", "backbiting", "prasangka", "suudzon", "su'uzan", "tajassus", "mencari aib", "gosip", "fitnah sosial", "media sosial", "komentar"],
    ayat: [
      {
        arab: "يَا أَيُّهَا الَّذِيْنَ آمَنُوا اجْتَنِبُوا كَثِيْرًا مِنَ الظَّنِّ إِنَّ بَعْضَ الظَّنِّ إِثْمٌ وَلَا تَجَسَّسُوا وَلَا يَغْتَبْ بَعْضُكُمْ بَعْضًا.",
        arti: "Wahai orang-orang yang beriman, jauhilah banyak prasangka; sebagian prasangka itu dosa. Jangan mencari-cari kesalahan orang lain dan jangan saling menggunjing.",
        rujukan: "QS. Al-Hujurat: 12"
      }
    ],
    hadith: [
      {
        arab: "ذِكْرُكَ أَخَاكَ بِمَا يَكْرَهُ.",
        arti: "Ghibah adalah engkau menyebut saudaramu dengan sesuatu yang tidak ia sukai.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "akhlak mulia, kelembutan, dan kasih sayang",
    keywords: ["akhlak", "adab", "sopan", "lembut", "kasih sayang", "rahmah", "marah", "emosi", "pemaaf", "rendah hati"],
    ayat: [
      {
        arab: "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيْمٍ.",
        arti: "Sesungguhnya engkau benar-benar berada di atas akhlak yang agung.",
        rujukan: "QS. Al-Qalam: 4"
      }
    ],
    hadith: [
      {
        arab: "إِنَّ مِنْ خِيَارِكُمْ أَحَاسِنَكُمْ أَخْلَاقًا.",
        arti: "Sesungguhnya termasuk orang terbaik di antara kalian adalah yang paling baik akhlaknya.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "menjaga pandangan, rasa malu, dan kehormatan diri",
    keywords: ["pandangan", "menundukkan pandangan", "menjaga pandangan", "haya", "malu", "rasa malu", "kehormatan", "iffah", "pergaulan", "zina", "aurat"],
    ayat: [
      {
        arab: "قُلْ لِلْمُؤْمِنِيْنَ يَغُضُّوا مِنْ أَبْصَارِهِمْ وَيَحْفَظُوا فُرُوْجَهُمْ ذٰلِكَ أَزْكَى لَهُمْ.",
        arti: "Katakanlah kepada laki-laki beriman agar mereka menundukkan pandangan dan menjaga kemaluan mereka; yang demikian itu lebih suci bagi mereka.",
        rujukan: "QS. An-Nur: 30"
      }
    ],
    hadith: [
      {
        arab: "يَا مَعْشَرَ الشَّبَابِ، مَنِ اسْتَطَاعَ مِنْكُمُ الْبَاءَةَ فَلْيَتَزَوَّجْ، فَإِنَّهُ أَغَضُّ لِلْبَصَرِ وَأَحْصَنُ لِلْفَرْجِ.",
        arti: "Wahai para pemuda, siapa di antara kalian mampu menikah hendaklah menikah, karena itu lebih menundukkan pandangan dan lebih menjaga kemaluan.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "amanah dan kejujuran",
    keywords: ["amanah", "jujur", "kejujuran", "tanggung jawab", "nafkah", "korupsi", "integritas", "janji"],
    ayat: [
      {
        arab: "إِنَّ اللهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَى أَهْلِهَا وَإِذَا حَكَمْتُمْ بَيْنَ النَّاسِ أَنْ تَحْكُمُوا بِالْعَدْلِ.",
        arti:
          "Sesungguhnya Allah memerintahkan kamu menyampaikan amanah kepada yang berhak menerimanya, dan apabila menetapkan hukum di antara manusia hendaklah kamu menetapkannya dengan adil.",
        rujukan: "QS. An-Nisa: 58"
      },
      {
        arab: "يَا أَيُّهَا الَّذِيْنَ آمَنُوا لَا تَخُوْنُوا اللهَ وَالرَّسُوْلَ وَتَخُوْنُوا أَمَانَاتِكُمْ وَأَنْتُمْ تَعْلَمُوْنَ.",
        arti:
          "Wahai orang-orang yang beriman, janganlah kamu mengkhianati Allah dan Rasul, dan jangan pula mengkhianati amanah-amanah yang dipercayakan kepadamu, sedang kamu mengetahui.",
        rujukan: "QS. Al-Anfal: 27"
      }
    ],
    hadith: [
      {
        arab: "آيَةُ الْمُنَافِقِ ثَلَاثٌ: إِذَا حَدَّثَ كَذَبَ، وَإِذَا وَعَدَ أَخْلَفَ، وَإِذَا اؤْتُمِنَ خَانَ.",
        arti:
          "Tanda orang munafik ada tiga: apabila berbicara ia berdusta, apabila berjanji ia mengingkari, dan apabila diberi amanah ia berkhianat.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "dakwah, hikmah, dan nasihat yang baik",
    keywords: ["dakwah", "mengajak", "nasihat", "menasihati", "hikmah", "mauizhah", "ceramah", "tabligh", "menyeru", "amar makruf"],
    ayat: [
      {
        arab: "ادْعُ إِلَى سَبِيْلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ وَجَادِلْهُمْ بِالَّتِيْ هِيَ أَحْسَنُ.",
        arti: "Serulah manusia kepada jalan Tuhanmu dengan hikmah dan nasihat yang baik, dan bantahlah mereka dengan cara yang lebih baik.",
        rujukan: "QS. An-Nahl: 125"
      }
    ],
    hadith: [
      {
        arab: "بَلِّغُوا عَنِّي وَلَوْ آيَةً.",
        arti: "Sampaikanlah dariku walaupun satu ayat.",
        rujukan: "HR. Bukhari"
      }
    ]
  },
  {
    label: "tilawah Al-Quran, tadabbur, dan belajar Quran",
    keywords: ["quran", "alquran", "al-quran", "tilawah", "tadabbur", "membaca quran", "hafalan", "tahsin", "tahfidz", "khatam"],
    ayat: [
      {
        arab: "إِنَّ هٰذَا الْقُرْآنَ يَهْدِيْ لِلَّتِيْ هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِيْنَ الَّذِيْنَ يَعْمَلُوْنَ الصَّالِحَاتِ.",
        arti: "Sesungguhnya Al-Quran ini memberi petunjuk kepada jalan yang paling lurus dan memberi kabar gembira kepada orang-orang beriman yang beramal saleh.",
        rujukan: "QS. Al-Isra: 9"
      }
    ],
    hadith: [
      {
        arab: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ.",
        arti: "Sebaik-baik kalian adalah orang yang belajar Al-Quran dan mengajarkannya.",
        rujukan: "HR. Bukhari"
      }
    ]
  },
  {
    label: "masjid, shalat berjamaah, dan memakmurkan rumah Allah",
    keywords: ["masjid", "mushalla", "musala", "jamaah", "berjamaah", "memakmurkan masjid", "rumah allah", "takmir", "imam", "muazin"],
    ayat: [
      {
        arab: "إِنَّمَا يَعْمُرُ مَسَاجِدَ اللهِ مَنْ آمَنَ بِاللهِ وَالْيَوْمِ الْآخِرِ وَأَقَامَ الصَّلَاةَ وَآتَى الزَّكَاةَ وَلَمْ يَخْشَ إِلَّا اللهَ.",
        arti: "Sesungguhnya yang memakmurkan masjid-masjid Allah hanyalah orang yang beriman kepada Allah dan hari akhir, mendirikan shalat, menunaikan zakat, dan tidak takut selain kepada Allah.",
        rujukan: "QS. At-Tawbah: 18"
      }
    ],
    hadith: [
      {
        arab: "مَنْ بَنَى مَسْجِدًا يَبْتَغِيْ بِهِ وَجْهَ اللهِ بَنَى اللهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ.",
        arti: "Siapa yang membangun masjid karena mengharap wajah Allah, Allah akan membangunkan untuknya yang semisal itu di surga.",
        rujukan: "HR. Bukhari"
      }
    ]
  },
  {
    label: "kebersihan, thaharah, dan kesehatan ibadah",
    keywords: ["bersih", "kebersihan", "thaharah", "taharah", "suci", "wudhu", "mandi", "najis", "kesehatan", "higienis"],
    ayat: [
      {
        arab: "إِنَّ اللهَ يُحِبُّ التَّوَّابِيْنَ وَيُحِبُّ الْمُتَطَهِّرِيْنَ.",
        arti: "Sesungguhnya Allah mencintai orang-orang yang bertaubat dan mencintai orang-orang yang menyucikan diri.",
        rujukan: "QS. Al-Baqarah: 222"
      }
    ],
    hadith: [
      {
        arab: "الطُّهُوْرُ شَطْرُ الْإِيْمَانِ.",
        arti: "Bersuci adalah separuh iman.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "cinta Rasul, shalawat, dan mengikuti sunnah",
    keywords: ["rasul", "nabi", "sunnah", "sunah nabi", "shalawat", "maulid", "cinta nabi", "ittiba", "teladan rasul"],
    ayat: [
      {
        arab: "لَقَدْ كَانَ لَكُمْ فِيْ رَسُوْلِ اللهِ أُسْوَةٌ حَسَنَةٌ.",
        arti: "Sungguh pada diri Rasulullah terdapat teladan yang baik bagi kalian.",
        rujukan: "QS. Al-Ahzab: 21"
      }
    ],
    hadith: [
      {
        arab: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى أَكُوْنَ أَحَبَّ إِلَيْهِ مِنْ وَالِدِهِ وَوَلَدِهِ وَالنَّاسِ أَجْمَعِيْنَ.",
        arti: "Tidak sempurna iman salah seorang dari kalian sampai aku lebih ia cintai daripada orang tuanya, anaknya, dan seluruh manusia.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "sabar dan keteguhan",
    keywords: ["sabar", "musibah", "ujian", "cobaan", "teguh", "istiqamah", "kesulitan"],
    ayat: [
      {
        arab: "يَا أَيُّهَا الَّذِيْنَ آمَنُوا اسْتَعِيْنُوا بِالصَّبْرِ وَالصَّلَاةِ إِنَّ اللهَ مَعَ الصَّابِرِيْنَ.",
        arti:
          "Wahai orang-orang yang beriman, mohonlah pertolongan dengan sabar dan shalat. Sesungguhnya Allah bersama orang-orang yang sabar.",
        rujukan: "QS. Al-Baqarah: 153"
      }
    ],
    hadith: [
      {
        arab: "عَجَبًا لِأَمْرِ الْمُؤْمِنِ، إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ.",
        arti:
          "Sungguh menakjubkan keadaan seorang mukmin; seluruh urusannya bernilai baik baginya.",
        rujukan: "HR. Muslim"
      }
    ]
  },
  {
    label: "syukur, Ramadhan, dan Idul Fitri",
    keywords: ["syukur", "bersyukur", "nikmat", "fitri", "idul fitri", "ramadhan", "lebaran"],
    ayat: [
      {
        arab: "لَئِنْ شَكَرْتُمْ لَأَزِيْدَنَّكُمْ وَلَئِنْ كَفَرْتُمْ إِنَّ عَذَابِيْ لَشَدِيْدٌ.",
        arti:
          "Jika kamu bersyukur, pasti Aku akan menambah nikmat kepadamu; tetapi jika kamu mengingkari nikmat-Ku, sesungguhnya azab-Ku sangat berat.",
        rujukan: "QS. Ibrahim: 7"
      }
    ],
    hadith: [
      {
        arab: "مَنْ لَا يَشْكُرِ النَّاسَ لَا يَشْكُرِ اللهَ.",
        arti: "Siapa yang tidak berterima kasih kepada manusia, ia tidak bersyukur kepada Allah.",
        rujukan: "HR. Ahmad dan Tirmidzi"
      }
    ]
  },
  {
    label: "kurban, Idul Adha, dan keikhlasan",
    keywords: ["kurban", "qurban", "adha", "idul adha", "haji", "ibrahim", "ismail", "ikhlas", "pengorbanan"],
    ayat: [
      {
        arab: "لَنْ يَنَالَ اللهَ لُحُوْمُهَا وَلَا دِمَاؤُهَا وَلٰكِنْ يَنَالُهُ التَّقْوَى مِنْكُمْ.",
        arti:
          "Daging-daging dan darah hewan kurban itu tidak akan sampai kepada Allah, tetapi yang sampai kepada-Nya adalah ketakwaanmu.",
        rujukan: "QS. Al-Hajj: 37"
      }
    ],
    hadith: [
      {
        arab: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى.",
        arti:
          "Sesungguhnya amal-amal itu bergantung pada niat, dan setiap orang mendapatkan sesuai dengan apa yang ia niatkan.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  },
  {
    label: "keluarga dan pernikahan",
    keywords: ["nikah", "pernikahan", "mempelai", "keluarga", "sakinah", "mawaddah", "rahmah", "rumah tangga"],
    ayat: [
      {
        arab: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا لِتَسْكُنُوْا إِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً.",
        arti:
          "Di antara tanda-tanda kekuasaan-Nya, Dia menciptakan untukmu pasangan dari jenismu sendiri agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa cinta dan kasih sayang.",
        rujukan: "QS. Ar-Rum: 21"
      }
    ],
    hadith: [
      {
        arab: "خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ، وَأَنَا خَيْرُكُمْ لِأَهْلِيْ.",
        arti: "Sebaik-baik kalian adalah yang paling baik kepada keluarganya, dan aku adalah yang paling baik kepada keluargaku.",
        rujukan: "HR. Tirmidzi"
      }
    ]
  },
  {
    label: "istri shalihah dan pasangan yang meneguhkan iman",
    keywords: [
      "istri",
      "istri shalihah",
      "istri solehah",
      "wanita shalihah",
      "wanita solehah",
      "perempuan shalihah",
      "perempuan solehah",
      "pasangan saleh",
      "pasangan shalih",
      "suami istri saleh"
    ],
    ayat: [
      {
        arab: "فَالصَّالِحَاتُ قَانِتَاتٌ حَافِظَاتٌ لِلْغَيْبِ بِمَا حَفِظَ اللهُ.",
        arti: "Maka perempuan-perempuan yang saleh adalah yang taat dan menjaga diri ketika tidak ada suaminya karena Allah telah menjaga mereka.",
        rujukan: "QS. An-Nisa: 34"
      },
      {
        arab: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِيْنَ إِمَامًا.",
        arti: "Wahai Tuhan kami, anugerahkanlah kepada kami pasangan-pasangan kami dan keturunan kami sebagai penyejuk mata, dan jadikanlah kami pemimpin bagi orang-orang yang bertakwa.",
        rujukan: "QS. Al-Furqan: 74"
      }
    ],
    hadith: [
      {
        arab: "اَلدُّنْيَا مَتَاعٌ، وَخَيْرُ مَتَاعِ الدُّنْيَا الْمَرْأَةُ الصَّالِحَةُ.",
        arti: "Dunia adalah perhiasan, dan sebaik-baik perhiasan dunia adalah wanita yang salehah.",
        rujukan: "HR. Muslim"
      },
      {
        arab: "خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ، وَأَنَا خَيْرُكُمْ لِأَهْلِيْ.",
        arti: "Sebaik-baik kalian adalah yang paling baik kepada keluarganya, dan aku adalah yang paling baik kepada keluargaku.",
        rujukan: "HR. Tirmidzi"
      }
    ]
  },
  {
    label: "menjaga lisan dan akhlak sosial",
    keywords: ["lisan", "bicara", "komunikasi", "musyawarah", "ucapan", "ghibah", "fitnah", "akhlak", "sosial", "tetangga"],
    ayat: [
      {
        arab: "مَا يَلْفِظُ مِنْ قَوْلٍ إِلَّا لَدَيْهِ رَقِيْبٌ عَتِيْدٌ.",
        arti:
          "Tidak ada satu ucapan pun yang diucapkan melainkan ada di dekatnya malaikat pengawas yang selalu siap mencatat.",
        rujukan: "QS. Qaf: 18"
      }
    ],
    hadith: [
      {
        arab: "مَنْ كَانَ يُؤْمِنُ بِاللهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ.",
        arti: "Siapa yang beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.",
        rujukan: "HR. Bukhari dan Muslim"
      }
    ]
  }
];

export function topicFromParameters(parameters: Record<string, unknown>) {
  const primary = String(
    parameters.temaUtama ?? parameters.tema ?? parameters.topik ?? parameters.topikSingkat ?? parameters.temaPesan ?? ""
  ).trim();
  const secondary = String(parameters.subTema ?? parameters.momenSpesifik ?? parameters.kisahNabi ?? "").trim();

  if (primary && secondary) return `${primary} - ${secondary}`;
  return primary || secondary || "ketakwaan";
}

function normalizedTopic(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function normalizedWordForms(word: string) {
  const forms = new Set([word]);
  const prefixes = ["meng", "meny", "mem", "men", "ber", "per", "ter", "di", "ke", "pe", "se"];
  const suffixes = ["kan", "nya", "an", "i"];

  for (const prefix of prefixes) {
    if (word.startsWith(prefix) && word.length > prefix.length + 2) {
      forms.add(word.slice(prefix.length));
    }
  }

  for (const form of [...forms]) {
    for (const suffix of suffixes) {
      if (form.endsWith(suffix) && form.length > suffix.length + 2) {
        forms.add(form.slice(0, -suffix.length));
      }
    }
  }

  for (const form of [...forms]) {
    for (const prefix of prefixes) {
      if (form.startsWith(prefix) && form.length > prefix.length + 2) {
        forms.add(form.slice(prefix.length));
      }
    }
  }

  return forms;
}

function keywordMatchesToken(keyword: string, token: string) {
  const normalizedKeyword = normalizedTopic(keyword);
  if (token === normalizedKeyword) return true;
  if (normalizedKeyword.length >= 5 && token.includes(normalizedKeyword)) return true;
  return normalizedWordForms(token).has(normalizedKeyword);
}

function isPrayerTheme(tema: string) {
  return /\b(shalat|salat|sholat|sembahyang|sunah|sunnah|rawatib|tahajud|dhuha|witir|qiyam)\b/i.test(
    normalizedTopic(tema)
  );
}

function thematicKeywordScore(normalized: string, tokens: string[], keyword: string) {
  const normalizedKeyword = normalizedTopic(keyword);
  const isPhrase = normalizedKeyword.includes(" ");

  if (normalized === normalizedKeyword) return 30;
  if (normalized.startsWith(`${normalizedKeyword} `) || normalized.startsWith(`${normalizedKeyword} -`)) return 18;
  if (isPhrase && normalized.includes(normalizedKeyword)) return 14 + normalizedKeyword.split(/\s+/).length;
  if (!isPhrase && tokens.some((token) => keywordMatchesToken(normalizedKeyword, token))) return 4;
  return 0;
}

function matchingThematicDalilSet(jenis: string, tema: string) {
  const normalized = normalizedTopic(tema);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const explicitSexualEthicsTheme =
    /\b(zina|khalwat|ikhtilat|pornografi|syahwat)\b/i.test(normalized) ||
    /\b(pergaulan|seks|sex|pacaran)\s+bebas\b/i.test(normalized) ||
    /\b(menjaga\s+kehormatan|menjaga\s+kemaluan|menjaga\s+pandangan)\b/i.test(normalized);
  if (explicitSexualEthicsTheme) {
    const set = thematicDalilSets.find((item) => item.label === "menjauhi zina, pergaulan bebas, dan menjaga kehormatan");
    if (set) return set;
  }

  let bestMatch: { set: ThematicDalilSet; score: number } | null = null;

  for (const set of thematicDalilSets) {
    const score = set.keywords.reduce((total, keyword) => total + thematicKeywordScore(normalized, tokens, keyword), 0);

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { set, score };
    }
  }

  if (bestMatch) return bestMatch.set;
  return jenis === "nikah"
    ? thematicDalilSets.find((set) => set.label === "keluarga dan pernikahan") ?? null
    : null;
}

export function selectedDalilFor(jenis: string, tema: string, seed: string) {
  const set = matchingThematicDalilSet(jenis, tema);
  if (!set) {
    return {
      ayat: pick(khutbahArabicVariants.ayat, seed, 7),
      hadith: pick(khutbahArabicVariants.hadith, seed, 8),
      label: "takwa dan amal saleh"
    };
  }

  return {
    ayat: pick(set.ayat, seed, 7),
    hadith: pick(set.hadith, seed, 8),
    label: set.label
  };
}

function dalilGuidanceFor(jenis: string, tema: string) {
  const set = matchingThematicDalilSet(jenis, tema);
  const ayat = set?.ayat ?? khutbahArabicVariants.ayat;
  const hadith = set?.hadith ?? khutbahArabicVariants.hadith;
  const label = set?.label ?? "takwa dan amal saleh";
  const ayatList = ayat.map((item) => `${item.rujukan}: ${item.arti}`).join("\n  ");
  const hadithList = hadith.map((item) => `${item.rujukan}: ${item.arti}`).join("\n  ");

  return `  Paket dalil paling relevan untuk tema "${tema}" (${label}):
  Ayat:
  ${ayatList}
  Daftar hadits:
  ${hadithList}
  Isi naskah wajib menjelaskan hubungan dalil ini dengan tema, bukan sekadar menempelkan kutipan.`;
}

function promptDalilLines(items: PromptDalilItem[]) {
  return items
    .map((item, index) => {
      const details = [
        `${index + 1}. ${item.reference}`,
        item.grade ? `Derajat: ${item.grade}` : "",
        item.takhrij ? `Takhrij: ${item.takhrij}` : "",
        `Sumber data: ${item.source}${item.fallback ? " (fallback terkurasi lokal)" : ""}`,
        item.arab ? `Arab: ${item.arab}` : "",
        `Terjemah/isi: ${item.translation}`,
        item.tafsir ? `${item.kind === "hadith" ? "Hikmah/catatan" : "Tafsir ringkas"}: ${item.tafsir}` : "",
        item.relevance ? `Kaitan tema: ${item.relevance}` : ""
      ].filter(Boolean);

      return details.join("\n  ");
    })
    .join("\n");
}

function retrievedDalilGuidanceFor(context?: PromptDalilContext) {
  if (!context || (context.quran.length === 0 && context.hadith.length === 0)) return "";

  const quran = context.quran.length > 0 ? promptDalilLines(context.quran) : "Tidak ada ayat hasil retrieval.";
  const hadith = context.hadith.length > 0 ? promptDalilLines(context.hadith) : "Tidak ada hadits hasil retrieval.";
  const warnings = context.warnings?.length ? `\nCatatan retrieval:\n${context.warnings.map((warning) => `- ${warning}`).join("\n")}` : "";

  return `Dalil terkurasi hasil retrieval untuk tema "${context.theme}".
Sumber retrieval: ${context.source}.

Ayat hasil retrieval:
  ${quran}

Hadits hasil retrieval:
  ${hadith}

Aturan khusus dalil:
- Jadikan daftar hasil retrieval ini sebagai rujukan utama ketika menulis bagian ayat dan hadits.
- Salin referensi, teks Arab, terjemah inti, sumber hadits, takhrij, dan derajat hadits sesuai data di atas. Jangan mengganti nomor surah/ayat, sumber hadits, takhrij, atau derajat hadits.
- Jangan menambah ayat atau hadits lain kecuali hasil retrieval kosong atau benar-benar tidak relevan; jika memakai fallback, pilih yang paling dekat dengan tema dan jelaskan kaitannya secara jujur.
- Jangan mengarang teks Arab, terjemahan, takhrij, derajat hadits, atau sumber kitab.
- Jika hadits memiliki derajat, tampilkan derajat itu secara ringkas setelah rujukan atau dalam kalimat penjelas.
- Penjelasan boleh memakai bahasa natural, tetapi kutipan dalil harus tetap terkunci pada data retrieval.
- Tampilkan setiap ayat atau hadits cukup satu kali: teks Arab, arti, dan rujukan. Jangan menulis ulang kutipan yang sama dalam versi "Arti" lalu versi terjemah kutip.
- Isi utama harus menjelaskan hubungan dalil dengan tema "${context.theme}", bukan sekadar menempelkan kutipan.${warnings}`;
}

export function retrievedWebGuidanceFor(context?: PromptWebContext) {
  if (!context || context.results.length === 0) return "";

  const results = context.results
    .map(
      (item, index) => `${index + 1}. ${item.title}
URL: ${item.url}
Ringkasan halaman:
${item.excerpt}`
    )
    .join("\n\n");
  const warnings = context.warnings?.length ? `\nCatatan web research:\n${context.warnings.map((warning) => `- ${warning}`).join("\n")}` : "";

  return `Konteks web hasil pencarian/crawl server untuk query "${context.query}".
Sumber retrieval web: ${context.source}.

${results}

Aturan penggunaan konteks web:
- Pakai konteks web hanya sebagai penguat penjelasan sosial, contoh aktual, istilah, atau latar umum.
- Jangan jadikan artikel web sebagai sumber utama ayat, hadits, takhrij, derajat hadits, fatwa, atau klaim hukum syar'i.
- Jangan menyalin paragraf panjang dari halaman. Ambil intinya dan tulis ulang menjadi narasi mimbar yang orisinal.
- Jika menyebut sumber, cukup sebut nama situs/lembaga secara ringkas; jangan tampilkan daftar URL panjang di naskah final kecuali user memintanya.
- Jika konteks web bertentangan dengan dalil terkurasi atau aturan naskah, ikuti dalil terkurasi dan aturan naskah.${warnings}`;
}

function seedIdFor(kind: "quran" | "hadith", reference: string, index: number) {
  const normalized = reference
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `seed-${kind}-${normalized || index}`;
}

function seedTagsFor(set: ThematicDalilSet) {
  return [
    ...new Set(
      [
        set.label,
        ...set.keywords,
        ...set.label.split(/[,،]/),
        ...set.label.split(/\s+dan\s+|\s+atau\s+/)
      ]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

function gradeFromReference(reference: string) {
  if (/bukhari|muslim/i.test(reference)) return "Sahih";
  if (/tirmidzi/i.test(reference)) return "Perlu cek derajat di kitab sumber";
  return null;
}

export function curatedDalilSeedItems(): CuratedDalilSeedItem[] {
  const items: CuratedDalilSeedItem[] = [];
  let index = 0;

  for (const set of thematicDalilSets) {
    const tags = seedTagsFor(set);
    for (const ayat of set.ayat) {
      index += 1;
      items.push({
        id: seedIdFor("quran", ayat.rujukan, index),
        kind: "quran",
        reference: ayat.rujukan,
        arab: ayat.arab,
        translation: ayat.arti,
        source: "Seed dalil tematik aplikasi",
        tafsir: `Paket tema: ${set.label}.`,
        tags
      });
    }

    for (const hadith of set.hadith) {
      index += 1;
      items.push({
        id: seedIdFor("hadith", hadith.rujukan, index),
        kind: "hadith",
        reference: hadith.rujukan,
        arab: hadith.arab,
        translation: hadith.arti,
        source: "Seed dalil tematik aplikasi",
        grade: gradeFromReference(hadith.rujukan),
        takhrij: hadith.rujukan,
        tafsir: `Paket tema: ${set.label}.`,
        tags
      });
    }
  }

  return items;
}

const localizedContentTypeLabels: Record<SupportedLanguage, Record<ContentType, string>> = {
  Indonesia: contentTypeLabels,
  Jawa: {
    "khutbah-jumat": "Khutbah Jumat",
    "idul-fitri": "Khutbah Idul Fitri",
    "idul-adha": "Khutbah Idul Adha",
    nikah: "Khutbah Nikah",
    ceramah: "Ceramah Umum",
    kultum: "Kultum"
  },
  Sunda: {
    "khutbah-jumat": "Khutbah Jumat",
    "idul-fitri": "Khutbah Idul Fitri",
    "idul-adha": "Khutbah Idul Adha",
    nikah: "Khutbah Nikah",
    ceramah: "Ceramah Umum",
    kultum: "Kultum"
  },
  "Ogan (Baturaja)": {
    "khutbah-jumat": "Khutbah Jumat",
    "idul-fitri": "Khutbah Idul Fitri",
    "idul-adha": "Khutbah Idul Adha",
    nikah: "Khutbah Nikah",
    ceramah: "Ceramah Umum",
    kultum: "Kultum"
  },
  Arab: {
    "khutbah-jumat": "خُطْبَةُ الْجُمُعَةِ",
    "idul-fitri": "خُطْبَةُ عِيْدِ الْفِطْرِ",
    "idul-adha": "خُطْبَةُ عِيْدِ الْأَضْحَى",
    nikah: "خُطْبَةُ النِّكَاحِ",
    ceramah: "مَوْعِظَةٌ عَامَّةٌ",
    kultum: "مَوْعِظَةٌ قَصِيْرَةٌ"
  }
};

const fallbackLabels: Record<
  SupportedLanguage,
  {
    topic: string;
    language: string;
    meaning: string;
    reference: string;
    practical: string;
    opening: string;
    introduction: string;
    dalil: string;
    reflection: string;
    mainContent: string;
    keyPoints: string;
    closing: string;
    weddingIntro: string;
    weddingAdvice: string;
    familyMessage: string;
    prayer: string;
  }
> = {
  Indonesia: {
    topic: "Tema",
    language: "Bahasa",
    meaning: "Artinya",
    reference: "Rujukan",
    practical: "Pesan Praktis",
    opening: "Pembuka",
    introduction: "Pengantar",
    dalil: "Dalil",
    reflection: "Renungan",
    mainContent: "Isi Utama",
    keyPoints: "Poin-Poin Kunci",
    closing: "Penutup",
    weddingIntro: "Pengantar Akad",
    weddingAdvice: "Nasihat untuk Mempelai",
    familyMessage: "Pesan untuk Keluarga",
    prayer: "Doa"
  },
  Jawa: {
    topic: "Tema",
    language: "Basa",
    meaning: "Tegesipun",
    reference: "Rujukan",
    practical: "Pitedah Praktis",
    opening: "Pambuka",
    introduction: "Pangandikan",
    dalil: "Dalil",
    reflection: "Renungan",
    mainContent: "Isi Utama",
    keyPoints: "Poin-Poin Wigati",
    closing: "Panutup",
    weddingIntro: "Pambuka Akad",
    weddingAdvice: "Pitedah Kangge Manten",
    familyMessage: "Pitedah Kangge Kulawarga",
    prayer: "Donga"
  },
  Sunda: {
    topic: "Tema",
    language: "Basa",
    meaning: "Hartina",
    reference: "Rujukan",
    practical: "Pituduh Praktis",
    opening: "Bubuka",
    introduction: "Panganteur",
    dalil: "Dalil",
    reflection: "Renungan",
    mainContent: "Eusi Utama",
    keyPoints: "Poin-Poin Utama",
    closing: "Panutup",
    weddingIntro: "Panganteur Akad",
    weddingAdvice: "Pituduh pikeun Panganten",
    familyMessage: "Pesen pikeun Kulawarga",
    prayer: "Doa"
  },
  "Ogan (Baturaja)": {
    topic: "Tema",
    language: "Bahasa",
    meaning: "Artinye",
    reference: "Rujukan",
    practical: "Pesan Praktis",
    opening: "Pembuke",
    introduction: "Pengantar",
    dalil: "Dalil",
    reflection: "Renungan",
    mainContent: "Isi Utama",
    keyPoints: "Pokok-Pokok Penting",
    closing: "Penutup",
    weddingIntro: "Pengantar Akad",
    weddingAdvice: "Nasihat untuk Penganten",
    familyMessage: "Pesan untuk Keluarge",
    prayer: "Doa"
  },
  Arab: {
    topic: "اَلْمَوْضُوعُ",
    language: "اَللُّغَةُ",
    meaning: "اَلْمَعْنَى",
    reference: "اَلْمَرْجِعُ",
    practical: "رِسَالَاتٌ عَمَلِيَّةٌ",
    opening: "اَلْمُقَدِّمَةُ",
    introduction: "اَلتَّمْهِيْدُ",
    dalil: "اَلدَّلِيْلُ",
    reflection: "وَقْفَةٌ إِيْمَانِيَّةٌ",
    mainContent: "صُلْبُ الْمَوْعِظَةِ",
    keyPoints: "نِقَاطٌ مُهِمَّةٌ",
    closing: "اَلْخِتَامُ",
    weddingIntro: "تَمْهِيْدُ الْعَقْدِ",
    weddingAdvice: "وَصِيَّةٌ لِلزَّوْجَيْنِ",
    familyMessage: "رِسَالَةٌ لِلْأُسْرَةِ",
    prayer: "اَلدُّعَاءُ"
  }
};

const localizedMeanings: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  "QS. Ali 'Imran: 102": {
    Jawa:
      "He para tiyang ingkang sami iman, sami takwaa dhumateng Allah kanthi takwa ingkang saestu, lan sampun ngantos seda kajawi wonten ing kawontenan muslim.",
    Sunda:
      "He jalma-jalma anu ariman, sing takwa ka Allah kalayan takwa anu sabenerna, sarta ulah pupus iwal dina kaayaan muslim.",
    Arab:
      "يَا أَهْلَ الْإِيْمَانِ، اِلْتَزِمُوا تَقْوَى اللهِ حَقَّ التَّقْوَى، وَاثْبُتُوا عَلَى الْإِسْلَامِ حَتَّى تَلْقَوْا اللهَ."
  },
  "QS. At-Taghabun: 16": {
    Jawa:
      "Mila sami takwaa dhumateng Allah sakuwatipun, sami mirengaken, sami taat, lan sami nginfakaken kabecikan kangge awak panjenengan.",
    Sunda:
      "Ku kituna takwa ka Allah sabisa-bisa, dengekeun, taat, sarta infakkeun kahadean pikeun diri sorangan.",
    Arab:
      "اِتَّقُوا اللهَ عَلَى قَدْرِ طَاقَتِكُمْ، وَاسْمَعُوا لِلْحَقِّ، وَأَطِيْعُوا، وَأَنْفِقُوا خَيْرًا لِأَنْفُسِكُمْ."
  },
  "QS. An-Nahl: 90": {
    Jawa:
      "Saestu Allah dhawuh supados adil, tumindak ihsan, lan paring pitulungan dhumateng sedherek ingkang celak.",
    Sunda:
      "Saestuna Allah marentahkeun adil, ihsan, jeung mere pitulung ka dulur anu deukeut.",
    Arab:
      "إِنَّ اللهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ، وَبِصِلَةِ ذَوِي الْقُرْبَى وَإِعَانَتِهِمْ."
  },
  "QS. Ar-Rum: 21": {
    Jawa:
      "Kalebet tandha-tandha panguwasanipun Allah, Panjenenganipun nyipta pasangan saking jinis panjenengan piyambak supados panjenengan pikantuk tentrem, lan Panjenenganipun paring katresnan saha welas asih.",
    Sunda:
      "Di antara tanda kakawasaan Allah, Anjeunna nyiptakeun pasangan tina diri aranjeun supaya aranjeun ngarasa tengtrem, sarta Anjeunna ngajadikeun kanyaah jeung rahmat di antara aranjeun.",
    Arab:
      "مِنْ آيَاتِ اللهِ أَنْ خَلَقَ لَكُمْ أَزْوَاجًا تَسْكُنُوْنَ إِلَيْهَا، وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً."
  },
  "QS. Al-'Ankabut: 45": {
    Jawa:
      "Tegakna shalat; saestu shalat punika nyegah saking tumindak keji lan munkar, lan dzikir dhumateng Allah punika langkung ageng kautamanipun.",
    Sunda:
      "Tegakkeun shalat; saestuna shalat nyegah tina lampah keji jeung mungkar, sarta dzikir ka Allah leuwih gede kautamaanna.",
    Arab:
      "إِقَامَةُ الصَّلَاةِ تَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ، وَذِكْرُ اللهِ فِيْهَا أَعْظَمُ مَا يُرَبِّي الْقَلْبَ."
  },
  "QS. Al-Mu'minun: 1-2": {
    Jawa:
      "Saestu begja para mukmin, inggih punika tiyang-tiyang ingkang khusyuk wonten shalatipun.",
    Sunda:
      "Saestuna bagja jalma-jalma mukmin, nyaeta anu khusyuk dina shalatna.",
    Arab:
      "قَدْ فَازَ الْمُؤْمِنُوْنَ الَّذِيْنَ يَحْضُرُ قَلْبُهُمْ فِيْ صَلَاتِهِمْ خُشُوْعًا لِلّٰهِ."
  },
  "QS. An-Nisa: 58": {
    Jawa:
      "Saestu Allah dhawuh supados amanah dipun paringaken dhateng ingkang kagungan hak, lan nalika netepaken perkawis antawisipun manungsa kedah kanthi adil.",
    Sunda:
      "Saestuna Allah marentahkeun supaya amanah ditepikeun ka anu boga hak, sarta lamun netepkeun perkara di antara manusa kudu kalayan adil.",
    Arab:
      "إِنَّ اللهَ يَأْمُرُ بِأَدَاءِ الْأَمَانَةِ إِلَى أَهْلِهَا، وَبِالْعَدْلِ عِنْدَ الْحُكْمِ بَيْنَ النَّاسِ."
  },
  "QS. Al-Anfal: 27": {
    Jawa:
      "He para tiyang ingkang iman, sampun ngantos ngiyanati Allah lan Rasul, lan sampun ngiyanati amanah ingkang dipun pasrahaken dhumateng panjenengan.",
    Sunda:
      "He jalma-jalma anu ariman, ulah ngahianat ka Allah jeung Rasul, sarta ulah ngahianat kana amanah anu dipercayakeun ka aranjeun.",
    Arab:
      "يَنْهَى اللهُ الْمُؤْمِنِيْنَ عَنِ الْخِيَانَةِ فِيْ حَقِّ اللهِ وَرَسُوْلِهِ وَفِي الْأَمَانَاتِ الَّتِيْ حُمِّلُوْهَا."
  },
  "QS. Al-Baqarah: 153": {
    Jawa:
      "He para tiyang ingkang iman, nyuwuna pitulungan kanthi sabar lan shalat; saestu Allah nunggil kaliyan tiyang-tiyang ingkang sabar.",
    Sunda:
      "He jalma-jalma anu ariman, nyuhunkeun pitulung ku sabar jeung shalat; saestuna Allah sareng jalma-jalma anu sabar.",
    Arab:
      "يَأْمُرُ اللهُ أَهْلَ الْإِيْمَانِ أَنْ يَسْتَعِيْنُوا بِالصَّبْرِ وَالصَّلَاةِ، وَيُبَشِّرُهُمْ بِمَعِيَّتِهِ لِلصَّابِرِيْنَ."
  },
  "QS. Ibrahim: 7": {
    Jawa:
      "Menawi panjenengan sami syukur, Allah mesthi nambah nikmat; nanging menawi kufur, saestu siksa-Nipun abot.",
    Sunda:
      "Lamun aranjeun bersyukur, Allah pasti nambahan nikmat; tapi lamun kufur, saestuna azab-Na kacida beuratna.",
    Arab:
      "مَنْ شَكَرَ نِعَمَ اللهِ زَادَهُ اللهُ مِنْ فَضْلِهِ، وَمَنْ كَفَرَ فَإِنَّ عَذَابَ اللهِ شَدِيْدٌ."
  },
  "QS. Al-Hajj: 37": {
    Jawa:
      "Daging lan getih kurban boten dumugi dhumateng Allah; ingkang dumugi dhumateng Panjenenganipun inggih punika takwa saking panjenengan.",
    Sunda:
      "Daging jeung getih kurban moal nepi ka Allah; anu nepi ka Anjeunna nyaeta takwa ti aranjeun.",
    Arab:
      "لَا يَبْلُغُ اللهَ لَحْمُ الْقُرْبَانِ وَلَا دَمُهُ، وَلٰكِنْ يَبْلُغُهُ صِدْقُ التَّقْوَى مِنَ الْعِبَادِ."
  },
  "QS. Qaf: 18": {
    Jawa:
      "Boten wonten tembung ingkang medal saking lisan kajawi wonten malaikat pengawas ingkang siyaga nyathet.",
    Sunda:
      "Teu aya hiji ucapan anu kaluar iwal aya malaikat pangawas anu siap nyatet.",
    Arab:
      "كُلُّ لَفْظٍ يَخْرُجُ مِنَ الْإِنْسَانِ عَلَيْهِ رَقِيْبٌ مِنَ الْمَلَائِكَةِ يَكْتُبُهُ."
  },
  "Sesungguhnya amal-amal itu bergantung pada niat, dan setiap orang mendapatkan sesuai dengan apa yang ia niatkan.": {
    Jawa:
      "Saestu amal-amal punika gumantung marang niatipun, lan saben tiyang pikantuk miturut niatipun.",
    Sunda:
      "Saestuna amal-amal gumantung kana niatna, sarta unggal jalma meunang nurutkeun niatna.",
    Arab:
      "إِنَّ صِحَّةَ الْعَمَلِ وَقَبُوْلَهُ يَرْتَبِطَانِ بِالنِّيَّةِ، وَلِكُلِّ إِنْسَانٍ مَا نَوَاهُ."
  },
  "Siapa yang beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.": {
    Jawa:
      "Sinten ingkang iman dhumateng Allah lan dinten akhir, prayoginipun ngendika ingkang sae utawi meneng.",
    Sunda:
      "Saha wae anu iman ka Allah jeung poe akhir, kudu nyarios anu hade atawa cicing.",
    Arab:
      "مَنْ كَانَ يُؤْمِنُ بِاللهِ وَالْيَوْمِ الْآخِرِ، فَلْيَتَكَلَّمْ بِالْخَيْرِ أَوْ لِيَلْزَمِ الصَّمْتَ."
  },
  "Tidak sempurna iman salah seorang dari kalian sampai ia mencintai saudaranya sebagaimana ia mencintai dirinya sendiri.": {
    Jawa:
      "Imanipun tiyang dereng sampurna ngantos piyambakipun nresnani sedherekipun kados nresnani awakipun piyambak.",
    Sunda:
      "Iman hiji jalma can sampurna nepi ka manehna mikanyaah dulurna sakumaha mikanyaah dirina sorangan.",
    Arab:
      "لَا يَكْمُلُ إِيْمَانُ أَحَدِنَا حَتَّى يُحِبَّ لِأَخِيْهِ مَا يُحِبُّ لِنَفْسِهِ."
  },
  "Tanda orang munafik ada tiga: apabila berbicara ia berdusta, apabila berjanji ia mengingkari, dan apabila diberi amanah ia berkhianat.": {
    Jawa:
      "Tandhanipun tiyang munafik wonten tiga: menawi ngendika goroh, menawi janji nglirwakaken, lan menawi dipun pitados malah ngiyanati.",
    Sunda:
      "Tanda jalma munafik aya tilu: lamun nyarios bohong, lamun jangji mungkir, jeung lamun dipercaya ngahianat.",
    Arab:
      "مِنْ عَلَامَاتِ النِّفَاقِ الْكَذِبُ فِي الْحَدِيْثِ، وَإِخْلَافُ الْوَعْدِ، وَخِيَانَةُ الْأَمَانَةِ."
  },
  "Sungguh menakjubkan keadaan seorang mukmin; seluruh urusannya bernilai baik baginya.": {
    Jawa:
      "Saestu nggumunaken kawontenan tiyang mukmin; sedaya perkawisipun saged dados kabecikan kangge piyambakipun.",
    Sunda:
      "Saestuna matak endah kaayaan saurang mukmin; sakabeh urusanna bisa jadi kahadean pikeun manehna.",
    Arab:
      "أَمْرُ الْمُؤْمِنِ كُلُّهُ خَيْرٌ، فَإِنْ أَصَابَتْهُ سَرَّاءُ شَكَرَ، وَإِنْ أَصَابَتْهُ ضَرَّاءُ صَبَرَ."
  },
  "Siapa yang tidak berterima kasih kepada manusia, ia tidak bersyukur kepada Allah.": {
    Jawa:
      "Sinten ingkang boten matur nuwun dhateng manungsa, piyambakipun dereng saestu syukur dhumateng Allah.",
    Sunda:
      "Saha anu henteu ngahaturkeun nuhun ka manusa, manehna henteu saestu syukur ka Allah.",
    Arab:
      "مَنْ لَمْ يَشْكُرِ النَّاسَ عَلَى إِحْسَانِهِمْ، لَمْ يُحَقِّقْ شُكْرَ اللهِ عَلَى نِعَمِهِ."
  },
  "Sebaik-baik kalian adalah yang paling baik kepada keluarganya, dan aku adalah yang paling baik kepada keluargaku.": {
    Jawa:
      "Sae-saenipun panjenengan inggih punika ingkang paling sae dhateng kulawarganipun, lan Rasulullah dados tuladha paling sae dhateng kulawarganipun.",
    Sunda:
      "Panghadena aranjeun nyaeta anu panghadena ka kulawargana, sarta Rasulullah anu panghadena ka kulawargana.",
    Arab:
      "خِيَارُ النَّاسِ أَحْسَنُهُمْ مُعَاشَرَةً لِأَهْلِهِ، وَالنَّبِيُّ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ أَكْمَلُهُمْ فِيْ ذٰلِكَ."
  },
  "Tidaklah seorang hamba muslim shalat karena Allah setiap hari dua belas rakaat sunah selain shalat wajib, kecuali Allah membangunkan baginya sebuah rumah di surga.": {
    Jawa:
      "Sinten kemawon hamba muslim ingkang saben dinten nindakaken rolas rakaat shalat sunah amargi Allah, Allah badhe mbangunaken griya kangge piyambakipun wonten swarga.",
    Sunda:
      "Saha wae hamba muslim anu unggal dinten shalat dua belas rakaat sunah lantaran Allah, Allah bakal ngawangun imah pikeun manehna di surga.",
    Arab:
      "مَنْ حَافَظَ عَلَى اثْنَتَيْ عَشْرَةَ رَكْعَةً مِنَ النَّوَافِلِ كُلَّ يَوْمٍ بَنَى اللهُ لَهُ بِهَا بَيْتًا فِي الْجَنَّةِ."
  },
  "Shalat yang paling utama setelah shalat fardhu adalah shalat malam.": {
    Jawa:
      "Shalat ingkang paling utama sasampunipun shalat fardhu inggih punika shalat dalu.",
    Sunda:
      "Shalat anu pangutama sanggeus shalat fardhu nyaeta shalat peuting.",
    Arab:
      "أَفْضَلُ النَّوَافِلِ بَعْدَ الْفَرِيْضَةِ صَلَاةُ اللَّيْلِ، لِمَا فِيْهَا مِنْ صِدْقِ الْإِقْبَالِ عَلَى اللهِ."
  }
};

function fallbackLabelFor(jenis: string, language: SupportedLanguage) {
  return localizedContentTypeLabels[language][jenis as ContentType] ?? contentTypeLabels[jenis as ContentType] ?? "Naskah";
}

function localizedMeaningFor(item: DalilText, language: SupportedLanguage) {
  return localizedMeanings[item.arti]?.[language] ?? localizedMeanings[item.rujukan]?.[language] ?? item.arti;
}

function meaningLineFor(item: DalilText, language: SupportedLanguage) {
  const labels = fallbackLabels[language];
  return `${labels.meaning}: ${localizedMeaningFor(item, language)} ${labels.reference}: ${item.rujukan}.`;
}

function localizeOganBaturajaText(text: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\bMari kita\b/g, "Ayok kite"],
    [/\bmari kita\b/g, "ayok kite"],
    [/\bkita\b/g, "kite"],
    [/\bKita\b/g, "Kite"],
    [/\borang-orang\b/g, "jeme-jeme"],
    [/\bOrang-orang\b/g, "Jeme-jeme"],
    [/\borang\b/g, "jeme"],
    [/\bOrang\b/g, "Jeme"],
    [/\btidak\b/g, "idak"],
    [/\bTidak\b/g, "Idak"],
    [/\bbukan\b/g, "bukanlah"],
    [/\bhanya\b/g, "cuma"],
    [/\bsangat\b/g, "nian"],
    [/\bsekali\b/g, "nian"],
    [/\bbisa\b/g, "pacak"],
    [/\bBisa\b/g, "Pacak"],
    [/\bmenjadi\b/g, "jadi"],
    [/\bMenjadi\b/g, "Jadi"],
    [/\bhendak\b/g, "nak"],
    [/\bHendak\b/g, "Nak"],
    [/\bingin\b/g, "nak"],
    [/\bIngin\b/g, "Nak"],
    [/\bsaja\b/g, "bae"],
    [/\bSaja\b/g, "Bae"],
    [/\bsering\b/g, "galak"],
    [/\bSering\b/g, "Galak"],
    [/\brumah\b/g, "griye"],
    [/\bRumah\b/g, "Griye"],
    [/\bkeluarga\b/g, "keluarge"],
    [/\bKeluarga\b/g, "Keluarge"],
    [/\btetangga\b/g, "jeme dusun"],
    [/\bTetangga\b/g, "Jeme dusun"],
    [/\bperkataan\b/g, "omongan"],
    [/\bPerkataan\b/g, "Omongan"],
    [/\bberbicara\b/g, "beromong"],
    [/\bBerbicara\b/g, "Beromong"],
    [/\bmendengar\b/g, "ndenger"],
    [/\bMendengar\b/g, "Ndenger"],
    [/\bmelihat\b/g, "ningok"],
    [/\bMelihat\b/g, "Ningok"],
    [/\bmemperbaiki\b/g, "mbaguske"],
    [/\bMemperbaiki\b/g, "Mbaguske"],
    [/\bmenjaga\b/g, "njage"],
    [/\bMenjaga\b/g, "Njage"],
    [/\bmenolong\b/g, "nulungi"],
    [/\bMenolong\b/g, "Nulungi"],
    [/\bsedang\b/g, "lagi"],
    [/\bSedang\b/g, "Lagi"],
    [/\bsupaya\b/g, "biar"],
    [/\bSupaya\b/g, "Biar"],
    [/\bdengan\b/g, "dengan"],
    [/\byang\b/g, "yang"]
  ];

  return replacements.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
}

function khutbahMessageFor(
  jenis: string,
  tema: string,
  seed: string,
  language: SupportedLanguage,
  dalilLabel = "takwa dan amal saleh"
) {
  if (language === "Indonesia" && jenis === "khutbah-jumat") {
    const label = normalizedTopic(dalilLabel);
    if (label.includes("sabar")) {
      return `Khutbah Jumat bukan sekadar rutinitas mingguan. Ia menjadi saat untuk melatih hati agar lebih sabar menghadapi ujian, lebih tenang ketika kecewa, lebih kuat menjaga shalat, dan lebih hati-hati agar lisan tidak mencela takdir Allah.`;
    }
    if (label.includes("amanah") || label.includes("kejujuran")) {
      return `Khutbah Jumat bukan sekadar rutinitas mingguan. Ia menjadi saat untuk memeriksa amanah yang kita pikul: janji yang pernah diucapkan, tugas yang belum ditunaikan, hak orang lain yang masih tertahan, dan kejujuran yang harus dijaga meski tidak diawasi.`;
    }
    if (label.includes("sedekah") || label.includes("zakat") || label.includes("infak")) {
      return `Khutbah Jumat bukan sekadar rutinitas mingguan. Ia menjadi saat untuk melembutkan hati agar tidak tertutup oleh kepentingan sendiri, lalu melihat siapa yang perlu dibantu dari keluarga, tetangga, fakir miskin, dan saudara yang sedang kesulitan.`;
    }
    if (label.includes("syukur")) {
      return `Khutbah Jumat bukan sekadar rutinitas mingguan. Ia menjadi saat untuk menghitung nikmat yang sering luput kita sadari, lalu bertanya apakah kesehatan, waktu, keluarga, dan rezeki telah kita gunakan untuk taat kepada Allah.`;
    }
  }

  if (language === "Jawa") {
    const common = [
      `Tema ${tema} kedah dipun turunaken saking mimbar dhateng gesang saben dinten: wonten griya, papan nyambut damel, pasar, lan pirembagan padintenan. Ing ngriku takwa katon, boten namung nalika lisan saged maringi pitutur.`,
      `Asring ujian agama rawuh wonten perkara prasaja: nahan duka, nyuwun pangapunten rumiyin, jujur nalika boten dipun tingali, lan tetep alus nalika manah sayah. Saking punika, tema ${tema} dados amal nyata.`,
      `Mangga kita nyuwun pirsa dhateng dhiri piyambak: sasampunipun mireng pitutur punika, perangan gesang pundi ingkang badhe kita dandosi? Khutbah boten cekap dados tembung, nanging kedah dados keputusan anyar wonten ngarsaning Allah.`
    ];
    const fitri = [
      `Idul Fitri mulang bilih kamenangan boten namung rampungipun pasa, nanging nalika manah kersa wangsul resik. Tema ${tema} dados celak kaliyan dinten riyaya: kita sowan, sami nyapa, ngapura, lan miwiti lembar anyar.`,
      `Sasampunipun Ramadhan ndhidhik lapar lan sabar, Syawal nguji jembaripun manah. Mukmin sinau ngasoraken ego supados paseduluran langkung awet tinimbang tatu.`,
      `Wonten dinten fitri, busana saged enggal lan dhaharan saged sumadhiya, nanging ingkang paling endah inggih manah ingkang boten nyimpen serik. Saking ngriku tema ${tema} pikantuk tegesipun.`
    ];
    const adha = [
      `Idul Adha mulang bilih tresna dhumateng Allah kedah langkung inggil tinimbang tresna dhumateng ego, bandha, lan penakipun dhiri. Tema ${tema} ngajak kita nimbang malih punapa ingkang paling kita bela wonten gesang.`,
      `Kurban boten namung nyembelih kewan. Kurban ndhidhik kita nyembelih kikir, atosipun manah, lan wegah berbagi. Saking kulawarga Nabi Ibrahim, kita sinau bilih taat asring nyuwun keberanian.`,
      `Gema takbir Idul Adha ngelingaken bilih ingkang Agung namung Allah. Menawi Allah ingkang paling agung, ego kedah alit, serik kedah leren, lan welas asih kedah tuwuh.`
    ];
    const jumat = [
      `Kathah jamaah dinten punika dipun uji dening ritme gesang ingkang cepet: pedamelan numpuk, tekanan ekonomi, lan komunikasi kulawarga ingkang gampil tegang. Tema ${tema} ngajak kita nata prioritas malih supados ibadah boten kalah dening kesibukan.`,
      `Wonten lingkungan kita, padu alit asring dados ageng amargi lisan boten dipun jaga lan ego boten dipun tundukaken. Tema ${tema} nyuwun kadewasan iman: nahan duka, netepi amanah, lan adil dhateng sinten kemawon.`,
      `Khutbah Jumat boten namung rutinitas mingguan. Punika panggilan kangge muhasabah: kados pundi transaksi kita, cara nyambut damel, cara ndhidhik anak, lan cara ngurmati tangga teparo lumantar nilai ${tema}.`
    ];
    const options = jenis === "idul-fitri" ? fitri : jenis === "idul-adha" ? adha : jenis === "khutbah-jumat" ? jumat : common;
    return pick(options, seed, 10);
  }

  if (language === "Sunda") {
    const common = [
      `Tema ${tema} perlu dibawa turun tina mimbar kana kahirupan sapopoe: ka imah, tempat damel, pasar, jalan, jeung obrolan urang. Di dinya takwa katempo, lain ukur nalika lisan gampang mere nasihat.`,
      `Ujian agama mindeng datang dina perkara basajan: nahan amarah, menta hampura heula, jujur nalika teu aya anu ningali, jeung tetep lemah lembut nalika hate keur cape. Tina titik ieu, tema ${tema} jadi amal anu nyata.`,
      `Hayu urang naros ka diri sorangan: sanggeus ngadenge nasihat ayeuna, bagian hirup mana anu rek dirobah? Khutbah ulah eureun jadi kecap, tapi kudu jadi kaputusan anyar di payuneun Allah.`
    ];
    const fitri = [
      `Idul Fitri ngajarkeun yen kameunangan lain ukur sabab urang rengse puasa, tapi sabab hate daek balik jernih. Tema ${tema} raket pisan jeung poe raya: urang mulang, silih sapa, silih hampura, jeung ngamimitian lambar anyar.`,
      `Sanggeus Ramadhan ngalatih lapar jeung sabar, Syawal nguji jembarna dada. Mukmin diajar ngalahkeun ego supaya silaturahmi leuwih panjang tibatan kanyeri.`,
      `Dina poe fitri, pakean bisa anyar jeung kadaharan bisa nyampak, tapi anu pangendahna nyaeta hate anu henteu deui nyimpen kanyeri. Ti dieu tema ${tema} manggih hartina.`
    ];
    const adha = [
      `Idul Adha ngajarkeun yen kanyaah ka Allah kudu leuwih luhur tibatan kanyaah ka ego, harta, jeung kanyamanan. Tema ${tema} ngajak urang nimbang deui naon anu pangdipikabela dina hirup.`,
      `Kurban lain saukur meuncit sato. Kurban ngalatih urang meuncit sipat kikir, hate teuas, jeung wegah ngabagi. Tina kulawarga Nabi Ibrahim, urang diajar yen taat mindeng merlukeun kawani.`,
      `Gema takbir Idul Adha ngingetkeun yen anu Mahaagung ngan Allah. Lamun Allah anu pangagungna, ego kudu leutik, dendam kudu reda, jeung kapedulian kudu tumuwuh.`
    ];
    const jumat = [
      `Seueur jamaah dinten ieu diuji ku wirahma hirup anu gancang: padamelan numpuk, tekanan ekonomi, jeung komunikasi kulawarga anu gampang tegang. Tema ${tema} ngajak urang nyusun deui prioritas supaya ibadah teu eleh ku kasibukan.`,
      `Di lingkungan urang, pasalia leutik mindeng jadi gede sabab lisan teu dijaga jeung ego teu ditalukkeun. Tema ${tema} merlukeun kadewasaan iman: nahan amarah, netepan amanah, jeung adil ka saha wae.`,
      `Khutbah Jumat lain saukur rutinitas mingguan. Ieu panggero pikeun muhasabah: kumaha transaksi urang, cara damel urang, cara ngadidik anak, jeung cara ngaraksa tatangga ngaliwatan nilai ${tema}.`
    ];
    const options = jenis === "idul-fitri" ? fitri : jenis === "idul-adha" ? adha : jenis === "khutbah-jumat" ? jumat : common;
    return pick(options, seed, 10);
  }

  if (language === "Arab") {
    const common = [
      `إِنَّ مَوْضُوْعَ ${tema} يَنْبَغِيْ أَنْ يَنْتَقِلَ مِنَ الْمِنْبَرِ إِلَى الْبَيْتِ، وَالْعَمَلِ، وَالسُّوْقِ، وَحَدِيْثِ النَّاسِ؛ فَهُنَاكَ تَظْهَرُ التَّقْوَى فِي الْخُلُقِ وَالْأَمَانَةِ.`,
      `كَثِيْرًا مَا يَأْتِيْ اِمْتِحَانُ الدِّيْنِ فِيْ أُمُوْرٍ صَغِيْرَةٍ: كَظَبْطِ الْغَضَبِ، وَالْمُبَادَرَةِ بِالْعَفْوِ، وَالصِّدْقِ حِيْنَ لَا يَرَانَا النَّاسُ.`,
      `فَلْيَسْأَلْ كُلُّ وَاحِدٍ مِنَّا نَفْسَهُ: مَا الْخُطْوَةُ الَّتِيْ سَأُصْلِحُهَا بَعْدَ هٰذِهِ الْمَوْعِظَةِ؟ فَالْخُطْبَةُ لَيْسَتْ كَلَامًا يُسْمَعُ فَحَسْبُ، بَلْ عَهْدٌ مَعَ اللهِ.`
    ];
    const fitri = [
      `يُعَلِّمُنَا عِيْدُ الْفِطْرِ أَنَّ النَّصْرَ لَيْسَ فِيْ تَمَامِ الصِّيَامِ فَقَطْ، بَلْ فِيْ قَلْبٍ يَرْجِعُ نَقِيًّا، وَيَصِلُ رَحِمَهُ، وَيَفْتَحُ صَفْحَةً جَدِيْدَةً.`,
      `بَعْدَ أَنْ رَبَّانَا رَمَضَانُ عَلَى الصَّبْرِ، جَاءَ شَوَّالٌ لِيَمْتَحِنَ سَعَةَ صُدُوْرِنَا وَصِدْقَ عَفْوِنَا.`,
      `فِيْ يَوْمِ الْفِطْرِ قَدْ تَجِدُ الثِّيَابَ وَالطَّعَامَ، وَلٰكِنَّ أَجْمَلَ مَا فِيْهِ قَلْبٌ لَا يَحْمِلُ حِقْدًا.`
    ];
    const adha = [
      `يُعَلِّمُنَا عِيْدُ الْأَضْحَى أَنَّ مَحَبَّةَ اللهِ أَعْلَى مِنْ مَحَبَّةِ النَّفْسِ وَالْمَالِ وَالرَّاحَةِ.`,
      `لَيْسَتِ الْأُضْحِيَّةُ ذَبْحًا لِلْبَهِيْمَةِ فَقَطْ، بَلْ تَرْبِيَةٌ عَلَى ذَبْحِ الشُّحِّ، وَقَسْوَةِ الْقَلْبِ، وَالْأَنَانِيَّةِ.`,
      `تُذَكِّرُنَا التَّكْبِيْرَاتُ أَنَّ الْكِبْرِيَاءَ لِلّٰهِ وَحْدَهُ؛ فَإِذَا كَبُرَ اللهُ فِيْ قُلُوْبِنَا صَغُرَتِ الْأَهْوَاءُ وَالضَّغَائِنُ.`
    ];
    const jumat = [
      `كَثِيْرٌ مِنَ الْمُصَلِّيْنَ الْيَوْمَ تُثْقِلُهُمُ الْأَعْمَالُ، وَضُغُوْطُ الرِّزْقِ، وَتَوَتُّرُ الْبُيُوْتِ؛ وَمَوْضُوْعُ ${tema} يَدْعُوْنَا إِلَى تَرْتِيْبِ الْأَوْلَوِيَّاتِ.`,
      `قَدْ تَكْبُرُ الْخِلَافَاتُ الصَّغِيْرَةُ إِذَا لَمْ يُحْفَظِ اللِّسَانُ وَلَمْ يُهَذَّبِ الْأَنَا؛ وَهٰذَا مَوْضِعُ نُضْجِ الْإِيْمَانِ.`,
      `لَيْسَتْ خُطْبَةُ الْجُمُعَةِ عَادَةً أُسْبُوْعِيَّةً، بَلْ دَعْوَةٌ إِلَى مُحَاسَبَةِ التِّجَارَةِ، وَالْعَمَلِ، وَتَرْبِيَةِ الْأَوْلَادِ، وَحُقُوْقِ الْجِيْرَانِ.`
    ];
    const options = jenis === "idul-fitri" ? fitri : jenis === "idul-adha" ? adha : jenis === "khutbah-jumat" ? jumat : common;
    return pick(options, seed, 10);
  }

  const common = [
    `Tema ${tema} perlu kita bawa turun dari mimbar ke ruang hidup: ke rumah, tempat kerja, pasar, jalan, dan percakapan harian. Di sanalah ketakwaan terlihat, bukan hanya ketika lisan mudah mengucapkan nasihat.`,
    `Sering kali ujian agama datang dalam bentuk yang sederhana: menahan marah, meminta maaf lebih dulu, jujur saat tidak diawasi, dan tetap lembut ketika hati sedang lelah. Dari titik-titik kecil seperti itu, tema ${tema} menjadi amal yang nyata.`,
    `Mari kita bertanya kepada diri sendiri: setelah mendengar nasihat hari ini, bagian mana dari hidup kita yang akan berubah? Khutbah tidak dimaksudkan berhenti sebagai kata-kata, tetapi menjadi keputusan baru di hadapan Allah.`
  ];
  const fitri = [
    `Idul Fitri mengajarkan bahwa kemenangan bukan hanya karena kita selesai berpuasa, tetapi karena hati bersedia kembali jernih. Tema ${tema} menjadi sangat dekat dengan hari raya: kita pulang, saling menyapa, menghapus luka, dan memulai lembar baru.`,
    `Setelah Ramadhan mendidik lapar dan sabar, Syawal menguji kelapangan dada. Tidak semua orang mudah memaafkan, tetapi seorang mukmin belajar mengalahkan ego agar silaturahmi lebih panjang dari luka.`,
    `Di hari fitri, pakaian boleh baru, hidangan boleh tersaji, tetapi yang paling indah adalah hati yang tidak lagi menyimpan dendam. Dari sinilah tema ${tema} menemukan maknanya.`
  ];
  const adha = [
    `Idul Adha mengajarkan bahwa cinta kepada Allah harus lebih tinggi daripada cinta kepada ego, harta, dan kenyamanan. Tema ${tema} mengajak kita menimbang kembali apa yang paling kita bela dalam hidup.`,
    `Kurban bukan sekadar menyembelih hewan. Ia mendidik kita menyembelih sifat kikir, keras hati, dan enggan berbagi. Dari keluarga Nabi Ibrahim, kita belajar bahwa ketaatan sering meminta keberanian.`,
    `Gema takbir Idul Adha mengingatkan bahwa yang besar hanya Allah. Jika Allah yang terbesar, maka ego harus mengecil, dendam harus reda, dan kepedulian harus tumbuh.`
  ];
  const jumat = [
    `Banyak jamaah hari ini diuji oleh ritme hidup yang cepat: pekerjaan yang menumpuk, tekanan ekonomi, dan komunikasi keluarga yang mudah tegang. Tema ${tema} mengajak kita kembali menata prioritas agar ibadah tidak kalah oleh kesibukan.`,
    `Di lingkungan kita, pertengkaran kecil sering membesar karena lisan tidak dijaga dan ego tidak ditundukkan. Tema ${tema} menuntut kedewasaan iman: menahan marah, menepati amanah, dan adil kepada orang dekat maupun yang berbeda pandangan.`,
    `Khutbah Jumat bukan sekadar rutinitas mingguan. Ia panggilan untuk mengevaluasi diri: bagaimana transaksi kita, cara kita bekerja, cara kita mendidik anak, dan cara kita memperlakukan tetangga melalui nilai ${tema}.`
  ];

  const options = jenis === "idul-fitri" ? fitri : jenis === "idul-adha" ? adha : jenis === "khutbah-jumat" ? jumat : common;
  return pick(options, seed, 10);
}

function indonesianThemeSubsectionsFor(tema: string, dalilLabel: string): FallbackSection[] {
  const label = normalizedTopic(dalilLabel);

  if (label.includes("sabar")) {
    return [
      {
        title: "Sabar Bukan Pasrah Tanpa Ikhtiar",
        body: `Jamaah shalat Jumat rahimakumullah, tema ${tema} mengajarkan bahwa sabar bukan berarti diam tanpa usaha. Sabar adalah kemampuan menahan diri dari keluh kesah yang merusak iman, tetap memilih jalan halal ketika keadaan berat, dan terus berikhtiar sambil menyandarkan hasil kepada Allah.`
      },
      {
        title: "Sabar dan Shalat sebagai Penolong",
        body:
          "Ayat tentang sabar dan shalat menuntun kita agar tidak mencari pelarian yang haram saat ditimpa kesulitan. Ketika hati gelisah, seorang mukmin kembali kepada sujud, doa, dzikir, dan langkah nyata yang diridhai Allah. Di sana ujian berubah menjadi latihan kedewasaan iman."
      },
      {
        title: "Menahan Reaksi Pertama",
        body:
          "Banyak kerusakan lahir dari reaksi pertama yang tidak dijaga: ucapan kasar saat marah, keputusan tergesa saat kecewa, atau putus asa ketika doa belum terjawab. Sabar dimulai dari jeda kecil: diam sejenak, berwudhu, shalat, lalu memilih kata dan tindakan yang paling dekat dengan ridha Allah."
      }
    ];
  }

  if (label.includes("amanah") || label.includes("kejujuran")) {
    return [
      {
        title: "Amanah Dimulai dari Perkara Kecil",
        body: `Tema ${tema} menuntut kita jujur dalam hal yang sering dianggap biasa: waktu kerja, janji, titipan, jabatan, uang bersama, dan ucapan. Amanah bukan hanya urusan pemimpin besar; ia diuji setiap hari dalam rumah, kantor, pasar, dan pergaulan.`
      },
      {
        title: "Khianat Merusak Kepercayaan",
        body:
          "Hadits tentang tanda munafik mengingatkan bahwa dusta, ingkar janji, dan khianat bukan sekadar kesalahan sosial. Ia penyakit iman yang merusak hubungan manusia dan menjauhkan keberkahan. Masyarakat menjadi rapuh ketika amanah tidak lagi dihormati."
      },
      {
        title: "Mengembalikan Hak kepada Pemiliknya",
        body:
          "Langkah taubat dalam amanah adalah mengembalikan hak, meminta maaf, memperbaiki sistem, dan berhenti mencari pembenaran. Jika memegang tugas, tunaikan. Jika memegang rahasia, jaga. Jika memegang harta orang lain, jangan campur dengan kepentingan pribadi."
      }
    ];
  }

  if (label.includes("sedekah") || label.includes("zakat") || label.includes("infak")) {
    return [
      {
        title: "Sedekah Melatih Hati Melihat Orang Lain",
        body: `Tema ${tema} mengajak kita keluar dari hidup yang hanya memikirkan diri sendiri. Sedekah melatih mata melihat kebutuhan tetangga, fakir miskin, keluarga yang kesulitan, dan saudara yang sedang tertimpa beban.`
      },
      {
        title: "Harta Tidak Hilang Saat Diberkahkan",
        body:
          "Ayat tentang infak menggambarkan bahwa harta yang keluar di jalan Allah tidak musnah. Ia tumbuh menjadi pahala, keberkahan, perlindungan dari sifat kikir, dan penguat hubungan sosial. Yang hilang sebenarnya adalah harta yang membuat hati keras dan lupa kepada Allah."
      },
      {
        title: "Memberi dengan Adab",
        body:
          "Sedekah yang baik tidak melukai penerimanya. Berilah dengan wajah lembut, rahasiakan ketika lebih menjaga kehormatan, dan dahulukan orang yang paling dekat kebutuhannya. Jika belum mampu memberi harta, berilah tenaga, waktu, ilmu, atau ucapan yang menenangkan."
      }
    ];
  }

  if (label.includes("syukur")) {
    return [
      {
        title: "Syukur Mengubah Cara Memandang Nikmat",
        body: `Tema ${tema} mengingatkan bahwa syukur bukan hanya ucapan alhamdulillah. Syukur berarti menyadari nikmat, tidak meremehkannya, lalu memakai nikmat itu untuk taat. Sehat dipakai beribadah, lisan dipakai berkata baik, dan rezeki dipakai menolong.`
      },
      {
        title: "Nikmat Bertambah dengan Ketaatan",
        body:
          "Ayat tentang syukur mengajarkan bahwa tambahan nikmat tidak selalu berbentuk harta. Kadang Allah menambah ketenangan, keluarga yang rukun, hati yang qanaah, waktu yang berkah, dan kemampuan melihat kebaikan di tengah keadaan yang sederhana."
      },
      {
        title: "Tidak Lupa kepada Pemberi Nikmat",
        body:
          "Bahaya terbesar dari nikmat adalah ketika ia membuat kita merasa mandiri dari Allah. Karena itu, syukur perlu dijaga dengan doa, sedekah, ibadah, dan rendah hati kepada manusia. Orang yang bersyukur tidak sombong saat lapang dan tidak buruk sangka saat diuji."
      }
    ];
  }

  if (label.includes("muharram") || label.includes("asyura") || label.includes("bulan haram") || label.includes("hijriah")) {
    return [
      {
        title: "Muharram Adalah Bulan yang Dimuliakan",
        body: `Tema ${tema} mengingatkan bahwa Muharram bukan sekadar awal kalender, tetapi termasuk bulan haram yang Allah muliakan. Di bulan ini seorang muslim diajak memperbesar kehati-hatian: memperbanyak ketaatan, menjauhi kezaliman terhadap diri sendiri, dan memulai lembar waktu dengan taubat yang jujur.`
      },
      {
        title: "Puasa Muharram, Tasu'a, dan Asyura",
        body:
          "Hadits Nabi menjelaskan bahwa puasa paling utama setelah Ramadhan adalah puasa di bulan Allah, Muharram. Di antara yang paling ditekankan adalah puasa Asyura pada tanggal 10 Muharram, dan dianjurkan menambah tanggal 9 Muharram sebagai Tasu'a. Inilah amalan yang jelas dalilnya dan mudah diarahkan kepada jamaah."
      },
      {
        title: "Mengawali Tahun dengan Muhasabah",
        body:
          "Pergantian tahun Hijriah sebaiknya tidak berhenti pada seremoni. Ia menjadi momen bertanya: dosa apa yang harus ditinggalkan, ibadah apa yang perlu dirapikan, hutang atau hak siapa yang harus ditunaikan, dan amal apa yang akan dijaga lebih konsisten pada tahun ini."
      }
    ];
  }

  if (label.includes("taubat") || label.includes("istighfar")) {
    return [
      {
        title: "Taubat Membuka Jalan Pulang",
        body: `Tema ${tema} memberi harapan bagi hamba yang merasa jauh. Taubat bukan tanda seseorang hina, tetapi tanda hatinya masih hidup dan ingin kembali. Jangan biarkan dosa membuat kita putus asa dari rahmat Allah.`
      },
      {
        title: "Berhenti, Menyesal, dan Memperbaiki",
        body:
          "Taubat yang benar tidak cukup dengan ucapan istighfar. Ia menuntut berhenti dari dosa, menyesal, bertekad tidak mengulang, dan mengembalikan hak manusia jika ada yang dizalimi. Air mata menjadi bermakna ketika diikuti perubahan arah."
      },
      {
        title: "Mengganti Kebiasaan Buruk",
        body:
          "Dosa sering kuat karena menjadi kebiasaan. Maka taubat perlu ditemani kebiasaan baru: majelis ilmu, teman saleh, shalat yang dijaga, lingkungan yang bersih, dan doa yang terus diulang agar Allah meneguhkan hati."
      }
    ];
  }

  if (label.includes("lisan") || label.includes("akhlak")) {
    return [
      {
        title: "Lisan adalah Amanah Harian",
        body: `Tema ${tema} mengingatkan bahwa kata-kata bukan perkara ringan. Satu kalimat bisa menenangkan, tetapi satu kalimat juga bisa menghancurkan hubungan. Orang beriman menimbang ucapan sebelum keluar dari lisannya.`
      },
      {
        title: "Berbicara Baik atau Diam",
        body:
          "Hadits tentang berkata baik atau diam adalah pagar keselamatan. Jika kalimat tidak benar, jangan diucapkan. Jika benar tetapi tidak perlu, timbang kembali. Jika benar dan perlu, sampaikan dengan adab agar kebenaran tidak berubah menjadi luka."
      },
      {
        title: "Menahan Komentar Saat Emosi",
        body:
          "Zaman ini membuat lisan berpindah ke jari: pesan singkat, komentar, dan unggahan. Maka menjaga lisan juga berarti menjaga ketikan. Jangan menyebarkan kabar yang belum jelas, jangan mempermalukan orang, dan jangan menjadikan amarah sebagai alasan melukai."
      }
    ];
  }

  if (label.includes("shalat")) {
    return [
      {
        title: "Shalat sebagai Tiang Perubahan",
        body: `Tema ${tema} tidak berhenti pada gerakan ibadah, tetapi menyentuh arah hidup. Shalat yang benar mencegah keji dan mungkar karena ia melatih seorang hamba merasa diawasi Allah sebelum, saat, dan setelah berdiri di hadapan-Nya.`
      },
      {
        title: "Khusyuk Perlu Dilatih",
        body:
          "Khusyuk tidak selalu datang seketika. Ia dilatih dengan wudhu yang tenang, datang lebih awal, memahami bacaan, mengurangi tergesa-gesa, dan menjaga hati dari hal yang melalaikan. Shalat yang dijaga akan perlahan merapikan akhlak."
      },
      {
        title: "Menjaga yang Wajib, Menguatkan dengan Sunah",
        body:
          "Mulailah dari shalat fardhu tepat waktu, lalu kuatkan dengan rawatib, Dhuha, Tahajud, atau Witir sesuai kemampuan. Amal yang sedikit tetapi konsisten lebih membentuk hati daripada semangat besar yang hanya bertahan sebentar."
      }
    ];
  }

  if (label.includes("riba")) {
    return [
      {
        title: "Riba Menghapus Keberkahan",
        body: `Tema ${tema} menuntut keberanian menata ulang cara mencari rezeki. Riba tampak menawarkan kemudahan, tetapi ayat Al-Quran mengingatkan bahwa riba menghapus keberkahan dan menyeret hati pada ketergantungan yang merusak.`
      },
      {
        title: "Muamalah Harus Bersih",
        body:
          "Islam tidak melarang orang berusaha, berdagang, atau mencari keuntungan. Yang dilarang adalah kezaliman, penindasan, dan keuntungan yang tumbuh dari kesulitan orang lain. Rezeki halal mungkin terasa lebih lambat, tetapi ia lebih menenangkan dan lebih berkah."
      },
      {
        title: "Keluar Bertahap dari Jerat Haram",
        body:
          "Jika pernah terlibat riba, jangan putus asa. Mulailah dengan berhenti menambah akad haram, belajar muamalah yang benar, menyusun ulang kebutuhan, melunasi kewajiban semampunya, dan meminta pertolongan Allah agar diberi jalan rezeki yang bersih."
      }
    ];
  }

  if (label.includes("judi")) {
    return [
      {
        title: "Judi Merusak Akal dan Keluarga",
        body: `Tema ${tema} sangat dekat dengan realitas hari ini, termasuk judi online yang masuk lewat genggaman tangan. Judi menjanjikan kemenangan cepat, tetapi yang sering terjadi adalah hutang, kebohongan, kecemasan, dan rusaknya kepercayaan keluarga.`
      },
      {
        title: "Perbuatan Setan yang Harus Dijauhi",
        body:
          "Al-Quran tidak hanya menyuruh mengurangi judi, tetapi menjauhinya. Sebab judi menanam harapan palsu, membuat orang malas bekerja secara halal, dan menjadikan rezeki sebagai permainan. Hati yang terbiasa berjudi sulit tenang dalam ibadah."
      },
      {
        title: "Memutus Akses dan Mencari Bantuan",
        body:
          "Taubat dari judi perlu langkah tegas: hapus aplikasi, tutup akses pembayaran, jujur kepada keluarga, cari pendamping yang amanah, dan ganti waktu kosong dengan kegiatan yang sehat. Jangan menunggu hancur lebih jauh baru berhenti."
      }
    ];
  }

  if (label.includes("kematian")) {
    return [
      {
        title: "Kematian adalah Kepastian yang Mendekat",
        body: `Tema ${tema} bukan untuk menakut-nakuti tanpa arah, tetapi untuk membangunkan hati. Setiap hari usia berkurang, dan setiap amal sedang menuju catatan yang akan kita bawa pulang kepada Allah.`
      },
      {
        title: "Mengingat Mati Melembutkan Hati",
        body:
          "Hadits tentang mengingat pemutus kenikmatan mengajarkan agar dunia tidak menguasai hati. Orang yang ingat mati akan lebih mudah memaafkan, lebih cepat bertaubat, lebih berhati-hati mencari rezeki, dan lebih serius menjaga shalat."
      },
      {
        title: "Menyiapkan Bekal Sebelum Terlambat",
        body:
          "Bekal kematian bukan hanya kain kafan, tetapi iman, amal saleh, hak manusia yang diselesaikan, hutang yang dicatat, keluarga yang dididik, dan kebiasaan baik yang terus mengalir setelah kita tiada."
      }
    ];
  }

  if (label.includes("orang tua")) {
    return [
      {
        title: "Bakti Terdekat Ada di Rumah",
        body: `Tema ${tema} mengingatkan bahwa amal besar sering berada sangat dekat: ayah dan ibu. Jangan sampai kita ramah kepada orang jauh, tetapi kasar kepada orang tua yang menjadi sebab hadirnya kita di dunia.`
      },
      {
        title: "Ucapan yang Menjaga Hati Orang Tua",
        body:
          "Al-Quran melarang ucapan yang menyakiti orang tua. Maka bakti bukan hanya memberi nafkah, tetapi juga melembutkan suara, mendengar keluhan, mendoakan, menemani, dan tidak membuat mereka merasa menjadi beban."
      },
      {
        title: "Bakti Setelah Mereka Wafat",
        body:
          "Jika orang tua telah wafat, pintu bakti belum tertutup. Doakan mereka, bersedekah atas nama mereka, sambung silaturahmi keluarga, tunaikan janji baik mereka, dan jaga nama baik dengan akhlak yang saleh."
      }
    ];
  }

  if (label.includes("persaudaraan")) {
    return [
      {
        title: "Ukhuwah Lebih Besar dari Ego",
        body: `Tema ${tema} mengingatkan bahwa sesama mukmin adalah saudara. Perbedaan pilihan, organisasi, kebiasaan, atau pandangan tidak boleh membuat kita mudah merendahkan dan memutus silaturahmi.`
      },
      {
        title: "Mendamaikan, Bukan Memperkeruh",
        body:
          "Ayat tentang persaudaraan memerintahkan ishlah. Maka seorang mukmin tidak senang melihat konflik membesar. Ia menahan komentar yang memanas-manasi, membawa kabar dengan hati-hati, dan memilih kalimat yang membuka jalan damai."
      },
      {
        title: "Menjadi Bangunan yang Saling Menguatkan",
        body:
          "Hadits tentang mukmin seperti bangunan mengajarkan bahwa kekuatan umat lahir dari saling menopang. Yang kuat membantu yang lemah, yang lapang menolong yang sempit, dan yang berilmu membimbing tanpa merendahkan."
      }
    ];
  }

  return [
    {
      title: "Tema yang Harus Turun Menjadi Amal",
      body: `Jamaah shalat Jumat rahimakumullah, tema ${tema} tidak cukup disebut di awal khutbah. Tema ini harus turun menjadi cara berpikir, cara berbicara, cara mengambil keputusan, dan cara memperlakukan manusia di sekitar kita.`
    },
    {
      title: "Dalil sebagai Arah Perubahan",
      body:
        "Ayat dan hadits yang dibacakan bukan tempelan penghias naskah. Dalil adalah arah perubahan: ia menunjukkan apa yang Allah cintai, apa yang harus dijauhi, dan amal apa yang perlu mulai dijaga setelah kita pulang dari masjid."
    },
    {
      title: "Memilih Langkah yang Paling Dekat",
      body: `Pilih satu langkah yang paling dekat dengan tema ${tema}. Jangan menunggu semua keadaan ideal. Perubahan yang kecil tetapi nyata lebih bermanfaat daripada banyak rencana yang tidak pernah dimulai.`
    }
  ];
}

function khutbahSubsectionsFor(
  jenis: string,
  tema: string,
  seed: string,
  language: SupportedLanguage,
  dalilLabel = "takwa dan amal saleh"
): FallbackSection[] {
  if (language === "Indonesia" && jenis === "khutbah-jumat") {
    return indonesianThemeSubsectionsFor(tema, dalilLabel);
  }

  if (language === "Indonesia" && jenis === "khutbah-jumat" && isPrayerTheme(tema)) {
    const prayerSets: FallbackSection[][] = [
      [
        {
          title: "Shalat Sunah sebagai Penjaga Shalat Fardhu",
          body: `Jamaah shalat Jumat rahimakumullah, ketika kita memilih tema ${tema}, yang sedang kita bicarakan bukan tambahan yang remeh. Shalat sunah adalah pagar yang menjaga shalat fardhu. Ia melatih hati agar tidak hanya datang kepada Allah pada batas kewajiban, tetapi juga mendekat dengan cinta, harap, dan kerendahan diri.`
        },
        {
          title: "Rawatib, Tahajud, Dhuha, dan Witir dalam Hidup Harian",
          body:
            "Di tengah kesibukan, shalat sunah mengajari kita menyediakan ruang khusus untuk Allah. Dua rakaat qabliyah Subuh, rawatib sebelum dan sesudah fardhu, Dhuha ketika mulai bekerja, Tahajud saat malam sunyi, dan Witir sebelum menutup hari adalah cara seorang hamba merapikan hubungan dengan Rabb-nya."
        },
        {
          title: "Istiqamah dalam yang Sedikit",
          body:
            "Shalat sunah tidak harus dimulai dengan beban berat. Mulailah dari yang paling mampu dijaga: rawatib yang dekat dengan shalat wajib, dua rakaat Dhuha, atau Witir sebelum tidur. Amal yang sedikit tetapi terus dijaga lebih mendidik hati daripada semangat besar yang segera hilang."
        }
      ],
      [
        {
          title: "Khusyuk yang Dilatih Berulang-Ulang",
          body: `Tema ${tema} mengingatkan kita bahwa kualitas shalat tidak datang tiba-tiba. Khusyuk perlu dilatih, dan shalat sunah memberi kesempatan untuk memperbaiki bacaan, menenangkan gerakan, memanjangkan doa, serta menghadirkan hati tanpa terburu-buru.`
        },
        {
          title: "Menutup Kekurangan dengan Nawafil",
          body:
            "Kita sering merasa shalat wajib sudah selesai, padahal di dalamnya masih banyak kekurangan: pikiran melayang, bacaan tergesa, atau hati kurang hadir. Shalat sunah menjadi latihan untuk menambal kekurangan itu dan membiasakan diri berdiri lebih tulus di hadapan Allah."
        },
        {
          title: "Rumah yang Dihidupkan dengan Shalat",
          body:
            "Sebagian shalat sunah baik dikerjakan di rumah agar rumah tidak kosong dari dzikir. Ketika keluarga melihat ayah, ibu, atau anak menjaga shalat sunah, rumah ikut belajar bahwa ibadah bukan hanya acara masjid, tetapi napas harian keluarga muslim."
        }
      ]
    ];

    return pick(prayerSets, seed, 12);
  }

  if (language === "Jawa") {
    const jumatSets: FallbackSection[][] = [
      [
        {
          title: "Amal ingkang Urip wonten Tengah Kesibukan",
          body: `Jamaah shalat Jumat ingkang dipun rahmati Allah, amal boten namung ingkang katon ageng wonten ngarsaning manungsa. Amal ugi wonten nalika tiyang tetep jujur ing transaksi, nahan lisan nalika duka, njagi shalat wonten sela pedamelan, lan boten mendhet hak tiyang sanes. Wonten mriki nilai ${tema} dipun uji kanthi nyata.`
        },
        {
          title: "Saking Dalil Dhateng Owahing Sikap",
          body: "Ayat lan hadits ingkang sampun kita mirengaken ngajari bilih agama boten mandheg wonten ilmu. Ilmu ingkang leres ndadosaken manah langkung ajrih dhumateng Allah, lisan langkung kajaga, lan tangan langkung entheng paring pitulungan."
        },
        {
          title: "Langkah Alit ingkang Dipun Jagi",
          body: `Mangga milih satunggal amal ingkang celak kaliyan ${tema}: ndandosi shalat tepat wekdal, nyuwun pangapunten dhateng kulawarga, mbalekaken amanah, utawi nulungi tangga ingkang kesrakat. Amal alit nanging istiqamah langkung aji tinimbang semangat sedhela.`
        }
      ],
      [
        {
          title: "Nalika Amal Boten Namung Pangandikan",
          body: `Ma'asyiral muslimin rahimakumullah, kathah tiyang gampil ngendika bab ${tema}, nanging Islam nyuwun bukti. Bukti punika katon nalika kita wani ngasoraken ego, purun ndandosi dhiri, lan jujur sanajan boten wonten ingkang mirsani.`
        },
        {
          title: "Ndandosi ingkang Paling Celak",
          body: "Asring amal paling sae kawiwitan saking papan ingkang paling celak: griya, meja damel, margi ingkang saben dinten dipun lewati, lan tiyang ingkang saben dinten sesrawungan kaliyan kita."
        },
        {
          title: "Bekal Sadurunge Wangsul Dhumateng Allah",
          body: "Saben Jumat ngelingaken bilih umur lumampah dhateng pungkasan. Ingkang badhe ngancani dudu pujian manungsa, nanging amal ingkang dipun tampi Allah. Mila mangga ngresiki niat lan nguataken amal."
        }
      ]
    ];
    const fitriSets: FallbackSection[][] = [
      [
        {
          title: "Njagi Cahya Ramadhan",
          body: `Jamaah Idul Fitri ingkang dipun rahmati Allah, dinten punika kita bingah, nanging kabingahan mukmin boten mandheg wonten busana enggal lan dhaharan. Kamenangan sejati inggih nalika nilai ${tema} ndadosaken manah langkung jembar, lisan langkung alus, lan ibadah Ramadhan tetep tilas sasampunipun Syawal.`
        },
        {
          title: "Ngapura ingkang Nguataken Paseduluran",
          body: "Idul Fitri ngajari keberanian kangge ngasoraken manah. Wonten tatu ingkang kedah dipun warasaken, paseduluran ingkang kedah dipun sambung, lan ego ingkang kedah dipun kalahaken."
        }
      ]
    ];
    const adhaSets: FallbackSection[][] = [
      [
        {
          title: "Tauhid ingkang Nundukaken Ego",
          body: `Jamaah Idul Adha ingkang dipun rahmati Allah, gema takbir ngelingaken bilih namung Allah ingkang Mahaagung. Menawi Allah ingkang paling agung, ego, bandha, jabatan, lan rasa nyaman kedah tunduk. Tema ${tema} ngajak kita sinau saking kulawarga Nabi Ibrahim babagan ketaatan.`
        },
        {
          title: "Kurban lan Welas Asih Sosial",
          body: "Ibadah kurban ndhidhik kita supados boten ngopeni sifat kikir. Daging kurban dipun bagi, manah dipun alusaken, lan jarak sosial dipun caketaken. Muslim boten cekap saleh piyambakan; kedah paring manfaat kangge kulawarga, tangga, lan masyarakat."
        }
      ]
    ];
    const sets = jenis === "idul-fitri" ? fitriSets : jenis === "idul-adha" ? adhaSets : jumatSets;
    return pick(sets, seed, 12);
  }

  if (language === "Sunda") {
    const jumatSets: FallbackSection[][] = [
      [
        {
          title: "Amal anu Hirup dina Kasibukan",
          body: `Jamaah shalat Jumat anu dipikarahmat ku Allah, amal lain ukur anu katingali gede di hareupeun manusa. Amal oge aya nalika jalma tetep jujur dina transaksi, nahan lisan nalika ambek, ngajaga shalat di sela padamelan, jeung henteu nyokot hak batur. Di dieu nilai ${tema} diuji sacara nyata.`
        },
        {
          title: "Tina Dalil kana Robahna Sikep",
          body: "Ayat jeung hadits anu parantos urang denge ngajarkeun yen agama henteu eureun dina pangaweruh. Ilmu anu bener ngajadikeun hate leuwih sieun ka Allah, lisan leuwih kajaga, jeung leungeun leuwih hampang nulungan."
        },
        {
          title: "Lengah Leutik anu Dijaga",
          body: `Hayu pilih hiji amal anu raket jeung ${tema}: ngalereskeun shalat dina waktuna, menta hampura ka kulawarga, mulangkeun amanah, atawa nulungan tatangga anu keur susah. Amal leutik anu istiqamah leuwih ajeg tibatan sumanget sakedapan.`
        }
      ],
      [
        {
          title: "Nalika Amal Henteu Saukur Kecap",
          body: `Ma'asyiral muslimin rahimakumullah, seueur jalma gampang nyarios ngeunaan ${tema}, tapi Islam merlukeun bukti. Bukti eta katempo dina wani nundukkeun ego, daek ngalereskeun diri, jeung jujur sanajan teu aya anu ningali.`
        },
        {
          title: "Ngalereskeun anu Pangdeukeutna",
          body: "Mindeng amal panghadena dimimitian tina tempat anu pangdeukeutna: imah, meja damel, jalan anu diliwatan unggal dinten, jeung jalma-jalma anu unggal dinten patepung jeung urang."
        },
        {
          title: "Bekel Samemeh Mulang ka Allah",
          body: "Unggal Jumat ngingetkeun yen umur terus leumpang ka tungtung. Anu bakal marengan lain pujian manusa, tapi amal anu ditampi ku Allah. Ku kituna hayu ngabersihan niat jeung nguatkeun amal."
        }
      ]
    ];
    const fitriSets: FallbackSection[][] = [
      [
        {
          title: "Ngajaga Cahaya Ramadhan",
          body: `Jamaah Idul Fitri anu dipikarahmat ku Allah, dinten ieu urang bungah, tapi kabungahan mukmin henteu eureun dina pakean anyar jeung kadaharan. Kameunangan sajati nyaeta nalika nilai ${tema} ngajadikeun hate leuwih lega, lisan leuwih lemes, jeung ibadah Ramadhan tetep nyesa sanggeus Syawal.`
        },
        {
          title: "Hampura anu Nguatkeun Silaturahmi",
          body: "Idul Fitri ngajarkeun kawani pikeun ngarendahkeun hate. Aya kanyeri anu kudu cageur, aya hubungan anu kudu disambung deui, jeung aya ego anu kudu dielehkeun."
        }
      ]
    ];
    const adhaSets: FallbackSection[][] = [
      [
        {
          title: "Tauhid anu Nundukkeun Ego",
          body: `Jamaah Idul Adha anu dipikarahmat ku Allah, gema takbir ngingetkeun yen ngan Allah anu Mahaagung. Lamun Allah anu pangagungna, ego, harta, jabatan, jeung rasa nyaman kudu tunduk. Tema ${tema} ngajak urang diajar tina kulawarga Nabi Ibrahim ngeunaan ketaatan.`
        },
        {
          title: "Kurban jeung Kapedulian Sosial",
          body: "Ibadah kurban ngalatih urang supaya henteu miara sipat kikir. Daging kurban dibagikeun, hate dilemeskeun, jeung jarak sosial dipadeukeutkeun. Muslim henteu cekap saleh sorangan; kudu mawa manfaat pikeun kulawarga, tatangga, jeung masyarakat."
        }
      ]
    ];
    const sets = jenis === "idul-fitri" ? fitriSets : jenis === "idul-adha" ? adhaSets : jumatSets;
    return pick(sets, seed, 12);
  }

  if (language === "Arab") {
    const jumatSets: FallbackSection[][] = [
      [
        {
          title: "عَمَلٌ حَيٌّ فِيْ زِحَامِ الْحَيَاةِ",
          body: `أَيُّهَا الْمُسْلِمُوْنَ رَحِمَكُمُ اللهُ، لَيْسَ الْعَمَلُ الصَّالِحُ مَا كَبُرَ فِيْ أَعْيُنِ النَّاسِ فَقَطْ؛ بَلْ هُوَ صِدْقٌ فِيْ الْبَيْعِ، وَحِفْظٌ لِلِّسَانِ، وَمُحَافَظَةٌ عَلَى الصَّلَاةِ، وَأَدَاءٌ لِلْأَمَانَةِ. هُنَا يُمْتَحَنُ مَعْنَى ${tema}.`
        },
        {
          title: "مِنَ الدَّلِيْلِ إِلَى تَغْيِيْرِ السُّلُوْكِ",
          body: "إِنَّ الْآيَةَ وَالْحَدِيْثَ يُعَلِّمَانِنَا أَنَّ الْعِلْمَ لَا يَقِفُ عِنْدَ السَّمَاعِ، بَلْ يَدْفَعُ الْقَلْبَ إِلَى خَشْيَةِ اللهِ، وَاللِّسَانَ إِلَى الْحِفْظِ، وَالْيَدَ إِلَى النَّفْعِ."
        },
        {
          title: "خُطْوَةٌ صَغِيْرَةٌ مَحْفُوْظَةٌ",
          body: `فَلْيَخْتَرْ كُلُّ وَاحِدٍ مِنَّا عَمَلًا قَرِيْبًا مِنْ مَوْضُوْعِ ${tema}: صَلَاةً فِيْ وَقْتِهَا، أَوْ عَفْوًا عَنْ أَهْلِهِ، أَوْ أَدَاءَ أَمَانَةٍ، أَوْ إِعَانَةَ جَارٍ مُحْتَاجٍ.`
        }
      ],
      [
        {
          title: "حِيْنَ لَا يَبْقَى الْعَمَلُ كَلَامًا",
          body: `يَسْهُلُ عَلَى النَّاسِ أَنْ يَتَكَلَّمُوا عَنْ ${tema}، وَلٰكِنَّ الْإِسْلَامَ يُرِيْدُ بَيِّنَةً فِيْ تَوَاضُعِ النَّفْسِ، وَإِصْلَاحِ الْخُلُقِ، وَالصِّدْقِ حِيْنَ يَغِيْبُ الرَّقِيْبُ.`
        },
        {
          title: "إِصْلَاحُ الْأَقْرَبِ",
          body: "كَثِيْرًا مَا يَبْدَأُ أَفْضَلُ الْعَمَلِ مِنَ الْبَيْتِ، وَمَكَانِ الْعَمَلِ، وَالطَّرِيْقِ الَّذِيْ نَمُرُّ بِهِ، وَالنَّاسِ الَّذِيْنَ نُلَاقِيْهِمْ كُلَّ يَوْمٍ."
        },
        {
          title: "زَادٌ قَبْلَ الرُّجُوْعِ إِلَى اللهِ",
          body: "تُذَكِّرُنَا الْجُمُعَةُ أَنَّ الْعُمُرَ يَسِيْرُ إِلَى خَاتِمَتِهِ، وَأَنَّ الَّذِيْ يَصْحَبُنَا لَيْسَ مَدْحَ النَّاسِ، بَلِ الْعَمَلُ الَّذِيْ يَقْبَلُهُ اللهُ."
        }
      ]
    ];
    const fitriSets: FallbackSection[][] = [
      [
        {
          title: "حِفْظُ نُوْرِ رَمَضَانَ",
          body: `أَيُّهَا الْمُسْلِمُوْنَ رَحِمَكُمُ اللهُ، نَفْرَحُ الْيَوْمَ، وَلٰكِنَّ فَرَحَ الْمُؤْمِنِ لَا يَقِفُ عِنْدَ الثَّوْبِ وَالطَّعَامِ؛ إِنَّمَا النَّصْرُ أَنْ يَجْعَلَ ${tema} الْقَلْبَ أَرْحَبَ، وَاللِّسَانَ أَلْطَفَ، وَالْعِبَادَةَ أَثْبَتَ بَعْدَ رَمَضَانَ.`
        },
        {
          title: "عَفْوٌ يُقَوِّيْ صِلَةَ الرَّحِمِ",
          body: "يُعَلِّمُنَا عِيْدُ الْفِطْرِ شَجَاعَةَ التَّوَاضُعِ؛ فَهُنَاكَ جُرُوْحٌ تُدَاوَى، وَعَلَاقَاتٌ تُوْصَلُ، وَأَنَانِيَّةٌ تُغْلَبُ."
        }
      ]
    ];
    const adhaSets: FallbackSection[][] = [
      [
        {
          title: "تَوْحِيْدٌ يُخْضِعُ الْأَنَا",
          body: `أَيُّهَا الْمُسْلِمُوْنَ رَحِمَكُمُ اللهُ، تُذَكِّرُنَا التَّكْبِيْرَاتُ أَنَّ اللهَ وَحْدَهُ الْكَبِيْرُ؛ فَإِذَا كَبُرَ اللهُ صَغُرَتِ الْأَنَا، وَالْمَالُ، وَالْمَنْصِبُ، وَالرَّاحَةُ. وَمَوْضُوْعُ ${tema} يَرُدُّنَا إِلَى طَاعَةِ إِبْرَاهِيْمَ وَإِسْمَاعِيْلَ عَلَيْهِمَا السَّلَامُ.`
        },
        {
          title: "اَلْأُضْحِيَّةُ وَرَحْمَةُ الْمُجْتَمَعِ",
          body: "تُرَبِّيْنَا الْأُضْحِيَّةُ عَلَى أَلَّا نُرَبِّيَ الشُّحَّ فِيْ قُلُوْبِنَا؛ فَاللَّحْمُ يُقَسَّمُ، وَالْقَلْبُ يَلِيْنُ، وَالْمُجْتَمَعُ يَتَقَارَبُ."
        }
      ]
    ];
    const sets = jenis === "idul-fitri" ? fitriSets : jenis === "idul-adha" ? adhaSets : jumatSets;
    return pick(sets, seed, 12);
  }

  const jumatSets = [
    [
      {
        title: "Amal yang Hidup di Tengah Kesibukan",
        body: `Jamaah shalat Jumat rahimakumullah, amal bukan hanya yang terlihat besar di hadapan manusia. Amal juga hadir saat seseorang tetap jujur ketika transaksi, menahan lisan ketika marah, menjaga shalat di sela pekerjaan, dan tidak mengambil hak orang lain meski ada kesempatan. Di sinilah nilai ${tema} diuji: bukan di ruang yang nyaman saja, tetapi di tengah tekanan hidup yang nyata.`
      },
      {
        title: "Dari Dalil Menuju Perubahan Sikap",
        body: "Ayat dan hadits yang telah kita dengar mengajarkan bahwa agama tidak berhenti pada pengetahuan. Ilmu yang benar mendorong hati menjadi lebih takut kepada Allah, lisan lebih terjaga, dan tangan lebih ringan menolong. Maka ukuran majelis Jumat bukan hanya khusyuk saat duduk mendengar, tetapi perubahan yang kita bawa pulang setelah keluar dari masjid."
      },
      {
        title: "Langkah Kecil yang Dijaga",
        body: `Mari pilih satu amal terkait ${tema} yang paling dekat dengan keadaan kita: memperbaiki shalat tepat waktu, meminta maaf kepada keluarga, mengembalikan amanah, atau membantu tetangga yang sedang kesulitan. Amal yang kecil tetapi dijaga dengan ikhlas lebih dicintai daripada semangat sesaat yang cepat padam.`
      }
    ],
    [
      {
        title: "Ketika Amal Tidak Lagi Sekadar Ucapan",
        body: `Ma'asyiral muslimin rahimakumullah, banyak orang mudah berbicara tentang ${tema}, tetapi Islam menghendaki bukti. Bukti itu tampak pada keberanian menundukkan ego, kesediaan memperbaiki diri, dan kejujuran saat tidak ada yang mengawasi.`
      },
      {
        title: "Memperbaiki yang Paling Dekat",
        body: "Sering kali amal terbaik dimulai dari ruang yang paling dekat: rumah, meja kerja, jalan yang kita lewati, dan orang-orang yang setiap hari berinteraksi dengan kita. Jangan sampai kita tampak saleh di hadapan orang jauh, tetapi keras kepada keluarga sendiri dan abai kepada tetangga."
      },
      {
        title: "Bekal Sebelum Pulang kepada Allah",
        body: "Setiap Jumat mengingatkan kita bahwa usia berjalan menuju akhir. Yang akan menemani bukan pujian manusia, bukan jabatan, bukan jumlah pengikut, melainkan amal yang diterima Allah. Karena itu, mari memperbanyak amal yang ikhlas dan memperbaiki amal yang selama ini tercampur riya, lalai, atau meremehkan hak sesama."
      }
    ]
  ];

  const fitriSets = [
    [
      {
        title: "Menjaga Cahaya Ramadhan",
        body: `Jamaah Idul Fitri rahimakumullah, hari ini kita bergembira, tetapi kegembiraan seorang mukmin tidak berhenti pada pakaian baru dan hidangan yang tersaji. Kemenangan hakiki adalah ketika nilai ${tema} membuat hati lebih lapang, lisan lebih lembut, dan ibadah Ramadhan tetap berbekas setelah Syawal berjalan.`
      },
      {
        title: "Maaf yang Menguatkan Silaturahmi",
        body: "Idul Fitri mengajarkan keberanian untuk merendahkan hati. Ada luka yang perlu disembuhkan, ada hubungan yang perlu disambung, dan ada ego yang perlu dikalahkan. Orang yang menang bukan yang paling keras mempertahankan gengsi, tetapi yang paling cepat kembali kepada ridha Allah."
      }
    ]
  ];

  const adhaSets = [
    [
      {
        title: "Tauhid yang Menundukkan Ego",
        body: `Jamaah Idul Adha rahimakumullah, gema takbir mengingatkan kita bahwa hanya Allah Yang Mahabesar. Jika Allah yang terbesar, maka ego, harta, jabatan, dan kenyamanan harus tunduk. Tema ${tema} mengajak kita belajar dari keluarga Nabi Ibrahim tentang ketaatan yang tidak berhenti pada kata-kata.`
      },
      {
        title: "Kurban dan Kepedulian Sosial",
        body: "Ibadah kurban mendidik kita agar tidak memelihara sifat kikir. Daging kurban dibagikan, hati dilembutkan, dan jarak sosial diperkecil. Seorang muslim tidak cukup saleh sendirian; ia harus membawa manfaat bagi keluarga, tetangga, dan masyarakat."
      }
    ]
  ];

  const sets = jenis === "idul-fitri" ? fitriSets : jenis === "idul-adha" ? adhaSets : jumatSets;
  return pick(sets, seed, 12);
}

function audienceFor(jenis: string, language: SupportedLanguage) {
  if (language === "Jawa") {
    if (jenis === "idul-fitri") return "Jamaah Idul Fitri ingkang dipun rahmati Allah";
    if (jenis === "idul-adha") return "Jamaah Idul Adha ingkang dipun rahmati Allah";
    return "Jamaah shalat Jumat ingkang dipun rahmati Allah";
  }

  if (language === "Sunda") {
    if (jenis === "idul-fitri") return "Jamaah Idul Fitri anu dipikarahmat ku Allah";
    if (jenis === "idul-adha") return "Jamaah Idul Adha anu dipikarahmat ku Allah";
    return "Jamaah shalat Jumat anu dipikarahmat ku Allah";
  }

  if (language === "Arab") {
    if (jenis === "idul-fitri") return "أَيُّهَا الْمُسْلِمُوْنَ فِيْ عِيْدِ الْفِطْرِ رَحِمَكُمُ اللهُ";
    if (jenis === "idul-adha") return "أَيُّهَا الْمُسْلِمُوْنَ فِيْ عِيْدِ الْأَضْحَى رَحِمَكُمُ اللهُ";
    return "أَيُّهَا الْمُسْلِمُوْنَ فِيْ صَلَاةِ الْجُمُعَةِ رَحِمَكُمُ اللهُ";
  }

  if (jenis === "idul-fitri") return "Jamaah Idul Fitri rahimakumullah";
  if (jenis === "idul-adha") return "Jamaah Idul Adha rahimakumullah";
  return "Jamaah shalat Jumat rahimakumullah";
}

function takwaIntroFor(language: SupportedLanguage) {
  if (language === "Jawa") {
    return "mangga kita sami ningkataken takwa dhumateng Allah kanthi nindakaken dhawuhipun lan nebihi awisanipun. Takwa boten namung katon wonten ibadah ageng, nanging ugi wonten cara kita njagi manah, lisan, kulawarga, lan amanah.";
  }

  if (language === "Sunda") {
    return "hayu urang sami ningkatkeun takwa ka Allah ku ngalaksanakeun parentah-Na jeung ngajauhan larangan-Na. Takwa henteu ngan katempo dina ibadah anu gede, tapi oge dina cara urang ngajaga hate, lisan, kulawarga, jeung amanah.";
  }

  if (language === "Arab") {
    return "فَلْنَزْدَدْ تَقْوًى لِلّٰهِ بِامْتِثَالِ أَوَامِرِهِ وَاجْتِنَابِ نَوَاهِيْهِ؛ فَالتَّقْوَى لَا تَظْهَرُ فِيْ الْعِبَادَاتِ الْكَبِيْرَةِ فَحَسْبُ، بَلْ فِيْ حِفْظِ الْقَلْبِ وَاللِّسَانِ وَالْأَهْلِ وَالْأَمَانَةِ.";
  }

  return "marilah kita meningkatkan ketakwaan kepada Allah dengan menjalankan perintah-Nya dan menjauhi larangan-Nya. Ketakwaan bukan hanya tampak dalam ibadah yang besar, tetapi juga dalam cara kita menjaga hati, lisan, keluarga, dan amanah.";
}

function practicalStepsFor(language: SupportedLanguage, tema: string, dalilLabel = "takwa dan amal saleh") {
  const label = normalizedTopic(dalilLabel);

  if (language === "Indonesia" && (isPrayerTheme(tema) || label.includes("shalat"))) {
    return [
      "Pilih satu shalat sunah yang paling mudah dijaga pekan ini, seperti qabliyah Subuh, Dhuha dua rakaat, atau Witir sebelum tidur.",
      "Jangan menjadikan shalat sunah sebagai alasan meremehkan shalat fardhu; rapikan yang wajib, lalu kuatkan dengan nawafil.",
      "Ajak keluarga menghidupkan rumah dengan shalat sunah, walau singkat, agar rumah terbiasa dengan dzikir dan sujud."
    ];
  }

  if (language === "Indonesia" && label.includes("sabar")) {
    return [
      "Saat marah atau kecewa, tahan reaksi pertama: diam sejenak, berwudhu, shalat, lalu baru berbicara.",
      "Hadapi ujian dengan ikhtiar yang halal; jangan mencari jalan pintas yang merusak iman atau menyakiti orang lain.",
      "Perbanyak doa dan shalat ketika beban terasa berat, karena sabar perlu ditopang oleh kedekatan kepada Allah."
    ];
  }

  if (language === "Indonesia" && (label.includes("amanah") || label.includes("kejujuran"))) {
    return [
      "Tepati janji kecil hari ini, karena amanah besar dibangun dari kebiasaan menjaga perkara kecil.",
      "Kembalikan hak orang lain, baik berupa uang, barang, waktu, rahasia, maupun tanggung jawab pekerjaan.",
      "Jangan menutup kesalahan dengan dusta baru; akui, perbaiki, dan bangun kembali kepercayaan dengan konsisten."
    ];
  }

  if (language === "Indonesia" && (label.includes("sedekah") || label.includes("zakat") || label.includes("infak"))) {
    return [
      "Sisihkan sedekah rutin sebelum menunggu sisa, walaupun jumlahnya kecil.",
      "Dahulukan keluarga, tetangga, atau orang dekat yang benar-benar membutuhkan bantuan.",
      "Jaga adab saat memberi: jangan merendahkan, jangan mengungkit, dan jangan melukai kehormatan penerima."
    ];
  }

  if (language === "Indonesia" && label.includes("syukur")) {
    return [
      "Sebutkan satu nikmat yang sering dianggap biasa, lalu gunakan nikmat itu untuk taat.",
      "Ucapkan terima kasih kepada manusia yang menjadi jalan kebaikan, karena itu bagian dari syukur kepada Allah.",
      "Jangan memakai nikmat untuk maksiat; jadikan kesehatan, waktu, dan rezeki sebagai jalan amal."
    ];
  }

  if (language === "Indonesia" && (label.includes("muharram") || label.includes("asyura") || label.includes("bulan haram") || label.includes("hijriah"))) {
    return [
      "Rencanakan puasa sunnah di bulan Muharram, terutama Tasu'a 9 Muharram dan Asyura 10 Muharram bila mampu.",
      "Jadikan bulan haram sebagai latihan menahan diri dari maksiat, kezaliman, permusuhan, dan kebiasaan yang merusak hati.",
      "Gunakan awal tahun Hijriah untuk muhasabah: pilih satu dosa yang ditinggalkan dan satu amal yang dijaga lebih konsisten."
    ];
  }

  if (language === "Indonesia" && (label.includes("taubat") || label.includes("istighfar"))) {
    return [
      "Berhenti dari dosa yang paling dekat hari ini, lalu tutup pintu yang biasa menyeret kita kembali kepadanya.",
      "Perbanyak istighfar dengan hati yang menyesal, bukan sekadar lisan yang bergerak.",
      "Jika pernah mengambil hak manusia, kembalikan atau minta maaf sesuai kemampuan."
    ];
  }

  if (language === "Indonesia" && (label.includes("lisan") || label.includes("akhlak"))) {
    return [
      "Tunda komentar ketika emosi, terutama di pesan singkat dan media sosial.",
      "Pastikan ucapan kita benar, perlu, dan disampaikan dengan cara yang baik.",
      "Hentikan ghibah dan kabar yang belum jelas, karena lisan adalah amanah yang dicatat."
    ];
  }

  if (language === "Jawa") {
    return [
      "Miwiti saking satunggal amal alit ingkang saged dipun jagi dinten punika, amargi istiqamah asring tuwuh saking langkah ingkang boten awrat nanging ajeg.",
      "Ndandosi sesambetan kaliyan tiyang paling celak; kathah kabecikan ageng kawiwitan saking griya ingkang langkung tentrem lan lisan ingkang langkung alus.",
      `Dadosaken ${tema} minangka ukuran nalika njupuk keputusan: punapa pilihan kita nyedhakaken dhumateng Allah utawi namung menangaken ego sedhela.`
    ];
  }

  if (language === "Sunda") {
    return [
      "Mimitian tina hiji amal leutik anu bisa dijaga dinten ieu, sabab istiqamah mindeng tumuwuh tina lengkah anu henteu beurat tapi terus diulang.",
      "Benerkeun hubungan jeung jalma anu pangdeukeutna; seueur kahadean gede mimiti tina imah anu leuwih tenang jeung lisan anu leuwih lemes.",
      `Jadikeun ${tema} minangka ukuran nalika nyokot kaputusan: naha pilihan urang ngadeukeutkeun ka Allah atawa ngan saukur meunangkeun ego sakedapan.`
    ];
  }

  if (language === "Arab") {
    return [
      "اِبْدَأْ بِعَمَلٍ صَغِيْرٍ تَقْدِرُ عَلَى الْمُحَافَظَةِ عَلَيْهِ الْيَوْمَ؛ فَالثَّبَاتُ يَنْمُوْ مِنْ خُطْوَةٍ سَهْلَةٍ مُتَكَرِّرَةٍ.",
      "أَصْلِحْ عَلَاقَتَكَ بِالْأَقْرَبِيْنَ؛ فَكَثِيْرٌ مِنَ الْخَيْرِ يَبْدَأُ مِنْ بَيْتٍ أَهْدَأَ وَلِسَانٍ أَلْطَفَ.",
      `اِجْعَلْ ${tema} مِقْيَاسًا عِنْدَ اتِّخَاذِ الْقَرَارِ: أَيُقَرِّبُنَا مِنَ اللهِ، أَمْ يُرْضِيْ أَنَانِيَّةً عَابِرَةً؟`
    ];
  }

  return [
    "Mulailah dari satu amal kecil yang bisa dijaga hari ini, karena istiqamah sering tumbuh dari langkah yang tidak berat tetapi terus diulang.",
    "Perbaiki hubungan dengan orang terdekat; banyak kebaikan besar justru bermula dari rumah yang lebih tenang dan lisan yang lebih lembut.",
    `Jadikan ${tema} sebagai ukuran saat mengambil keputusan: apakah pilihan kita mendekatkan kepada Allah atau hanya memenangkan ego sesaat.`
  ];
}

function finalClosingFor(jenis: string, language: SupportedLanguage) {
  const isJumat = jenis === "khutbah-jumat";

  if (language === "Jawa") {
    return isJumat
      ? "Mugi Allah nampi ibadah Jumat kita, nglancaraken rezeki ingkang halal, njagi kulawarga kita, lan neguhaken kita wonten ing ketaatan. Amin ya rabbal 'alamin."
      : "Mugi Allah nampi ibadah kita, ndandosi manah kita, lan ndadosaken dinten riyaya punika margi tumuju takwa ingkang langkung kiyat. Amin ya rabbal 'alamin.";
  }

  if (language === "Sunda") {
    return isJumat
      ? "Mugia Allah nampi ibadah Jumat urang, ngalapangan rezeki anu halal, ngajaga kulawarga urang, jeung nguatkeun urang dina ketaatan. Amin ya rabbal 'alamin."
      : "Mugia Allah nampi ibadah urang, ngalereskeun hate urang, jeung ngajadikeun poe raya ieu jalan kana takwa anu leuwih kuat. Amin ya rabbal 'alamin.";
  }

  if (language === "Arab") {
    return isJumat
      ? "نَسْأَلُ اللهَ أَنْ يَتَقَبَّلَ جُمُعَتَنَا، وَأَنْ يُبَارِكَ فِيْ أَرْزَاقِنَا الْحَلَالِ، وَأَنْ يَحْفَظَ أُسَرَنَا، وَأَنْ يُثَبِّتَنَا عَلَى الطَّاعَةِ. آمِيْنَ يَا رَبَّ الْعَالَمِيْنَ."
      : "نَسْأَلُ اللهَ أَنْ يَتَقَبَّلَ عِبَادَتَنَا، وَأَنْ يُصْلِحَ قُلُوْبَنَا، وَأَنْ يَجْعَلَ هٰذَا الْعِيْدَ طَرِيْقًا إِلَى تَقْوَى أَقْوَى. آمِيْنَ يَا رَبَّ الْعَالَمِيْنَ.";
  }

  return isJumat
    ? "Semoga Allah menerima ibadah Jumat kita, melapangkan rezeki yang halal, menjaga keluarga kita, dan meneguhkan kita di atas ketaatan. Amin ya rabbal 'alamin."
    : "Semoga Allah menerima ibadah kita, memperbaiki hati kita, dan menjadikan hari raya ini jalan menuju ketakwaan yang lebih kokoh. Amin ya rabbal 'alamin.";
}

function indonesianKhutbahDeepeningFor(jenis: string, tema: string, dalilLabel: string) {
  const label = normalizedTopic(dalilLabel);

  if (jenis === "idul-fitri") {
    return `Jamaah Idul Fitri rahimakumullah, hari raya ini mempertemukan kita dengan keluarga, tetangga, dan saudara yang mungkin lama tidak saling menyapa. Maka tema ${tema} tidak cukup menjadi ucapan di bibir; ia harus menjadi keberanian untuk membuka pintu maaf, menghubungi yang renggang, dan menyambung kembali hubungan yang pernah retak.

Silaturahmi bukan sekadar datang berkunjung, bersalaman, lalu berfoto bersama. Silaturahmi adalah melembutkan hati, menahan kalimat yang menyakitkan, menghargai perbedaan, dan tidak menjadikan masa lalu sebagai alasan untuk terus menjauh. Setelah Ramadhan melatih kita menahan lapar dan hawa nafsu, Syawal menguji apakah hati kita cukup lapang untuk memaafkan.

Maka pada hari yang mulia ini, pilihlah satu hubungan yang perlu diperbaiki. Mungkin dengan orang tua, saudara kandung, kerabat jauh, tetangga, atau teman lama. Mulailah dengan salam, doa, permintaan maaf, atau bantuan kecil yang tulus. Jangan tunggu semua luka hilang sempurna untuk memulai kebaikan.

Di akhir khutbah pertama ini, mari kita memohon agar Allah menjadikan Idul Fitri bukan hanya hari berganti pakaian, tetapi hari berganti sikap: dari keras menjadi lembut, dari jauh menjadi dekat, dari gengsi menjadi rendah hati, dan dari dendam menuju rahmat Allah.`;
  }

  if (jenis === "idul-adha") {
    return `Jamaah Idul Adha rahimakumullah, hari raya kurban mengajarkan bahwa ketaatan selalu meminta pengorbanan. Tema ${tema} tidak cukup disebut sebagai kisah masa lalu; ia harus menjadi cermin untuk melihat apa yang hari ini masih terlalu kita cintai hingga berat dikorbankan di jalan Allah.

Nabi Ibrahim dan Nabi Ismail mengajarkan bahwa cinta kepada Allah harus berada di atas ego, harta, kenyamanan, dan ambisi pribadi. Kurban bukan hanya menyembelih hewan, tetapi juga menyembelih kesombongan, sifat kikir, dan keengganan berbagi kepada sesama.

Maka pada hari raya ini, dekatkan diri kepada Allah dengan ketaatan yang nyata: tunaikan amanah, bantu orang yang membutuhkan, bahagiakan keluarga, dan jadikan rezeki sebagai jalan manfaat. Jangan biarkan takbir hanya menggema di lisan, sementara hati masih tunduk kepada ego.

Di akhir khutbah pertama ini, mari kita memohon agar Allah menerima kurban dan amal kita, melembutkan hati kita, serta menjadikan kita hamba yang taat seperti keluarga Nabi Ibrahim yang mulia.`;
  }

  if (label.includes("sabar")) {
    return `Ketika tema ${tema} disebut dari mimbar, yang kita tuju bukan hanya mengagumi orang yang tabah, tetapi belajar menjadi hamba yang tetap lurus saat diuji. Sabar harus tampak ketika musibah datang, ketika doa belum terjawab, ketika keluarga belum sesuai harapan, dan ketika pekerjaan menghadirkan tekanan.

Jangan ukur sabar hanya dari wajah yang tenang. Ukurlah dari pilihan yang tetap halal, lisan yang tidak mencela takdir, hati yang terus berdoa, dan kaki yang tetap melangkah menuju shalat. Sabar seperti inilah yang membuat ujian tidak sia-sia.

Maka mulai hari ini, saat ada masalah, jangan langsung meledak. Ambil jeda. Ingat Allah. Pilih kalimat yang tidak menyakiti. Ambil keputusan yang tidak menyesal di akhirat. Dari latihan-latihan kecil itu, tema ${tema} menjadi akhlak yang hidup.

Di akhir khutbah pertama ini, mari kita memohon agar Allah menjadikan kita hamba yang sabar tanpa kehilangan ikhtiar, tegar tanpa menjadi keras hati, dan kuat tanpa merasa cukup dari pertolongan-Nya.`;
  }

  if (label.includes("amanah") || label.includes("kejujuran")) {
    return `Ketika tema ${tema} disebut dari mimbar, ukurannya bukan banyaknya kata tentang integritas, tetapi keberanian menjaga kepercayaan saat tidak ada yang melihat. Amanah harus tampak dalam pekerjaan, janji, transaksi, jabatan, dan cara kita memperlakukan hak orang lain.

Jangan biarkan dosa amanah dianggap biasa hanya karena banyak orang melakukannya. Mengurangi timbangan, mengulur tugas, memanipulasi laporan, membocorkan rahasia, dan berdusta untuk menyelamatkan diri adalah pintu-pintu kecil menuju kerusakan besar.

Maka mulailah dari hal yang paling dekat: tepatilah janji, selesaikan tanggung jawab, kembalikan titipan, dan berhentilah mencari alasan untuk hal yang jelas keliru. Dari amanah kecil yang dijaga, Allah membentuk jiwa yang dapat dipercaya.

Di akhir khutbah pertama ini, mari kita memohon agar Allah membersihkan rezeki kita, meluruskan lisan kita, dan menjadikan kita hamba yang amanah di rumah, di tempat kerja, dan di tengah masyarakat.`;
  }

  if (label.includes("sedekah") || label.includes("zakat") || label.includes("infak")) {
    return `Ketika tema ${tema} disebut dari mimbar, jangan biarkan hati hanya menghitung kekurangan diri sendiri. Lihatlah saudara yang kesulitan, tetangga yang menahan lapar, anak yang butuh pendidikan, dan keluarga yang memerlukan pertolongan.

Sedekah mendidik kita bahwa harta bukan hanya untuk disimpan, tetapi untuk menjadi jalan rahmat. Semakin hati terbiasa memberi, semakin ia lepas dari cengkeraman kikir dan takut miskin yang berlebihan.

Maka mulailah dengan sedekah yang rutin, meski kecil. Jaga adab saat memberi. Jangan menunggu kaya untuk peduli, karena kepedulian sering dimulai dari kepekaan, bukan dari jumlah yang besar.

Di akhir khutbah pertama ini, mari kita memohon agar Allah menjadikan harta kita halal, berkah, dan mengalir sebagai kebaikan bagi orang-orang yang membutuhkan.`;
  }

  if (label.includes("syukur")) {
    return `Ketika tema ${tema} disebut dari mimbar, jangan hanya mengingat nikmat besar yang jarang datang. Ingatlah napas, kesehatan, keluarga, makanan, waktu, dan kesempatan bertaubat. Banyak nikmat hilang nilainya karena terlalu sering kita anggap biasa.

Syukur yang benar membuat seseorang lebih taat, bukan lebih sombong. Ia memakai nikmat untuk mendekat kepada Allah, bukan untuk bermaksiat. Ia berterima kasih kepada manusia, tetapi hatinya tetap tahu bahwa sumber semua kebaikan adalah Allah.

Maka latihlah syukur dengan tindakan: gunakan waktu untuk ibadah, gunakan lisan untuk kebaikan, gunakan rezeki untuk menolong, dan gunakan ilmu untuk membimbing. Dari situ, tema ${tema} menjadi kebiasaan hidup.

Di akhir khutbah pertama ini, mari kita memohon agar Allah menjauhkan kita dari kufur nikmat dan memasukkan kita ke dalam golongan hamba-hamba yang pandai bersyukur.`;
  }

  return `Ketika tema ${tema} disebut dari mimbar, yang dituju bukan hanya pengetahuan di kepala. Yang lebih penting adalah apakah tema itu menyentuh hati, menuntun keputusan, dan mengubah cara kita memperlakukan keluarga, tetangga, rekan kerja, serta masyarakat.

Kadang seseorang merasa sudah cukup karena hadir di masjid dan mendengarkan khutbah. Padahal Jumat meminta lebih dari itu. Jumat mengajak kita pulang dengan tekad baru: ada sikap yang perlu diperbaiki, ada hak yang perlu dijaga, ada ibadah yang perlu dirapikan, dan ada dosa yang perlu ditinggalkan.

Maka jangan menunggu perubahan besar yang sulit dimulai. Mulailah dari amal yang paling dekat dengan tema ${tema}. Dari langkah kecil yang dijaga, nasihat mimbar berubah menjadi cahaya yang menuntun kehidupan.

Di akhir khutbah pertama ini, mari setiap kita memilih satu niat yang jelas dan satu amal yang bisa dimulai hari ini.`;
}

function khutbahDeepeningFor(jenis: string, language: SupportedLanguage, tema: string, dalilLabel = "takwa dan amal saleh") {
  if (language === "Indonesia") return indonesianKhutbahDeepeningFor(jenis, tema, dalilLabel);

  if (language === "Jawa") {
    return `Nalika tema ${tema} dipun sebat wonten mimbar, ingkang dipun tuju boten namung pangertosan wonten pikiran. Ingkang langkung wigati inggih punapa tema punika saged nyentuh manah, nuntun keputusan, lan nggantos cara kita tumindak dhateng kulawarga, tangga teparo, lan masyarakat.

Kadhang kala tiyang ngraos sampun cekap amargi sampun rawuh wonten masjid lan mireng khutbah. Nanging Jumat nyuwun langkung saking punika. Jumat ngajak kita wangsul kanthi tekad anyar: wonten tembung ingkang kedah dipun rem, wonten janji ingkang kedah dipun tepati, wonten hak tiyang sanes ingkang kedah dipun jaga, lan wonten ibadah ingkang kedah dipun rapikaken.

Mila sampun ngentosi owah-owahan ageng ingkang angel dipun wiwiti. Miwitia saking amal ingkang celak: ngendika langkung alus dhateng kulawarga, nyambut damel kanthi jujur, nyisihaken rezeki kangge nulungi, lan ngresiki manah saking iri saha dendam. Saking mriku tema ${tema} dados cahya ingkang nuntun lampah.

Ing pungkasan khutbah kapisan punika, mangga saben-saben kita milih satunggal niat ingkang cetha. Sinten ingkang lisanipun asring nglarani, miwitia kanthi ngempet tembung. Sinten ingkang amanahipun kadhang kesupen, miwitia kanthi netepi janji alit. Sinten ingkang ibadahipun durung ajeg, miwitia kanthi njagi shalat wonten wekdalipun.`;
  }

  if (language === "Sunda") {
    return `Nalika tema ${tema} disebat dina mimbar, anu dituju lain ukur pangaweruh dina pikiran. Anu leuwih penting nyaeta naha tema ieu bisa nyentuh hate, nungtun kaputusan, jeung ngarobah cara urang ka kulawarga, tatangga, jeung masyarakat.

Kadang jalma ngarasa cekap sabab parantos sumping ka masjid jeung ngadenge khutbah. Tapi Jumat nungtut leuwih ti eta. Jumat ngajak urang balik mawa tekad anyar: aya kecap anu kudu ditahan, aya jangji anu kudu ditepati, aya hak batur anu kudu dijaga, jeung aya ibadah anu kudu dirapihkeun.

Ku kituna ulah nungguan parobahan gede anu hese dimimitian. Mimitian tina amal anu pangdeukeutna: nyarios leuwih lemes ka kulawarga, damel kalayan jujur, nyisihkeun rezeki pikeun nulungan, jeung ngabersihan hate tina dengki sarta dendam. Ti dinya tema ${tema} jadi cahaya anu nungtun lengkah.

Dina tungtung khutbah kahiji ieu, hayu unggal urang milih hiji niat anu jelas. Anu lisanna mindeng nganyenyeri, mimitian ku nahan kecap. Anu amanahna kadang kapopohokeun, mimitian ku netepan jangji leutik. Anu ibadahna can ajeg, mimitian ku ngajaga shalat dina waktuna.`;
  }

  if (language === "Arab") {
    return `عِنْدَمَا نَذْكُرُ مَوْضُوْعَ ${tema} عَلَى الْمِنْبَرِ، فَلَيْسَ الْمَقْصُوْدُ أَنْ يَبْقَى مَعْلُوْمَةً فِي الذِّهْنِ فَقَطْ، بَلْ أَنْ يَمَسَّ الْقَلْبَ، وَيَهْدِيَ الْقَرَارَ، وَيُغَيِّرَ طَرِيْقَةَ تَعَامُلِنَا مَعَ الْأَهْلِ وَالْجِيْرَانِ وَالنَّاسِ.

قَدْ يَظُنُّ بَعْضُ النَّاسِ أَنَّهُ أَدَّى مَا عَلَيْهِ لِأَنَّهُ حَضَرَ الْمَسْجِدَ وَسَمِعَ الْخُطْبَةَ. وَلٰكِنَّ الْجُمُعَةَ تَدْعُوْنَا إِلَى أَكْثَرَ مِنْ ذٰلِكَ: إِلَى كَلِمَةٍ نَحْبِسُهَا، وَوَعْدٍ نَفِيْ بِهِ، وَحَقٍّ نَحْفَظُهُ، وَعِبَادَةٍ نُحْسِنُهَا.

فَلَا نَنْتَظِرْ تَغْيِيْرًا كَبِيْرًا يَصْعُبُ بَدْؤُهُ، وَلْنَبْدَأْ بِالْأَقْرَبِ: لِسَانٍ أَلْطَفَ مَعَ الْأَهْلِ، وَعَمَلٍ أَصْدَقَ، وَنَفَقَةٍ تَرْحَمُ الْمُحْتَاجَ، وَقَلْبٍ يَتَطَهَّرُ مِنَ الْحَسَدِ وَالضَّغِيْنَةِ.

وَفِيْ خِتَامِ هٰذِهِ الْخُطْبَةِ الْأُوْلَى، لِيَخْتَرْ كُلُّ وَاحِدٍ مِنَّا نِيَّةً وَاضِحَةً: مَنْ كَانَ لِسَانُهُ يُؤْذِيْ فَلْيَبْدَأْ بِالصَّمْتِ عَنِ الشَّرِّ، وَمَنْ ضَعُفَتْ أَمَانَتُهُ فَلْيَبْدَأْ بِوَعْدٍ صَغِيْرٍ يَفِيْ بِهِ، وَمَنْ تَرَاخَتْ عِبَادَتُهُ فَلْيَبْدَأْ بِصَلَاةٍ فِيْ وَقْتِهَا.`;
  }

  return `Ketika tema ${tema} disebut dari mimbar, yang dituju bukan hanya pengetahuan di kepala. Yang lebih penting adalah apakah tema itu menyentuh hati, menuntun keputusan, dan mengubah cara kita memperlakukan keluarga, tetangga, rekan kerja, serta masyarakat.

Kadang seseorang merasa sudah cukup karena hadir di masjid dan mendengarkan khutbah. Padahal Jumat meminta lebih dari itu. Jumat mengajak kita pulang dengan tekad baru: ada kata yang perlu ditahan, ada janji yang harus ditepati, ada hak orang lain yang wajib dijaga, dan ada ibadah yang perlu dirapikan.

Maka jangan menunggu perubahan besar yang sulit dimulai. Mulailah dari amal yang paling dekat: berbicara lebih lembut kepada keluarga, bekerja dengan jujur, menyisihkan rezeki untuk menolong, dan membersihkan hati dari iri serta dendam. Dari titik-titik kecil itu, tema ${tema} menjadi cahaya yang menuntun langkah.

Di akhir khutbah pertama ini, mari setiap kita memilih satu niat yang jelas. Yang lisannya sering melukai, mulailah dengan menahan kata. Yang amanahnya kadang terabaikan, mulailah dengan menepati janji kecil. Yang ibadahnya belum rapi, mulailah dengan menjaga shalat pada waktunya.`;
}

function secondKhutbahReminderFor(language: SupportedLanguage, tema: string) {
  if (language === "Jawa") {
    return `Jamaah ingkang dipun rahmati Allah, ing khutbah kaping kalih punika kita sami ngencengaken malih wasiat takwa. Aja ngantos tema ${tema} namung mandheg wonten pangraos sakedhap, nanging dados niat anyar nalika wangsul dhateng griya, nyambut damel, lan sesrawungan kaliyan tiyang sanes.

Takwa ingkang kita bangun kedah ngasilaken lisan ingkang langkung alus, keputusan ingkang langkung jujur, lan manah ingkang langkung gampil nyuwun pangapunten. Menawi wonten kalepatan, enggal-enggal wangsul dhumateng Allah; menawi wonten kesempatan sae, sampun dipun tundha.`;
  }

  if (language === "Sunda") {
    return `Jamaah anu dipikarahmat ku Allah, dina khutbah kadua ieu urang nguatkeun deui wasiat takwa. Ulah nepi ka tema ${tema} eureun saukur jadi rasa sakedapan, tapi kudu jadi niat anyar nalika balik ka imah, damel, jeung hirup babarengan jeung batur.

Takwa anu urang bangun kedah ngahasilkeun lisan anu leuwih lemes, kaputusan anu leuwih jujur, jeung hate anu leuwih gampang menta hampura. Lamun aya kalepatan, geura balik ka Allah; lamun aya kasempetan hade, ulah ditunda.`;
  }

  if (language === "Arab") {
    return `أَيُّهَا الْمُسْلِمُوْنَ رَحِمَكُمُ اللهُ، فِيْ هٰذِهِ الْخُطْبَةِ الثَّانِيَةِ نُجَدِّدُ وَصِيَّةَ التَّقْوَى، فَلَا يَنْبَغِيْ أَنْ يَبْقَى مَوْضُوْعُ ${tema} شُعُوْرًا عَابِرًا، بَلْ لِيَكُنْ نِيَّةً جَدِيْدَةً نَحْمِلُهَا إِلَى بُيُوْتِنَا وَأَعْمَالِنَا وَمُعَامَلَاتِنَا.

إِنَّ التَّقْوَى الَّتِيْ نَرْجُوْهَا تُثْمِرُ لِسَانًا أَلْطَفَ، وَقَرَارًا أَصْدَقَ، وَقَلْبًا أَسْرَعَ إِلَى التَّوْبَةِ. فَمَنْ وَجَدَ فِيْ نَفْسِهِ تَقْصِيْرًا فَلْيَرْجِعْ إِلَى اللهِ، وَمَنْ فُتِحَ لَهُ بَابُ خَيْرٍ فَلَا يُؤَخِّرْهُ.`;
  }

  return `Jamaah yang dirahmati Allah, pada khutbah kedua ini kita menguatkan kembali wasiat takwa. Jangan sampai tema ${tema} berhenti sebagai rasa sesaat, tetapi jadikan ia niat baru ketika kita pulang ke rumah, bekerja, dan bergaul dengan sesama.

Takwa yang kita bangun harus melahirkan lisan yang lebih lembut, keputusan yang lebih jujur, dan hati yang lebih cepat meminta ampun. Jika ada kesalahan, segeralah kembali kepada Allah; jika ada kesempatan berbuat baik, jangan ditunda.`;
}

const secondKhutbahArabicVariants = [
`إِنَّ الْحَمْدَ للهِ نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ، وَنَعُوْذُ بِاللهِ مِنْ شُرُوْرِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللهُ فَلَا مُضِلَّ لَهُ وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيْكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.

إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ، يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا.

اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ. وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ.

أُوْصِيْكُمْ وَإِيَّايَ بِتَقْوَى اللهِ، فَاتَّقُوا اللهَ حَقَّ تُقَاتِهِ، وَلَا تَمُوْتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُوْنَ.

الدُّعَاءُ
اللَّهُمَّ اغْفِرْ لَنَا وَلِلْمُؤْمِنِيْنَ وَالْمُؤْمِنَاتِ وَالْمُسْلِمِينَ وَالْمُسْلِمَاتِ، وَأَلِّفْ بَيْنَ قُلُوْبِهِمْ، وَأَصْلِحْ ذَاتَ بَيْنِهِمْ، وَانْصُرْهُمْ عَلَى عَدُوِّكَ وَعَدُوِّهِمْ.

اللَّهُمَّ أَعِزَّ الْإِسْلَامَ وَالْمُسْلِمِيْنَ، وَأَذِلَّ الشِّرْكَ وَالْمُشرِكِيْنَ، وَدَمِّرْ أَعْدَاءَكَ أَعْدَاءَ الدِّيْنِ.

اللَّهُمَّ خَالِفْ بَيْنَ كَلِمِهِمْ، وَزَلْزِلْ أَقْدَامَهُمْ، وَأَنْزِلْ بِهِمْ بَأْسَكَ الَّذِي لَا تَرُدُّهُ عَنِ الْقَوْمِ الْمُجْرِمِيْنَ.

اللَّهُمَّ الْعَنِ الْكَفَرَةَ الَّذِيْنَ يَصُدُّوْنَ عَنْ سَبِيْلِكَ، وَيُكَذِّبُوْنَ رُسُلَكَ، وَيُقَاتِلُوْنَ أَوْلِيَاءَكَ.

اللَّهُمَّ إِيَّاكَ نَعْبُدُ، وَلَكَ نُصَلِّي وَنَسْجُدُ، وَإِلَيْكَ نَسْعَى وَنَحْفِدُ، نَرْجُوْ رَحْمَتَكَ وَنَخْشَى عَذَابَكَ، إِنَّ عَذَابَكَ بِالْكُفَّارِ مُلْحِقٌ.

اللَّهُمَّ انْصُرْ إِخْوَانَنَا الْمُسْلِمِيْنَ الْإِيْغُوْرَ الْمَظْلُوْمِيْنَ فِي الصِّيْنِ.

اللَّهُمَّ انْصُرْ إِخْوَانَنَا الْمُضْطَهَدِيْنَ الْمَظْلُوْمِيْنَ فِي سُوْرِيَا.

اللَّهُمَّ انْصُرْ إِخْوَانَنَا الْمُضْطَهَدِيْنَ الْمَظْلُوْمِيْنَ فِي كُلِّ مَكَانٍ.

اللَّهُمَّ انْصُرْهُمْ نَصْرًا مُؤَزَّرًا، اللَّهُمَّ انْصُرْهُمْ نَصْرًا مُؤَزَّرًا، اللَّهُمَّ انْصُرْهُمْ نَصْرًا مُؤَزَّرًا.

اللَّهُمَّ انْصُرِ الْمُجَاهِدِيْنَ فِيْ سَبِيْلِكَ، اللَّهُمَّ انْصُرِ الْمُجَاهِدِيْنَ فِيْ سَبِيْلِكَ، اللَّهُمَّ انْصُرِ الْمُجَاهِدِيْنَ فِيْ سَبِيْلِكَ.

اللَّهُمَّ زِدْنَا وَلَا تَنْقُصْنَا، وَأَكْرِمْنَا وَلَا تُهِنَّا، وَأَعْطِنَا وَلَا تَحْرِمْنَا، وَآثِرْنَا وَلَا تُؤْثِرْ عَلَيْنَا، وَارْضِنَا وَارْضَ عَنَّا.

اللَّهُمَّ إِنِّي أَعُوذُ بِرِضَاكَ مِنْ سَخَطِكَ، وَبِمُعَافَاتِكَ مِنْ عُقُوبَتِكَ، وَبِكَ مِنْكَ، لَا أُحْصِي ثَنَاءً عَلَيْكَ، أَنْتَ كَمَا أَثْنَيْتَ عَلَى نَفْسِكَ.

وَصَلَّ اللَّهُمَّ وَسَلِّمْ وَبَارِكْ عَلَى عَبْدِكَ وَرَسُوْلِكَ مُحَمَّدٍ، وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِيْنَ.`,
`إِنَّ الْحَمْدَ للهِ نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ، وَنَعُوْذُ بِاللهِ مِنْ شُرُوْرِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللهُ فَلَا مُضِلَّ لَهُ وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيْكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.

إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ، يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا.

اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ. وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ.

أُوْصِيْكُمْ وَنَفْسِيْ بِتَقْوَى اللهِ، فَقَدْ فَازَ الْمُتَّقُوْنَ.

رَبَّنَا اغْفِرْ لَنَا وَلِلْمُسْلِمِيْنَ وَالْمُسْلِمَاتِ، وَالْمُؤْمِنِيْنَ وَالْمُؤْمِنَاتِ اَلْأَحْيَاءِ مِنْهُمْ وَالْأَمْوَاتِ، إِنَّكَ سَمِيْعٌ قَرِيْبٌ مُجِيْبُ الدَّعَوَاتِ.

رَبَّنَا اغْفِرْ لَنَا وَلِوَالِدِيْنَا وَارْحَمْهُمْ كَمَا رَبَّوْنَا صِغَارًا.

اَللَّهُمَّ أَعِزَّ الْإِسْلَامَ وَالْمُسْلِمِيْنَ، وَأَذِلَّ الشِّرْكَ وَالْمُشْرِكِيْنَ، وَدَمِّرْ أَعْدَاءَ الدِّيْنِ.

اَللَّهُمَّ أَصْلِحْ أَحْوَالَ الْمُسْلِمِيْنَ حُكَّامًا وَمَحْكُوْمِيْنَ، يَا رَبَّ الْعَالَمِيْنَ، اَللَّهُمَّ اشْفِ مَرْضَانَا وَمَرْضَاهُمْ، وَفُكَّ أَسْرَانَا وَأَسْرَاهُمْ، وَاغْفِرْ لِمَوْتَانَا وَمَوْتَاهُمْ، وَأَلِّفْ بَيْنَ قُلُوْبِهِمْ يَا أَرْحَمَ الرَّاحِمِيْنَ.

اَللَّهُمَّ آتِ نُفُوْسَنَا تَقْوَاهَا، وَزَكِّهَا أَنْتَ خَيْرُ مَنْ زَكَّاهَا، أَنْتَ وَلِيُّهَا وَمَوْلَاهَا، اَللَّهُمَّ حَبِّبْ إِلَيْنَا الْإِيْمَانَ وَزَيِّنْهُ فِي قُلُوْبِنَا، وَكَرِّهْ إِلَيْنَا الْكُفْرَ وَالْفُسُوْقَ وَالْعِصْيَانَ، وَاجْعَلْنَا مِنَ الرَّاشِدِيْنَ.

رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.

عِبَادَ اللهِ، إِنَّ اللهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَى وَيَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَالْبَغْيِ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُوْنَ.

وَاذْكُرُوْا اللهَ الْعَظِيْمَ الْجَلِيْلَ يَذْكُرْكُمْ، وَأَقِمِ الصَّلَاةَ.`,
`إِنَّ الْحَمْدَ لِلّٰهِ، نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ، وَنَعُوْذُ بِاللّٰهِ مِنْ شُرُوْرِ أَنْفُسِنَا، مَنْ يَهْدِ اللّٰهُ فَلَا مُضِلَّ لَهُ، وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ، وَأَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيْكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.

اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ. وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ.

أُوْصِيْكُمْ وَإِيَّايَ نَفْسِيْ بِتَقْوَى اللَّهِ فَقَدْ فَازَ الْمُتَّقُوْنَ.

اللَّهُمَّ اغْفِرْ لِلْمُؤْمِنِيْنَ وَالْمُؤْمِنَاتِ، وَالْمُسْلِمِيْنَ وَالْمُسْلِمَاتِ اَلْأَحْيَاءِ مِنْهُمْ وَالْأَمْوَاتِ إِنَّكَ سَمِيْعٌ قَرِيْبٌ مُجِيْبُ الدَّعَوَاتِ. اللَّهُمَّ أَلِّفْ بَيْنَ قُلُوْبِهِمْ وَأَصْلِحْ ذَاتَ بَيْنِهِمْ وَانْصُرْهُمْ عَلَى عَدُوِّكَ وَعَدُوِّهِمْ.

اللَّهُمَّ أَرِنَا الْحَقَّ حَقًّا، وَارْزُقْنَا اتِّبَاعَهُ، وَأَرِنَا الْبَاطِلَ بَاطِلًا، وَارْزُقْنَا اجْتِنَابَهُ، وَلَا تَجْعَلْهُ مُلْتَبِسًا عَلَيْنَا فَنَضِلَّ.

رَبَّنَا آتِنَا فِى الدُّنْيَا حَسَنَةً وَفِى الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.

وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِيْنَ.`,
`إِنَّ الْحَمْدَ لِلَّهِ نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ وَنَعُوْذُ بِاللهِ مِنْ شُرُوْرِ أَنْفُسِنَا وَسَيّئَاتِ أَعْمَالِنَا مَنْ يَهْدِهِ اللهُ فَلَا مُضِلَّ لَهُ وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ. أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ. وَالصَّلَاةُ وَالسَّلَامُ عَلَى مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ.

فَيَا عِبَادَ اللهِ أُوْصِيْ نَفْسِيْ وَإِيَّاكُمْ بِتَقْوَى اللهِ، فَقَدْ فَازَ الْمُتَّقُوْنَ.

قَالَ اللهُ تَعَالَى فِيْ كِتَابِهِ الْكَرِيْمِ، بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ. يَا أَيُّهَا الَّذِيْنَ آمَنُوْا اتَّقُوا اللهَ حَقَّ تُقَاتِهِ وَلَا تَمُوْتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُوْنَ.

إِنَّ اللهَ وَمَلَائِكَتَهُ يُصَلُّوْنَ عَلَى النَّبِيِّ، يَا أَيُّهَا الَّذِيْنَ آمَنُوْا صَلُّوْا عَلَيْهِ وَسَلِّمُوْا تَسْلِيْمًا.

اَللّٰهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ. وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ.

رَبَّنَا اغْفِرْ لَنَا وَلِلْمُسْلِمِيْنَ وَالْمُسْلِمَاتِ، وَالْمُؤْمِنِيْنَ وَالْمُؤْمِنَاتِ اَلْأَحْيَاءِ مِنْهُمْ وَالْأَمْوَاتِ، إِنَّكَ سَمِيْعٌ قَرِيْبٌ مُجِيْبُ الدَّعَوَاتِ. رَبَّنَا اغْفِرْ لَنَا وَلِوَالِدِيْنَا وَارْحَمْهُمْ كَمَا رَبَّوْنَا صِغَارًا.

اَللّٰهُمَّ أَرِنَا الْحَقَّ حَقًّا وَارْزُقْنَا اتِّبَاعَهُ، وَأَرِنَا الْبَاطِلَ بَاطِلًا وَارْزُقْنَا اجْتِنَابَهُ.

رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِيْنَ إِمَامًا.

اَللّٰهُمَّ أَعِزَّ الْإِسْلَامَ وَالْمُسْلِمِيْنَ، وَأَذِلَّ الشِّرْكَ وَالْمُشْرِكِيْنَ، وَدَمِّرْ أَعْدَاءَ الدِّيْنِ.

اَللّٰهُمَّ ادْفَعْ عَنَّا الْغَلَاءَ وَالْبَلَاءَ وَالْوَبَاءَ وَالْفَحْشَاءَ وَالْمُنْكَرَ، وَالسُّيُوْفَ الْمُخْتَلِفَةَ وَالشَّدَائِدَ وَالْمِحَنَ، مَا ظَهَرَ مِنْهَا وَمَا بَطَنَ مِنْ بَلَدِنَا هَذَا خَاصَّةً وَمِنْ بُلْدَانِ الْمُسْلِمِيْنَ عَامَّةً، إِنَّكَ عَلَى كُلِّ شَيْئٍ قَدِيْرٌ.

اَللّٰهُمَّ أَصْلِحْ أَحْوَالَ الْمُسْلِمِيْنَ حُكَّامًا وَمَحْكُوْمِيْنَ، يَا رَبَّ الْعَالَمِيْنَ، اَللّٰهُمَّ اشْفِ مَرْضَانَا وَمَرْضَاهُمْ، وَفُكَّ أَسْرَانَا وَأَسْرَاهُمْ، وَاغْفِرْ لِمَوْتَانَا وَمَوْتَاهُمْ، وَأَلِّفْ بَيْنَ قُلُوْبِهِمْ يَا أَرْحَمَ الرَّاحِمِيْنَ.

رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.

عِبَادَ اللهِ، إِنَّ اللهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيْتَاءِ ذِي الْقُرْبَى وَيَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَالْبَغْيِ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُوْنَ. وَاذْكُرُوا اللهَ الْعَظِيْمَ الْجَلِيْلَ يَذْكُرْكُمْ، وَأَقِمِ الصَّلَاةَ.`,
`إِنَّ الْحَمْدَ للهِ نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ، وَنَعُوْذُ بِاللهِ مِنْ شُرُوْرِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللهُ فَلَا مُضِلَّ لَهُ وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيْكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.

عِبَادَ اللهِ، أُوْصِيْكُمْ وَنَفْسِيْ بِتَقْوَى اللهِ عَزَّ وَجَلَّ حَيْثُ قَالَ تَبَارَكَ وَتَعَالَى، يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُونَ.

إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ، يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا.

اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ. وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَعَلَى آلِ إِبْرَاهِيْمَ، إِنَّكَ حَمِيْدٌ مَجِيْدٌ.

اَللَّهُمَّ أَصْلِحْ أَئِمَّتَنَا وَوُلَاةَ أُمُوْرِنَا، اَللَّهُمَّ وَفِّقْ وُلَاةَ أُمُوْرِنَا لِإِقَامَةِ دِيْنِكَ وَشَرِيْعَتِكَ وَإِزَالَةِ الْمَلَاهِي وَالْمُنْكَرَاتِ، وَإِظْهَارِ الْمَحَاسِنَ وَأَنْوَاعِ الْخَيْرَاتِ.

اَللَّهُمَّ أَصْلِحْ شَبَابَ الْمُسْلِمِيْنَ، اَللَّهُمَّ أَصْلِحْ شَبَابَ الْمُسْلِمِيْنَ، اَللَّهُمَّ بَغِّضْ إِلَيْهِمُ الْكُفْرَ وَالْفُسُوْقَ وَالْعِصْيَانَ، وَاجْعَلْهُمْ مِنَ الرَّاشِدِيْنَ يَا رَبَّ الْعَالَمِيْنَ.

اَللَّهُمَّ إِنَّا نَعُوْذُ بِكَ مِنَ الْفَوَاحِشِ وَالْفِتَنِ؛ مَا ظَهَرَ مِنْهَا، وَمَا بَطَنَ، اَللَّهُمَّ احْفَظْ عَلَيْنَا وَعَلَى أَهْلِيْنَا وَأَوْلَادِنَا وَإِخْوَانِنَا الدِّيْنَ وَالنَّفْسَ وَالْعِرْضَ، وَحُسْنَ الْأَخْلَاقِ، يَا رَحِيْمُ يَا كَرِيْمُ.

اَللَّهُمَّ إِنَّا نَسْأَلُكَ بِأَنَّكَ أَنْتَ اللهُ، لَا إِلَهَ إِلَّا أَنْتَ الْمَنَّانُ، بَدِيْعُ السَّمَاوَاتِ وَالْأَرْضِ، يَا ذَا الْجَلَالِ وَالْإِكْرَامِ، اَللَّهُمَّ انْصُرِ الْمُجَاهِدِيْنَ فِي سَبِيْلِكَ فِي كُلِّ مَكَانٍ، اَللَّهُمَّ انْصُرْهُمْ نَصْرًا مُؤَزَّرًا، اَللَّهُمَّ ارْبِطْ عَلَى قُلُوْبِهِمْ، وَثَبِّتْ أَقْدَامَهُمْ.

اَللَّهُمَّ أَنْجِ الْمُسْتَضْعَفِيْنَ الْمُسْلِمِيْنَ فِي كُلِّ مَكَانٍ، اَللَّهُمَّ احْقِنْ دِمَاءَهُمْ وَآمِنْ رَوْعَاتِهِمْ، وَاسْتُرْ عَوْرَاتِهِمْ وَاحْفَظْهُمْ يَا كَرِيْمُ يَا مَنَّانُ.

رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.

عِبَادَ اللهِ، إِنَّ اللهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيْتَاءِ ذِي الْقُرْبَى وَيَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَالْبَغْيِ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُوْنَ.

وَاذْكُرُوْا اللهَ الْعَظِيْمَ الْجَلِيْلَ يَذْكُرْكُمْ، وَأَقِمِ الصَّلَاةَ.`,
`إِنَّ الْحَمْدَ لِلهِ، نَحْمَدُهُ وَنَسْتَعِيْنُهُ وَنَسْتَغْفِرُهُ وَنَعُوْذُ بِاللهِ مِنْ شُرُوْرِ أَنْفُسِنَا وَسَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللهُ فَلَا مُضِلَّ لَهُ، وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ وَأَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيْكَ لَهُ وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ.

عِبَادَ اللهِ، أُوْصِيْكُمْ وَنَفْسِيْ بِتَقْوَى اللهِ عَزَّ وَجَلَّ حَيْثُ قَالَ تَبَارَكَ وَتَعَالَى، أَعُوْذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيْمِ:

يَا أَيُّهَا الَّذِيْنَ آمَنُوا اتَّقُوا اللهَ حَقَّ تُقَاتِهِ وَلَا تَمُوْتُنَّ إِلَّا وَأَنْتُمْ مُّسْلِمُوْنَ.

إِنَّ اللهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ يَا أَيُّهَا الَّذِيْنَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيْمًا.

اَللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ، وَارْضَ اللَّهُمَّ عَنْ خُلَفَائِهِ الرَّاشِدِيْنَ الَّذِيْنَ قَضَوْا بِالْحَقِّ وَبِهِ كَانُوْا يَعْدِلُوْنَ: أَبِي بَكْرٍ، وَعُمَرَ، وَعُثْمَانَ، وَعَليٍّ، وَعَنْ سَائِرِ الصَّحَابَةِ أَجْمَعِيْنَ، وَعَنَّا مَعَهُمْ بِجُوْدِكَ وَكَرَمِكَ يَا أَكْرَمَ الْأَكْرَمِيْنَ.

اَللَّهُمَّ أَعِزَّ الْإِسْلَامَ وَالْمُسْلِمِيْنَ، وَأَذِلَّ الشِّرْكَ وَالْمُشْرِكِيْنَ، وَدَمِّرْ أَعْدَاءَ الدِّيْنَ، وَاجْعَلِ اللَّهُمَّ هَذَا الْبَلَدَ آمِنًا مُطْمَئِنًّا رَخَاءً وَسَائِرَ بِلَادِ الْمُسْلِمِيْنَ.

اللَّهُمَّ إِنَّا نَعُوذُ بِكَ مِنْ عَذَابِ النَّارِ، وَنَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، وَنَعُوذُ بِكَ مِنَ الْفِتَنِ مَا ظَهَرَ مِنْهَا وَمَا بَطَنَ، وَنَعُوذُ بِكَ مِنْ فِتْنَةِ الدَّجالِ.

اللَّهُمَّ إِنَّا نَسْألُكَ مُوْجِباتِ رَحْمَتِكَ، وَعَزائِمَ مَغْفِرَتِكَ، وَالسَّلامَةَ مِنْ كُلِّ إثمٍ، وَالغَنِيمَةَ مِنْ كُلِّ بِرٍّ، وَالفَوْزَ بِالجَنَّةِ، وَالنَّجاةَ مِنَ النَّارِ.

رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ إِنَّ عَذَابَهَا كَانَ غَرَامًا. إِنَّهَا سَاءَتْ مُسْتَقَرًّا وَمُقَامًا. رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ.

رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ. اَللَّهُمَّ إِنَّا نَسْأَلُكَ الْإِخْلَاصَ فِي الْقَوْلِ وَالْعَمَلِ.

عِبَادَ اللهِ، إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَى وَيَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَالْبَغْيِ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ.

فَاذْكُرُوْا اللهَ الْعَظِيْمَ الْجَلِيْلَ يَذْكُرْكُمْ، وَاشْكُرُوْهُ عَلَى آلَائِهِ وَنِعَمِهِ يَزِدْكُمْ، وَلَذِكْرُ اللهِ أَكْبَرُ، وَاللهُ يَعْلَمُ مَا تَصْنَعُوْنَ.`
];

function secondKhutbahArabicOnly(opening = "", seed = "") {
  const normalizedOpening = opening ? `${opening}\n\n` : "";
  return `${normalizedOpening}${pick(secondKhutbahArabicVariants, seed, 31)}`;
}

function generalIntroFor(jenis: string, language: SupportedLanguage, tema: string) {
  const isKultum = jenis === "kultum";

  if (language === "Jawa") {
    return isKultum
      ? `Wonten wekdal cekak punika, mangga kita cepeng satunggal pesen: ${tema} kedah katon wonten tumindak alit ingkang ajeg.`
      : `Hadirin ingkang dipun rahmati Allah, gesang kita asring lumampah kanthi cepet. Wonten tengah kesibukan punika, tema ${tema} ngajak kita kendel sakedhap, nata manah, lan nyuwun pirsa: sampun dados akhlak nyata dereng ilmu ingkang kita mirengaken?`;
  }

  if (language === "Sunda") {
    return isKultum
      ? `Dina waktos singget ieu, hayu urang nyekel hiji pesen: ${tema} kudu katempo dina lampah leutik anu konsisten.`
      : `Hadirin anu dirahmati Allah, hirup urang mindeng gerak gancang. Di tengah kasibukan eta, tema ${tema} ngajak urang eureun sakedap, nata hate, jeung naros: naha ilmu anu urang denge parantos jadi akhlak anu katingali?`;
  }

  if (language === "Arab") {
    return isKultum
      ? `فِيْ هٰذَا الْوَقْتِ الْقَصِيْرِ نَحْمِلُ رِسَالَةً وَاحِدَةً: إِنَّ ${tema} يَنْبَغِيْ أَنْ يَظْهَرَ فِيْ عَمَلٍ صَغِيْرٍ مُسْتَمِرٍّ.`
      : `أَيُّهَا الْحَاضِرُوْنَ رَحِمَكُمُ اللهُ، تَمْضِيْ حَيَاتُنَا سَرِيْعَةً، وَمَوْضُوْعُ ${tema} يَدْعُوْنَا إِلَى وَقْفَةٍ صَادِقَةٍ: هَلْ صَارَ الْعِلْمُ الَّذِيْ نَسْمَعُهُ خُلُقًا يُرَى؟`;
  }

  return isKultum
    ? `Dalam waktu singkat ini, mari kita pegang satu pesan: ${tema} harus tampak dalam tindakan yang kecil tetapi konsisten.`
    : `Hadirin yang dirahmati Allah, kehidupan kita sering bergerak cepat. Di tengah kesibukan itu, tema ${tema} mengajak kita berhenti sejenak, menata hati, dan bertanya: sudahkah ilmu yang kita dengar berubah menjadi akhlak yang terlihat?`;
}

function reflectionFor(language: SupportedLanguage, seed: string) {
  if (language === "Jawa") {
    return pick(
      [
        "Wonten tiyang ingkang kalah boten amargi kirang ilmu, nanging amargi boten maringi papan kangge manahipun tunduk. Piyambakipun mangertos ingkang leres, nanging nundha nindakaken.",
        "Kabecikan asring boten mbetahaken panggung ageng. Kabecikan rawuh nalika kita nahan lisan, netepi janji, ngapura, lan tetep jujur nalika boten wonten ingkang muji.",
        "Saben dinten Allah maringi kesempatan anyar. Kalepatan wingi boten kedah dados jati dhiri dinten punika menawi kita purun taubat lan ndandosi langkah."
      ],
      seed,
      25
    );
  }

  if (language === "Sunda") {
    return pick(
      [
        "Aya jalma anu eleh lain sabab kurang ilmu, tapi sabab henteu mere tempat pikeun hatena tunduk. Anjeunna terang nu bener, tapi nunda ngalaksanakeunana.",
        "Kahadean mindeng henteu butuh panggung gede. Eta hadir nalika urang nahan lisan, netepan jangji, ngahampura, jeung tetep jujur nalika teu aya anu muji.",
        "Unggal dinten Allah masihan kasempetan anyar. Kasalahan kamari henteu kudu jadi jati diri ayeuna lamun urang daek tobat jeung ngalereskeun lengkah."
      ],
      seed,
      25
    );
  }

  if (language === "Arab") {
    return pick(
      [
        "قَدْ يَخْسَرُ الْإِنْسَانُ لَا لِقِلَّةِ عِلْمِهِ، بَلْ لِأَنَّهُ لَا يَفْتَحُ قَلْبَهُ لِلْخُضُوْعِ؛ يَعْرِفُ الْحَقَّ ثُمَّ يُؤَخِّرُ الْعَمَلَ بِهِ.",
        "لَا تَحْتَاجُ الْخَيْرَاتُ دَائِمًا إِلَى مَشْهَدٍ كَبِيْرٍ؛ فَهِيَ تَظْهَرُ فِيْ حِفْظِ اللِّسَانِ، وَالْوَفَاءِ بِالْعَهْدِ، وَالْعَفْوِ، وَالصِّدْقِ.",
        "كُلُّ يَوْمٍ يَفْتَحُ اللهُ لَنَا فُرْصَةً جَدِيْدَةً؛ فَخَطَأُ الْأَمْسِ لَا يَنْبَغِيْ أَنْ يَصِيْرَ هُوِيَّةَ الْيَوْمِ إِذَا صَدَقْنَا فِي التَّوْبَةِ."
      ],
      seed,
      25
    );
  }

  return pick(
    [
      "Ada orang yang kalah bukan karena kurang ilmu, tetapi karena tidak memberi ruang bagi hatinya untuk tunduk. Ia tahu yang benar, namun menunda melakukannya.",
      "Kebaikan sering tidak membutuhkan panggung besar. Ia hadir saat kita menahan lisan, menepati janji, memaafkan, dan tetap jujur ketika tidak ada yang memuji.",
      "Setiap hari Allah memberi kesempatan baru. Kesalahan kemarin tidak harus menjadi identitas hari ini jika kita mau bertaubat dan memperbaiki langkah."
    ],
    seed,
    25
  );
}

function reflectionClosingFor(language: SupportedLanguage) {
  if (language === "Jawa") {
    return "Mila ukuran kasilipun majelis boten namung pinten ukara ingkang kita mirengaken, nanging sepira jujur kita nggawa satunggal owah-owahan.";
  }
  if (language === "Sunda") {
    return "Ku kituna ukuran hasilna majelis lain ukur sabaraha seueur kecap anu urang denge, tapi sabaraha jujur urang mawa hiji parobahan.";
  }
  if (language === "Arab") {
    return "فَمِقْيَاسُ نَفْعِ الْمَجْلِسِ لَيْسَ كَثْرَةَ الْكَلِمَاتِ، بَلْ صِدْقُ التَّغْيِيْرِ الَّذِيْ نَحْمِلُهُ بَعْدَهُ.";
  }
  return "Karena itu, ukuran keberhasilan majelis bukan hanya seberapa banyak kalimat yang kita dengar, tetapi seberapa jujur kita membawa pulang satu perubahan.";
}

function generalKeyPointsFor(language: SupportedLanguage, tema: string) {
  if (language === "Jawa") {
    return [
      "Miwiti saking dhiri piyambak sadurunge nyuwun tiyang sanes owah.",
      "Jagi lisan, amargi kathah tatu lair saking tembung ingkang boten dipun timbang.",
      `Pilih satunggal amal alit gegayutan kaliyan ${tema}, lajeng jagi kanthi istiqamah.`
    ];
  }

  if (language === "Sunda") {
    return [
      "Mimitian tina diri sorangan samemeh nungtut batur robah.",
      "Jaga lisan, sabab seueur kanyeri lahir tina kecap anu henteu ditimbang.",
      `Pilih hiji amal leutik anu aya hubunganana jeung ${tema}, tuluy jaga kalayan istiqamah.`
    ];
  }

  if (language === "Arab") {
    return [
      "اِبْدَأْ بِنَفْسِكَ قَبْلَ أَنْ تُطَالِبَ غَيْرَكَ بِالتَّغْيِيْرِ.",
      "اِحْفَظْ لِسَانَكَ، فَكَثِيْرٌ مِنَ الْجُرُوْحِ يَخْرُجُ مِنْ كَلِمَةٍ غَيْرِ مَوْزُوْنَةٍ.",
      `اِخْتَرْ عَمَلًا صَغِيْرًا يَتَّصِلُ بِمَوْضُوْعِ ${tema}، ثُمَّ دَاوِمْ عَلَيْهِ.`
    ];
  }

  return [
    "Mulai dari diri sendiri sebelum menuntut orang lain berubah.",
    "Jaga lisan, karena banyak luka lahir dari kata-kata yang tidak ditimbang.",
    `Pilih satu amal kecil terkait ${tema}, lalu jaga dengan istiqamah.`
  ];
}

function generalClosingFor(language: SupportedLanguage) {
  if (language === "Jawa") {
    return "Mugi Allah nglembutaken manah kita, ngiyataken langkah kita, lan ndadosaken ilmu ingkang kita mirengaken minangka amal ingkang dipun tampi. Amin ya rabbal 'alamin.";
  }
  if (language === "Sunda") {
    return "Mugia Allah ngalembutkeun hate urang, nguatkeun lengkah urang, jeung ngajadikeun ilmu anu urang denge minangka amal anu ditampi. Amin ya rabbal 'alamin.";
  }
  if (language === "Arab") {
    return "نَسْأَلُ اللهَ أَنْ يُلَيِّنَ قُلُوْبَنَا، وَأَنْ يُقَوِّيَ خُطَانَا، وَأَنْ يَجْعَلَ عِلْمَنَا عَمَلًا مَقْبُوْلًا. آمِيْنَ يَا رَبَّ الْعَالَمِيْنَ.";
  }
  return "Semoga Allah melembutkan hati kita, menguatkan langkah kita, dan menjadikan ilmu yang kita dengar sebagai amal yang diterima. Amin ya rabbal 'alamin.";
}

function indonesianKultumThemeApplication(tema: string, dalilLabel: string) {
  const normalizedLabel = normalizedTopic(dalilLabel);

  if (normalizedLabel.includes("syukur")) {
    return `Pada tema ${tema}, ukuran paling dekat adalah cara kita memandang nikmat. Syukur bukan hanya ucapan "alhamdulillah" ketika rezeki bertambah, tetapi juga kemampuan memakai nikmat untuk taat. Mata disyukuri dengan menjaga pandangan, lisan disyukuri dengan ucapan baik, kesehatan disyukuri dengan ibadah dan membantu orang lain, sedangkan waktu disyukuri dengan tidak membiarkannya habis untuk kelalaian. Orang yang bersyukur tidak selalu memiliki hidup yang mudah, tetapi ia mampu melihat kebaikan Allah di tengah keadaan yang berbeda-beda.

Langkah praktisnya sederhana. Setiap hari sebutkan satu nikmat yang sering kita anggap biasa, lalu gunakan nikmat itu untuk kebaikan. Jika diberi keluarga, syukuri dengan lebih sabar kepada mereka. Jika diberi pekerjaan, syukuri dengan amanah. Jika diberi makanan, ingat saudara yang kekurangan. Dengan begitu, syukur tidak berhenti menjadi kalimat, tetapi berubah menjadi akhlak.`;
  }

  if (normalizedLabel.includes("muharram") || normalizedLabel.includes("asyura") || normalizedLabel.includes("bulan haram") || normalizedLabel.includes("hijriah")) {
    return `Pada tema ${tema}, yang perlu ditekankan adalah bahwa Muharram termasuk bulan haram yang dimuliakan Allah. Maka amalan di bulan ini bukan sekadar ucapan selamat tahun baru, melainkan memperbanyak ketaatan dan menahan diri dari kezaliman terhadap diri sendiri. Jamaah perlu diajak memahami bahwa waktu yang dimuliakan Allah seharusnya melahirkan rasa hormat, kehati-hatian, dan kesungguhan memperbaiki amal.

Amalan yang paling jelas dalilnya adalah memperbanyak puasa sunnah di bulan Muharram. Di antara yang paling utama adalah puasa Asyura pada 10 Muharram, dengan harapan Allah menghapus dosa setahun sebelumnya, serta dianjurkan menambah puasa Tasu'a pada 9 Muharram. Selain itu, Muharram menjadi momentum muhasabah: menutup tahun dengan istighfar, membuka waktu baru dengan niat yang lurus, memperbaiki shalat, memperbanyak dzikir, sedekah, dan meninggalkan kebiasaan dosa.`;
  }

  if (normalizedLabel.includes("sabar")) {
    return `Pada tema ${tema}, yang perlu dikuatkan adalah cara kita menghadapi ujian. Sabar bukan berarti tidak sedih dan tidak lelah. Sabar berarti hati tetap mencari ridha Allah saat keadaan tidak sesuai harapan. Ada orang diuji dengan sakit, ada yang diuji dengan ekonomi, ada yang diuji dengan keluarga, ada pula yang diuji dengan menunggu jawaban doa. Dalam semua keadaan itu, sabar menjaga kita agar tidak berkata buruk kepada Allah dan tidak mengambil jalan yang haram.

Langkah praktisnya adalah menahan reaksi pertama, memperbanyak shalat dan doa, lalu memilih ikhtiar yang halal. Ketika marah, diam sejenak. Ketika kecewa, kembalikan urusan kepada Allah. Ketika berat, jangan menjauh dari majelis dan orang saleh. Sabar yang dijaga seperti ini akan membuat ujian menjadi jalan kedewasaan iman.`;
  }

  if (normalizedLabel.includes("sedekah") || normalizedLabel.includes("zakat") || normalizedLabel.includes("infak")) {
    return `Pada tema ${tema}, yang disentuh adalah kepedulian hati. Sedekah bukan hanya tentang jumlah uang, tetapi tentang kesediaan melihat kebutuhan orang lain. Kadang yang dibutuhkan saudara kita adalah makanan, biaya sekolah, bantuan berobat, atau sekadar perhatian saat ia sedang kesulitan. Harta yang dikeluarkan di jalan Allah tidak hilang; ia berpindah menjadi keberkahan, pelindung, dan saksi kebaikan.

Langkah praktisnya adalah membuat sedekah menjadi kebiasaan, bukan hanya sisa. Sisihkan bagian kecil secara rutin, bantu orang terdekat yang benar-benar membutuhkan, dan jaga adab agar sedekah tidak melukai penerimanya. Jika belum mampu dengan harta, bantu dengan tenaga, waktu, ilmu, atau ucapan yang menguatkan.`;
  }

  if (normalizedLabel.includes("taubat") || normalizedLabel.includes("istighfar")) {
    return `Pada tema ${tema}, pintu yang paling besar adalah harapan kepada rahmat Allah. Taubat bukan tanda seseorang buruk, tetapi tanda ia masih ingin kembali. Jangan biarkan dosa membuat hati putus asa. Selama nyawa belum sampai di tenggorokan dan matahari belum terbit dari barat, Allah masih membuka pintu ampunan bagi hamba yang jujur menyesal dan mau memperbaiki diri.

Langkah praktisnya adalah berhenti dari dosa, menyesal, beristighfar, lalu mengganti kebiasaan buruk dengan amal yang baik. Jika pernah menyakiti manusia, minta maaf atau kembalikan haknya. Jika sering lalai, mulai dengan amal kecil yang konsisten. Taubat yang benar tidak hanya menangis sesaat, tetapi mengubah arah hidup sedikit demi sedikit.`;
  }

  if (normalizedLabel.includes("amanah") || normalizedLabel.includes("kejujuran")) {
    return `Pada tema ${tema}, iman diuji dalam hal-hal yang sering dianggap kecil. Amanah tampak ketika seseorang menjaga titipan, menepati janji, jujur dalam pekerjaan, tidak mengambil hak orang lain, dan tidak menyalahgunakan kepercayaan. Banyak kerusakan lahir bukan karena kurang ilmu, tetapi karena amanah disepelekan. Padahal Allah memerintahkan amanah dikembalikan kepada pemiliknya.

Langkah praktisnya adalah mulai dari janji kecil. Jika berjanji hadir, hadirlah. Jika diberi tugas, selesaikan dengan benar. Jika memegang uang atau barang orang lain, jagalah. Jika berbicara, jangan berdusta untuk mencari selamat. Amanah yang dijaga dalam perkara kecil akan membentuk pribadi yang dapat dipercaya dalam perkara besar.`;
  }

  if (normalizedLabel.includes("orang tua") || normalizedLabel.includes("keluarga")) {
    return `Pada tema ${tema}, amal yang paling dekat sering ada di rumah sendiri. Berbakti kepada orang tua bukan hanya memberi uang, tetapi juga menjaga ucapan, mendoakan, menemani, dan tidak membuat hati mereka terluka. Kadang seseorang ramah kepada orang jauh, tetapi keras kepada ayah dan ibunya. Padahal ridha Allah sangat terkait dengan keridhaan orang tua selama tidak memerintahkan maksiat.

Langkah praktisnya adalah menghubungi orang tua, meminta doa, membantu kebutuhan mereka, dan menahan ucapan yang kasar. Jika orang tua telah wafat, lanjutkan bakti dengan doa, sedekah atas nama mereka, menyambung silaturahmi keluarga, dan menjaga nama baik mereka.`;
  }

  if (normalizedLabel.includes("lisan") || normalizedLabel.includes("akhlak")) {
    return `Pada tema ${tema}, amal yang paling sering diuji adalah ucapan. Lisan bisa menjadi jalan pahala, tetapi juga bisa menjadi sumber luka. Satu kalimat dapat menenangkan orang, dan satu kalimat juga dapat merusak hubungan. Karena itu, orang beriman tidak menganggap ucapan sebagai perkara ringan. Ia menimbang sebelum berbicara, bertanya apakah kalimatnya benar, perlu, dan membawa kebaikan.

Langkah praktisnya adalah menunda komentar ketika marah, menghindari ghibah, tidak menyebarkan kabar yang belum jelas, dan membiasakan kalimat yang menenangkan. Jika tidak mampu berkata baik, diam menjadi ibadah yang menyelamatkan.`;
  }

  return `Pada tema ${tema}, jangan berhenti pada pemahaman umum. Hubungkan nasihat ini dengan keadaan yang benar-benar kita hadapi: ibadah harian, hubungan dengan keluarga, pekerjaan, pergaulan, dan cara mengambil keputusan. Tema ini harus menjadi cermin yang membuat kita bertanya, bagian mana dari hidup yang perlu dibenahi mulai hari ini.

Langkah praktisnya adalah memilih satu amal yang paling dekat dengan tema ${tema}. Jangan terlalu banyak rencana sampai tidak ada yang dimulai. Pilih satu kebiasaan, jaga selama beberapa hari, lalu tambah perlahan. Perubahan yang kecil tetapi konsisten lebih dicintai daripada semangat besar yang cepat hilang.`;
}

function kultumExpansionFor(language: SupportedLanguage, tema: string, dalilLabel: string) {
  if (language === "Jawa") {
    return `Ingkang kapisan, ${tema} kedah dipun wiwiti saking pangraos bilih Allah tansah mirsani. Nalika tiyang namung ngukur amal saking pandangan manungsa, piyambakipun gampil kesel lan gampil kuciwa. Nanging nalika amal dipun sambungaken kaliyan ridha Allah, perkara alit dados migunani. Esem dhateng kulawarga, nahan tembung kasar, rawuh tepat wekdal, lan netepi janji alit saged dados dalan kabecikan ingkang ageng.

Ingkang kaping kalih, aja ngentosi swasana sampurna kangge miwiti owah. Kathah tiyang kepengin dados langkung sae, nanging tansah ngentosi wekdal longgar, ati tentrem, utawi masalah rampung rumiyin. Padahal gesang boten tansah maringi kahanan ingkang becik. Wonten tengah repot, kesel, lan kathah tanggungan, kita saged milih satunggal amal ingkang paling cedhak kaliyan tema ${tema}, lajeng dipun jagi kanthi ajeg.

Ingkang kaping tiga, damel ukuran ingkang prasaja. Menawi dinten punika kita saged langkung sabar tinimbang wingi, punika sampun dados kemajuan. Menawi lisan ingkang biyen cepet nyalahaken saged dipun tahan, punika tandha manah wiwit sinau. Menawi janji alit saged dipun tepati, punika bibit amanah. Allah boten nyia-nyiakaken upaya hamba ingkang tulus sanajan katon alit ing mripat manungsa.

Mila sasampunipun kultum cekak punika, mangga kita boten namung matur, "isinipun sae." Pilih satunggal tumindak. Saderengipun tilem, nyuwun pangapunten dhateng Allah. Sesuk enjing, wiwiti kanthi niat ingkang langkung resik. Ing griya, lembutaken tembung. Ing papan kerja, jujuraken amanah. Ing masjid, jaga shalat lan paseduluran. Saking amal alit ingkang ajeg, Allah saged mbikak lawang hidayah ingkang langkung jembar.`;
  }

  if (language === "Sunda") {
    return `Kahiji, ${tema} kedah dimimitian tina kasadaran yen Allah salawasna ningali. Lamun jalma ngan ukur ngukur amal tina panempo manusa, manehna gampang cape jeung gampang kuciwa. Tapi lamun amal disambungkeun jeung ridha Allah, perkara leutik jadi boga nilai. Seuri ka kulawarga, nahan kecap kasar, datang tepat waktu, jeung netepan jangji leutik tiasa jadi jalan kahadean anu gede.

Kadua, ulah nungguan kaayaan sampurna pikeun ngamimitian robah. Seueur jalma hoyong langkung sae, tapi teras nungguan waktu lega, hate tenang, atawa masalah rengse heula. Padahal hirup henteu salawasna masihan kaayaan anu ideal. Di tengah cape, repot, jeung tanggungan, urang masih tiasa milih hiji amal anu pangdeukeutna jeung tema ${tema}, tuluy dijaga kalayan istiqamah.

Katilu, jieun ukuran anu basajan. Lamun dinten ieu urang tiasa langkung sabar tibatan kamari, eta parantos jadi kamajuan. Lamun lisan anu biasana gancang nyalahkeun tiasa ditahan, eta tanda hate mimiti diajar. Lamun jangji leutik tiasa ditepati, eta bibit amanah. Allah henteu nyia-nyiakeun usaha hamba anu tulus sanajan katingalina leutik dina panempo manusa.

Ku kituna saatos kultum singget ieu, hayu ulah ngan ukur nyarios, "eusina sae." Pilih hiji lampah. Samemeh sare, menta hampura ka Allah. Isuk-isuk, mimitian ku niat anu langkung bersih. Di bumi, lemeskeun ucapan. Di padamelan, jujur dina amanah. Di masjid, jaga shalat jeung duduluran. Tina amal leutik anu ajeg, Allah tiasa muka panto hidayah anu langkung lega.`;
  }

  if (language === "Arab") {
    return `أَوَّلًا، إِنَّ مَوْضُوْعَ ${tema} يَبْدَأُ مِنْ مُرَاقَبَةِ اللهِ تَعَالَى. فَمَنْ جَعَلَ عَمَلَهُ لِنَظَرِ النَّاسِ تَعِبَ وَضَاقَ صَدْرُهُ، وَمَنْ جَعَلَهُ لِرِضَا اللهِ وَجَدَ فِي الْعَمَلِ الصَّغِيْرِ بَرَكَةً. فَالْكَلِمَةُ الطَّيِّبَةُ، وَحِفْظُ اللِّسَانِ، وَصِدْقُ الْوَعْدِ، وَالرِّفْقُ بِالْأَهْلِ، كُلُّهَا أَبْوَابٌ إِلَى الْخَيْرِ.

ثَانِيًا، لَا نَنْتَظِرْ حَالًا كَامِلَةً لِنَبْدَأَ التَّغْيِيْرَ. كَثِيْرٌ مِنَ النَّاسِ يُرِيْدُ الصَّلَاحَ، وَلٰكِنَّهُ يُؤَخِّرُهُ حَتَّى يَفْرُغَ وَقْتُهُ أَوْ تَسْكُنَ مُشْكِلَاتُهُ. وَالْحَيَاةُ لَا تُعْطِيْنَا دَائِمًا وَقْتًا مُرِيْحًا. فِيْ وَسَطِ التَّعَبِ وَالْمَشَاغِلِ نَسْتَطِيْعُ أَنْ نَخْتَارَ عَمَلًا وَاحِدًا يَتَّصِلُ بِهٰذَا الْمَعْنَى ثُمَّ نُدَاوِمَ عَلَيْهِ.

ثَالِثًا، لْنَجْعَلْ لِأَنْفُسِنَا مِقْيَاسًا قَرِيْبًا. إِنْ كُنَّا الْيَوْمَ أَصْبَرَ مِنْ أَمْسِ، فَهٰذَا خَيْرٌ. وَإِنْ حَفِظْنَا كَلِمَةً كَانَتْ تُؤْذِيْ غَيْرَنَا، فَهٰذَا نُوْرٌ. وَإِنْ وَفَّيْنَا بِوَعْدٍ صَغِيْرٍ، فَهٰذَا بَابُ أَمَانَةٍ. إِنَّ اللهَ لَا يُضِيْعُ عَمَلَ عَبْدٍ صَادِقٍ وَلَوْ رَآهُ النَّاسُ صَغِيْرًا.

فَبَعْدَ هٰذِهِ الْمَوْعِظَةِ الْقَصِيْرَةِ، لَا نَكْتَفِيْ بِالْإِعْجَابِ بِالْكَلَامِ، بَلْ نَخْتَارُ عَمَلًا. قَبْلَ النَّوْمِ نَسْتَغْفِرُ اللهَ، وَفِي الصَّبَاحِ نُجَدِّدُ النِّيَّةَ، وَفِي الْبَيْتِ نُلَيِّنُ الْكَلِمَةَ، وَفِي الْعَمَلِ نَصْدُقُ فِي الْأَمَانَةِ، وَفِي الْمَسْجِدِ نَحْفَظُ الصَّلَاةَ وَالْأُخُوَّةَ.`;
  }

  return `Pertama, ${tema} perlu dimulai dari kesadaran bahwa Allah melihat keadaan kita yang paling tersembunyi. Saat seseorang beramal hanya karena ingin dinilai manusia, ia akan cepat lelah dan mudah kecewa. Tetapi saat amal disambungkan dengan ridha Allah, hal kecil menjadi bernilai. Senyum kepada keluarga, menahan kata yang kasar, datang tepat waktu, menepati janji kecil, dan meminta maaf lebih dahulu dapat menjadi jalan kebaikan yang besar.

Kedua, jangan menunggu suasana sempurna untuk mulai berubah. Banyak orang ingin menjadi lebih baik, tetapi selalu menunggu waktu longgar, hati tenang, atau masalah selesai dulu. Padahal hidup tidak selalu memberi keadaan yang ideal. Di tengah capek, pekerjaan, urusan keluarga, dan tanggung jawab yang banyak, kita tetap bisa memilih satu amal yang paling dekat dengan tema ${tema}, lalu menjaganya dengan istiqamah.

Ketiga, buat ukuran perubahan yang sederhana. Jika hari ini kita bisa lebih sabar daripada kemarin, itu sudah kemajuan. Jika lisan yang biasanya cepat menyalahkan bisa ditahan, itu tanda hati mulai belajar. Jika janji kecil bisa ditepati, itu bibit amanah. Allah tidak menyia-nyiakan usaha hamba yang tulus, meskipun usaha itu tampak kecil di mata manusia.

${indonesianKultumThemeApplication(tema, dalilLabel)}

Kelima, jangan meremehkan pengulangan nasihat. Hati manusia sering lupa, bukan karena tidak pernah tahu, tetapi karena terlalu banyak ditarik oleh urusan dunia. Karena itu, tema ${tema} perlu diingatkan berkali-kali dengan cara yang sederhana. Setiap kali kita mendengar nasihat, anggaplah Allah sedang memberi kesempatan baru sebelum penyesalan datang terlambat.

Keenam, jagalah lingkungan yang membantu kebaikan. Seseorang lebih mudah istiqamah ketika dekat dengan majelis ilmu, teman yang mengingatkan, keluarga yang saling menasihati, dan kebiasaan harian yang tertata. Jika ingin menjaga hati, jangan biarkan telinga, mata, dan lisan terus diberi hal yang menjauhkan dari Allah. Kebaikan perlu dirawat, bukan hanya diinginkan.

Ketujuh, kuatkan dengan doa. Kita tidak mampu menjaga hati hanya dengan semangat sesaat. Mintalah kepada Allah agar diberi hati yang lembut, lisan yang jujur, rezeki yang halal, keluarga yang tenteram, dan langkah yang ringan menuju kebaikan. Doa membuat seorang hamba sadar bahwa perubahan bukan semata hasil kemampuan dirinya, tetapi pertolongan Allah yang ia cari setiap hari, terutama ketika hati mulai lemah dan kebiasaan lama ingin kembali.

Maka setelah kultum ini, jangan hanya membawa pulang kalimat yang terdengar baik. Bawa pulang satu tindakan yang jelas, kecil, dan bisa langsung diamalkan. Sebelum tidur, mohon ampun kepada Allah. Besok pagi, mulai dengan niat yang lebih bersih. Di rumah, lembutkan ucapan. Di tempat kerja, jujurlah menjaga amanah. Di masjid, jaga shalat dan persaudaraan. Dari amal kecil yang dijaga terus-menerus, Allah dapat membuka pintu hidayah yang lebih luas.`;
}

function ceramahExpansionFor(language: SupportedLanguage, tema: string, dalilLabel: string) {
  const themeApplication = indonesianKultumThemeApplication(tema, dalilLabel);

  if (language === "Jawa") {
    return `Ceramah punika kedah dipun wiyaraken saking pangertosan dados latihan urip. Nalika kita ngrembag ${tema}, ingkang dipun ajak dudu namung kuping supados mireng, nanging manah supados purun tunduk. Kathah tiyang sampun mangertos nasihat, nanging gesang saben dinten dereng tansah manut kaliyan nasihat punika. Ing griya, wonten cara ngendika ingkang kedah dipun alusaken. Ing papan kerja, wonten amanah ingkang kedah dipun jaga. Ing masyarakat, wonten hak tangga teparo, sedulur, lan jamaah ingkang kedah dipun eling.

Dalil babagan ${dalilLabel} kedah dados cahya kangge maca kahanan. Ayat lan hadits boten namung dipun sebat supados ceramah katon lengkap, nanging supados jamaah saged ngukur awakipun piyambak. Menawi tema punika gegayutan kaliyan sabar, kita taksih kedah sinau nahan reaksi nalika gelo. Menawi gegayutan kaliyan syukur, kita taksih kedah sinau migunakaken nikmat kangge taat. Menawi gegayutan kaliyan amanah, kita taksih kedah sinau jujur nalika boten wonten tiyang ingkang ningali.

Ingkang kapisan, wiwitia saking kesadaran bilih Allah mirsani perkara alit. Amal ageng asring dipun wiwiti saking pilihan ingkang prasaja: milih tembung ingkang langkung becik, mbalekaken hak tiyang sanes, rawuh tepat wekdal, utawi nyuwun pangapunten rumiyin. Saking mriku, ${tema} boten malih dados wacana, nanging dados akhlak ingkang katingal.

Ingkang kaping kalih, sambungaken nasihat kaliyan keluarga. Kathah ujian iman katon wonten griya, nalika awak kesel, pikiran kebak, lan tiyang ingkang paling cedhak malah paling gampil nampi tembung kasar. Menawi ceramah punika saestu mlebet manah, keluarga kedah dados papan kapisan kangge ndandosi lisan, sabar, lan tanggung jawab.

Ingkang kaping tiga, sambungaken kaliyan rezeki lan karya. Islam boten misahaken ibadah saking pekerjaan. Cara golek rezeki, netepi janji, ngatur utang, lan njaga kepercayaan punika bagian saking bukti iman. Jamaah ingkang dipun rahmati Allah, aja ngantos shalatipun rapi nanging timbangane curang, dzikiripun kathah nanging janji gampang dipun lali.

Ingkang kaping sekawan, sambungaken kaliyan masyarakat. Masjid boten namung papan shalat, nanging papan mbangun welas asih. Saking mriki kita sinau nyapa, nulungi, ngapura, lan boten gampang nyebar kabar ingkang damel rame. Tema ${tema} kedah ngasilaken jamaah ingkang langkung teduh, sanes langkung keras marang seduluripun.

Mila ukuran ceramah punika dudu suwene kita lenggah, nanging owah-owahan ingkang dipun gawa wangsul. Pilih satunggal amal ingkang paling cedhak. Tulis wonten manah: dinten punika kula badhe ndandosi satunggal perkara. Menawi punika dipun jagi kanthi istiqamah, Allah saged ndadosaken amal alit minangka lawang hidayah ageng.`;
  }

  if (language === "Sunda") {
    return `Ceramah ieu kedah dimekarkeun tina pangaweruh janten latihan hirup. Nalika urang ngabahas ${tema}, anu diajak lain ngan ukur ceuli supaya ngadenge, tapi hate supaya daek tunduk. Seueur jalma parantos terang kana nasihat, tapi kahirupan sapopoe tacan salawasna nuturkeun nasihat eta. Di bumi, aya cara nyarios anu kedah dilemeskeun. Di padamelan, aya amanah anu kedah dijaga. Di masyarakat, aya hak tatangga, dulur, jeung jamaah anu kedah diemut.

Dalil ngeunaan ${dalilLabel} kedah janten cahaya pikeun maca kaayaan. Ayat jeung hadits henteu cukup disebat supaya ceramah katingali lengkep, tapi kedah janten kaca pikeun ngukur diri. Lamun tema ieu patali jeung sabar, urang masih kedah diajar nahan reaksi nalika kuciwa. Lamun patali jeung syukur, urang kedah diajar makai nikmat pikeun taat. Lamun patali jeung amanah, urang kedah jujur nalika teu aya anu ningali.

Kahiji, mimitian tina kasadaran yen Allah ningali perkara leutik. Amal gede mindeng dimimitian tina pilihan basajan: milih kecap anu leuwih hade, mulangkeun hak batur, datang tepat waktu, atawa menta hampura heula. Ti dinya, ${tema} henteu deui ngan ukur jadi omongan, tapi jadi akhlak anu katingali.

Kadua, sambungkeun nasihat jeung kulawarga. Seueur ujian iman katingali di bumi, nalika awak cape, pikiran pinuh, jeung jalma anu pangdeukeutna malah paling gampang nampi kecap kasar. Lamun ceramah ieu leres-leres asup kana hate, kulawarga kedah janten tempat kahiji pikeun ngalereskeun lisan, sabar, jeung tanggung jawab.

Katilu, sambungkeun jeung rezeki sarta pagawean. Islam henteu misahkeun ibadah tina padamelan. Cara neangan rezeki, netepan janji, ngatur hutang, jeung ngajaga kapercayaan mangrupakeun bagian tina bukti iman. Ulah nepi ka shalatna rapih tapi timbanganna curang, dzikirna seueur tapi jangjina gampang dipopohokeun.

Kaopat, sambungkeun jeung masyarakat. Masjid lain ngan ukur tempat shalat, tapi tempat ngawangun welas asih. Ti dieu urang diajar nyapa, nulungan, ngahampura, jeung henteu gampang nyebarkeun kabar anu ngarusak kaayaan. Tema ${tema} kedah ngahasilkeun jamaah anu leuwih nenangkeun, lain leuwih kasar ka dulurna.

Ku kituna ukuran ceramah ieu lain sabaraha lila urang linggih, tapi parobahan naon anu dibawa balik. Pilih hiji amal anu pangdeukeutna. Tulis dina hate: dinten ieu abdi bade ngalereskeun hiji perkara. Lamun dijaga kalayan istiqamah, Allah tiasa ngajadikeun amal leutik minangka panto hidayah anu lega.`;
  }

  if (language === "Arab") {
    return `إِنَّ هٰذِهِ الْمَوْعِظَةَ لَا يَنْبَغِيْ أَنْ تَبْقَى مَعْلُوْمَةً تُسْمَعُ، بَلْ لِتَصِيْرَ تَدْرِيْبًا فِي الْحَيَاةِ. عِنْدَمَا نَتَحَدَّثُ عَنْ ${tema} فَنَحْنُ نُخَاطِبُ الْقَلْبَ قَبْلَ الْأُذُنِ، وَنَطْلُبُ مِنَ النَّفْسِ أَنْ تَخْضَعَ لِلْحَقِّ. كَثِيْرٌ مِنَ النَّاسِ يَعْرِفُ الْمَوْعِظَةَ، وَلٰكِنَّ يَوْمَهُ لَا يَزَالُ يَحْتَاجُ إِلَى صِدْقٍ أَكْبَرَ.

وَالدَّلِيْلُ فِيْ بَابِ ${dalilLabel} نُوْرٌ نَقِيْسُ بِهِ أَنْفُسَنَا. لَا نَذْكُرُ الْآيَةَ وَالْحَدِيْثَ لِتَكْمُلَ الصُّوْرَةُ فَقَطْ، بَلْ لِنَسْأَلَ: أَيْنَ مَوْضِعُنَا مِنْ هٰذَا الْهُدَى؟ إِنْ كَانَ الْمَوْضُوْعُ صَبْرًا، فَهَلْ نَحْفَظُ أَلْسِنَتَنَا عِنْدَ الْغَضَبِ؟ وَإِنْ كَانَ شُكْرًا، فَهَلْ نَسْتَعْمِلُ النِّعَمَ فِي الطَّاعَةِ؟ وَإِنْ كَانَ أَمَانَةً، فَهَلْ نَصْدُقُ حِيْنَ لَا يَرَانَا النَّاسُ؟

أَوَّلًا، لِنَبْدَأْ مِنْ مُرَاقَبَةِ اللهِ فِي الصَّغَائِرِ. فَالْعَمَلُ الْكَبِيْرُ كَثِيْرًا مَا يَبْدَأُ بِخِيَارٍ صَغِيْرٍ: كَلِمَةٍ أَلْطَفَ، وَحَقٍّ نَرُدُّهُ، وَوَعْدٍ نَفِيْ بِهِ، وَاعْتِذَارٍ نُقَدِّمُهُ. بِذٰلِكَ يَصِيْرُ ${tema} خُلُقًا مَرْئِيًّا لَا شِعَارًا عَابِرًا.

ثَانِيًا، لِنَصِلِ الْمَوْعِظَةَ بِالْأُسْرَةِ. فَكَثِيْرٌ مِنَ امْتِحَانِ الْإِيْمَانِ يَظْهَرُ فِي الْبَيْتِ: عِنْدَ التَّعَبِ، وَضِيْقِ الصَّدْرِ، وَكَثْرَةِ الْمَسْؤُوْلِيَّاتِ. إِنْ دَخَلَتِ الْمَوْعِظَةُ قَلْبَنَا فَلْيَكُنِ الْبَيْتُ أَوَّلَ مَكَانٍ نُصْلِحُ فِيْهِ اللِّسَانَ وَالصَّبْرَ وَالْمَسْؤُوْلِيَّةَ.

ثَالِثًا، لِنَصِلْهَا بِالرِّزْقِ وَالْعَمَلِ. لَا يَفْصِلُ الْإِسْلَامُ بَيْنَ الْعِبَادَةِ وَالْمُعَامَلَةِ. طَرِيْقَةُ كَسْبِ الرِّزْقِ، وَالْوَفَاءُ بِالْعَهْدِ، وَحِفْظُ الثِّقَةِ، وَالْعَدْلُ فِي الْبَيْعِ وَالشِّرَاءِ كُلُّهَا شَوَاهِدُ عَلَى صِدْقِ الْإِيْمَانِ.

رَابِعًا، لِنَصِلْهَا بِالْمُجْتَمَعِ. فَالْمَسْجِدُ لَيْسَ مَكَانَ صَلَاةٍ فَقَطْ، بَلْ مَدْرَسَةُ رَحْمَةٍ. مِنْهُ نَتَعَلَّمُ السَّلَامَ، وَالْمُسَاعَدَةَ، وَالْعَفْوَ، وَتَرْكَ الْخَبَرِ الَّذِيْ يُفْسِدُ بَيْنَ النَّاسِ.

فَلْيَكُنْ مِقْيَاسُ هٰذِهِ الْمَوْعِظَةِ مَا نَحْمِلُهُ بَعْدَهَا مِنْ تَغْيِيْرٍ صَادِقٍ. لِيَخْتَرْ كُلُّ وَاحِدٍ مِنَّا عَمَلًا قَرِيْبًا، وَلْيَقُلْ فِيْ قَلْبِهِ: الْيَوْمَ أُصْلِحُ شَيْئًا وَاحِدًا. وَإِذَا صَدَقَ الْعَبْدُ فِي الْقَلِيْلِ فَتَحَ اللهُ لَهُ أَبْوَابَ الْخَيْرِ الْكَثِيْرِ.`;
  }

  const normalizedLabel = normalizedTopic(dalilLabel);
  if (normalizedLabel.includes("muharram") || normalizedLabel.includes("asyura") || normalizedLabel.includes("bulan haram") || normalizedLabel.includes("hijriah")) {
    return `Ceramah tentang ${tema} harus dimulai dari pemahaman bahwa Muharram bukan sekadar pergantian angka kalender. Muharram adalah salah satu bulan haram yang Allah muliakan. Ketika Allah memuliakan sebuah waktu, seorang mukmin tidak melewatinya dengan lalai. Ia memperbesar rasa hormat kepada Allah, lebih berhati-hati dari dosa, dan lebih sungguh-sungguh mengisi hari dengan amal saleh.

Allah mengingatkan dalam QS. At-Taubah: 36 bahwa di antara dua belas bulan ada empat bulan haram, lalu Allah berfirman agar kita tidak menzalimi diri di dalamnya. Ini berarti Muharram mengajarkan dua arah sekaligus: memperbanyak kebaikan dan menjauhi kezaliman. Kezaliman kepada diri sendiri dapat berupa maksiat yang dibiarkan, shalat yang ditunda tanpa alasan, lisan yang melukai, permusuhan yang dipelihara, atau kebiasaan dosa yang terus diberi tempat.

Amalan yang paling jelas dan kuat dalilnya di bulan Muharram adalah puasa sunnah. Rasulullah shallallahu 'alaihi wasallam menyebut puasa di bulan Allah, Muharram, sebagai puasa paling utama setelah Ramadhan. Maka jamaah yang mampu hendaknya memperbanyak puasa di bulan ini sesuai kesanggupan, tanpa memberatkan diri dan tanpa meremehkan kewajiban yang lebih utama.

Di antara hari Muharram yang paling ditekankan adalah Asyura, yaitu tanggal 10 Muharram. Nabi shallallahu 'alaihi wasallam berharap kepada Allah agar puasa Asyura menghapus dosa setahun sebelumnya. Ini adalah kabar gembira, tetapi juga panggilan untuk bertaubat. Jangan sampai seseorang berpuasa Asyura, namun tetap nyaman dengan dosa yang sama setelahnya. Penghapusan dosa seharusnya mendorong hati untuk malu kepada Allah dan lebih serius memperbaiki diri.

Rasulullah shallallahu 'alaihi wasallam juga berkeinginan untuk berpuasa pada hari kesembilan Muharram bila bertemu tahun berikutnya. Dari sini para ulama menganjurkan puasa Tasu'a pada tanggal 9 Muharram bersama Asyura pada tanggal 10 Muharram. Bagi yang mampu, boleh menambah puasa tanggal 11 Muharram sebagai bentuk kehati-hatian dan memperbanyak amal di bulan yang mulia.

Selain puasa, Muharram adalah waktu yang sangat tepat untuk muhasabah. Pergantian tahun Hijriah mengingatkan bahwa umur kita berkurang, catatan amal bertambah, dan kesempatan bertaubat tidak selalu terbuka selamanya. Maka tanyakan kepada diri sendiri: shalat mana yang masih sering tertunda, hubungan mana yang perlu diperbaiki, hak siapa yang belum ditunaikan, dosa apa yang harus dihentikan, dan amal apa yang akan kita jaga mulai bulan ini.

Muharram juga mengajarkan agar kita berhati-hati dari amalan yang tidak jelas dalilnya. Cinta kepada bulan mulia tidak boleh membuat kita mudah menyebarkan klaim pahala, doa khusus, atau ritual tertentu yang tidak kita ketahui sumbernya. Jalan yang aman adalah menghidupkan amalan yang masyhur dan berdalil: puasa sunnah, taubat, istighfar, shalat yang lebih dijaga, tilawah, sedekah, memperbaiki hubungan, dan meninggalkan kezaliman.

Dalam keluarga, Muharram bisa menjadi awal perubahan yang nyata. Ajak keluarga merencanakan puasa Tasu'a dan Asyura bagi yang mampu. Ingatkan anak-anak bahwa tahun baru Islam bukan sekadar tanggal merah, tetapi momen mengenal hijrah, pengorbanan, dan keberanian berubah. Di rumah, mulai satu kebiasaan baik: shalat berjamaah, membaca Al-Quran, doa bersama, atau saling meminta maaf sebelum luka menjadi panjang.

Dalam kehidupan sosial, bulan haram seharusnya membuat kita lebih menahan diri dari permusuhan. Jangan rawat kebencian, jangan sebarkan kabar yang merusak, jangan memperpanjang konflik kecil. Bila ada sengketa, cari jalan islah. Bila ada saudara yang membutuhkan, bantu. Bila ada hati yang pernah kita lukai, minta maaf. Memuliakan Muharram bukan hanya dengan ibadah pribadi, tetapi juga dengan mengurangi kezaliman kepada sesama.

Maka langkah praktis setelah majelis ini jelas. Pertama, tetapkan niat untuk memperbaiki amal di bulan Muharram. Kedua, rencanakan puasa sunnah sesuai kemampuan, terutama Tasu'a dan Asyura. Ketiga, pilih satu dosa yang benar-benar ingin ditinggalkan. Keempat, pilih satu amal yang akan dijaga sepanjang tahun. Kelima, periksa hubungan dengan manusia: hak yang belum ditunaikan, utang yang belum dibayar, dan maaf yang belum diminta.

Jangan menunggu semangat besar untuk berubah. Muharram mengajari kita bahwa hijrah sering dimulai dari keputusan kecil yang jujur. Satu hari berpuasa, satu shalat yang lebih tepat waktu, satu permintaan maaf, satu kebiasaan maksiat yang dihentikan, satu sedekah yang dirutinkan; semua itu bisa menjadi pintu keberkahan bila dilakukan karena Allah.

Semoga ketika Muharram berlalu, yang berubah bukan hanya kalender di dinding, tetapi juga arah hati kita. Dari lalai menjadi sadar, dari menunda menjadi memulai, dari dosa menuju taubat, dan dari rutinitas menuju ibadah yang lebih hidup.`;
  }

  return `Ceramah tentang ${tema} perlu dibangun lebih luas daripada kultum singkat. Kultum biasanya cukup membawa satu pesan ringkas, sedangkan ceramah memberi ruang untuk menuntun jamaah memahami masalah, membaca dalil, melihat contoh kehidupan, lalu pulang dengan langkah yang jelas. Karena itu, mari kita mulai dengan jujur melihat keadaan diri. Banyak nasihat agama yang sudah pernah kita dengar, tetapi belum semua berubah menjadi kebiasaan. Kita tahu pentingnya sabar, tetapi masih mudah terpancing. Kita tahu pentingnya syukur, tetapi masih cepat mengeluh. Kita tahu pentingnya amanah, tetapi kadang longgar ketika tidak ada yang mengawasi.

Tema ${tema} menyentuh wilayah yang sangat dekat dengan hidup kita. Ia tidak hanya hadir di masjid, tetapi juga hadir di rumah, tempat kerja, jalan raya, pasar, ruang percakapan keluarga, dan layar telepon genggam. Di rumah, tema ini diuji ketika kita berbicara kepada pasangan, anak, orang tua, atau saudara. Di tempat kerja, tema ini diuji ketika kita memegang tugas, waktu, uang, jabatan, atau kepercayaan. Di masyarakat, tema ini diuji ketika kita bergaul dengan tetangga, menyikapi kabar, menolong yang lemah, dan menahan diri dari ucapan yang melukai.

Dalil tentang ${dalilLabel} menjadi pengingat bahwa agama tidak berhenti pada rasa kagum kepada ayat dan hadits. Ayat dibaca agar hati tunduk. Hadits disampaikan agar langkah berubah. Ketika Allah memberi tuntunan, berarti ada jalan keselamatan yang harus kita pilih. Ketika Rasulullah shallallahu 'alaihi wasallam memberi contoh, berarti ada akhlak yang perlu kita tiru. Maka jangan jadikan dalil sebagai hiasan ceramah saja. Jadikan ia cermin untuk bertanya: bagian mana dari diri kita yang belum sejalan dengan petunjuk Allah?

Pertama, ${tema} harus dimulai dari kesadaran muraqabah, yaitu merasa diawasi Allah dalam keadaan yang terang maupun tersembunyi. Banyak orang bisa menjaga sikap ketika dilihat manusia, tetapi ukuran iman tampak ketika ia tetap jujur saat sendirian. Ia tetap menahan lisan saat tidak ada yang menegur. Ia tetap mengembalikan hak orang lain meski tidak ada yang menuntut. Ia tetap memilih yang halal meski jalan haram tampak lebih cepat. Di sinilah nasihat agama menjadi hidup.

Kedua, ${tema} perlu masuk ke keluarga. Jangan sampai kita tampak lembut di majelis, tetapi kasar di rumah. Jangan sampai kita mudah tersenyum kepada orang luar, tetapi sulit menghargai keluarga sendiri. Rumah adalah tempat pertama akhlak diuji karena di sana topeng paling mudah lepas. Jika ceramah ini benar-benar menyentuh hati, maka pulang dari majelis harus ada perubahan dalam cara menyapa, cara mendengar, cara meminta maaf, dan cara menunaikan tanggung jawab.

Ketiga, ${tema} perlu masuk ke pekerjaan dan rezeki. Seorang muslim tidak cukup dinilai dari ibadah ritualnya saja. Cara ia mencari nafkah, menepati janji, menjaga waktu, membayar utang, melayani orang, dan memegang amanah juga bagian dari ibadah. Ada orang yang rajin shalat tetapi mudah meremehkan hak orang lain. Ada yang banyak berdzikir tetapi lisannya tajam. Ada yang suka hadir di majelis tetapi pekerjaannya tidak rapi. Tema ini mengajak kita menyatukan ibadah dan muamalah.

Keempat, ${tema} perlu masuk ke kehidupan sosial. Masjid membentuk jamaah yang saling menenangkan, bukan saling mencurigai. Majelis ilmu seharusnya melahirkan orang yang lebih ringan membantu, lebih hati-hati berbicara, lebih mudah memaafkan, dan lebih peduli kepada yang lemah. Jika ilmu membuat seseorang merasa paling benar tetapi tidak membuatnya lebih penyayang, berarti ada yang perlu diperiksa di dalam hati.

${themeApplication}

Kelima, perubahan perlu dimulai dari amal kecil yang terukur. Jangan menunggu semua keadaan ideal untuk menjadi lebih baik. Pilih satu kebiasaan yang paling dekat dengan tema ${tema}. Jika masalahnya lisan, mulai dengan menahan satu komentar buruk setiap hari. Jika masalahnya amanah, mulai dengan menepati satu janji kecil. Jika masalahnya ibadah, mulai dengan menjaga satu shalat lebih tepat waktu. Jika masalahnya hubungan keluarga, mulai dengan satu kalimat yang lebih lembut.

Keenam, jagalah lingkungan yang menolong. Hati manusia mudah lemah ketika sendirian. Dekatlah dengan orang yang mengingatkan kepada Allah, bukan yang menormalisasi dosa. Rapikan apa yang kita baca, dengar, dan tonton. Banyak kerusakan hati masuk pelan-pelan melalui kebiasaan kecil yang dianggap biasa. Sebaliknya, banyak kebaikan juga tumbuh dari kebiasaan kecil: menghadiri majelis, membaca Al-Quran, berdoa, bersedekah, dan menjaga pertemanan yang sehat.

Ketujuh, kuatkan semuanya dengan doa. Kita tidak mampu memperbaiki diri hanya dengan tekad. Hati berada dalam genggaman Allah. Karena itu mintalah kepada Allah agar dilembutkan hati, dijaga lisan, diberi rezeki halal, diberi keluarga yang tenteram, dijauhkan dari keburukan, dan dimudahkan istiqamah. Doa bukan tanda lemah; doa adalah pengakuan bahwa perubahan sejati membutuhkan pertolongan Allah.

Kedelapan, jangan putus asa ketika perubahan terasa lambat. Sebagian orang gagal bukan karena tidak mampu berubah, tetapi karena ingin langsung sempurna. Ia bersemangat satu dua hari, lalu ketika tergelincir ia merasa semuanya sia-sia. Padahal jalan menuju Allah dibangun dengan kembali lagi dan lagi. Jika hari ini masih jatuh pada kebiasaan lama, jangan jadikan itu alasan untuk berhenti. Segera istighfar, perbaiki sebabnya, dan mulai lagi dengan langkah yang lebih sadar.

Kesembilan, jadikan tema ini sebagai bahan muhasabah bersama. Ayah bisa bertanya apakah sudah menjadi teladan di rumah. Ibu bisa bertanya apakah lelahnya tetap diarahkan kepada ridha Allah. Anak muda bisa bertanya apakah waktunya dipakai untuk hal yang mendekatkan atau menjauhkan. Pengurus masjid bisa bertanya apakah jamaah sudah dirangkul dengan kasih sayang. Pedagang, pegawai, guru, pemimpin, dan siapa pun bisa bertanya: di bagian mana ${tema} paling perlu diperbaiki dalam peran saya?

Kesepuluh, sampaikan perubahan itu dengan rendah hati. Setelah mendengar nasihat, jangan sibuk menunjuk orang lain yang menurut kita perlu berubah. Mulailah dari diri sendiri, karena hidayah paling dekat adalah hidayah untuk hati kita sendiri. Jika Allah memperbaiki diri kita, pengaruhnya akan terasa kepada keluarga dan lingkungan tanpa perlu banyak menghakimi.

Maka ukuran keberhasilan ceramah ini bukan tepuk tangan, bukan panjangnya kata-kata, dan bukan rasa haru sesaat. Ukurannya adalah keputusan kecil setelah majelis selesai. Apa yang akan kita ubah malam ini? Siapa yang perlu kita minta maaf? Hak apa yang perlu kita tunaikan? Dosa apa yang perlu kita tinggalkan? Amal apa yang akan kita jaga? Jika setiap jamaah membawa pulang satu jawaban yang jujur, insya Allah tema ${tema} tidak berhenti sebagai pembahasan, tetapi menjadi jalan pulang kepada Allah.`;
}

function coupleNameText(parameters: Record<string, unknown>) {
  const groom = String(parameters.mempelaiPria ?? "").trim();
  const bride = String(parameters.mempelaiWanita ?? "").trim();

  if (groom && bride) return { groom, bride, couple: `${groom} dan ${bride}` };
  if (groom) return { groom, bride: "", couple: groom };
  if (bride) return { groom: "", bride, couple: bride };
  return { groom: "", bride: "", couple: "kedua mempelai" };
}

function indonesianWeddingThemeApplication(tema: string, couple: string) {
  const normalized = normalizedTopic(tema);

  if (normalized.includes("curiga") || normalized.includes("cemburu") || normalized.includes("prasangka")) {
    return `Untuk ${couple}, tema ${tema} perlu dipahami sebagai peringatan agar rumah tangga tidak dipimpin oleh prasangka. Curiga yang tidak ditata bisa membuat hal kecil tampak besar, ucapan biasa terasa menyakitkan, dan diam pasangan dibaca sebagai kesalahan. Karena itu, setelah akad, keduanya perlu belajar membangun kepercayaan: jujur dalam kabar, terbuka dalam urusan penting, dan tidak memberi ruang bagi rahasia yang merusak ketenangan.`;
  }

  if (normalized.includes("sakinah") || normalized.includes("mawaddah") || normalized.includes("rahmah")) {
    return `Untuk ${couple}, tema ${tema} berarti rumah tangga tidak cukup dibangun dengan cinta yang terasa indah di awal. Sakinah perlu dirawat dengan ketenangan saat berbeda pendapat. Mawaddah perlu dijaga dengan perhatian yang nyata, bukan hanya kata-kata. Rahmah perlu hadir ketika pasangan sedang lemah, salah, atau belum mampu memenuhi harapan.`;
  }

  if (normalized.includes("komunikasi") || normalized.includes("musyawarah")) {
    return `Untuk ${couple}, tema ${tema} perlu tampak dalam cara berbicara setelah akad. Banyak masalah rumah tangga bukan lahir dari kurangnya cinta, tetapi dari ucapan yang tergesa-gesa, diam yang menyimpan luka, dan keputusan yang tidak dimusyawarahkan. Biasakan bicara dengan jujur, mendengar tanpa merendahkan, dan memilih waktu yang tepat saat membahas perkara berat.`;
  }

  if (normalized.includes("amanah") || normalized.includes("tanggung") || normalized.includes("nafkah")) {
    return `Untuk ${couple}, tema ${tema} adalah pengingat bahwa pernikahan merupakan amanah, bukan sekadar perasaan. Suami memikul amanah memimpin dengan kasih sayang dan mencari nafkah yang halal. Istri memikul amanah menjaga kehormatan rumah dan menjadi teman kebaikan. Keduanya memikul amanah untuk saling menolong menuju ridha Allah.`;
  }

  if (normalized.includes("sabar") || normalized.includes("maaf") || normalized.includes("memaafkan")) {
    return `Untuk ${couple}, tema ${tema} akan sangat dibutuhkan setelah hari bahagia ini berlalu. Nanti akan ada lelah, salah paham, kekurangan, dan kebiasaan yang perlu disesuaikan. Saat itu, sabar dan memaafkan menjadi pakaian rumah tangga. Jangan menjadikan setiap kekurangan sebagai alasan menjauh; jadikan ia kesempatan untuk saling memahami.`;
  }

  if (normalized.includes("ibadah") || normalized.includes("takwa") || normalized.includes("allah")) {
    return `Untuk ${couple}, tema ${tema} harus menjadi arah rumah tangga. Pernikahan yang kuat bukan hanya karena ekonomi cukup atau keluarga mendukung, tetapi karena suami dan istri sama-sama ingin dekat kepada Allah. Jagalah shalat, halal-haram, doa bersama, dan kebiasaan saling mengingatkan.`;
  }

  return `Untuk ${couple}, tema ${tema} perlu diterjemahkan menjadi kebiasaan harian. Setelah akad, kebaikan tidak lagi cukup berupa janji, tetapi perlu menjadi cara berbicara, cara mengambil keputusan, cara menyelesaikan masalah, dan cara menjaga keluarga.`;
}

function weddingThemeGoal(tema: string) {
  const normalized = normalizedTopic(tema);
  if (normalized.includes("curiga") || normalized.includes("cemburu") || normalized.includes("prasangka")) {
    return "menumbuhkan saling percaya dan mengikis prasangka";
  }
  if (normalized.includes("sabar") || normalized.includes("maaf") || normalized.includes("memaafkan")) {
    return "merawat kesabaran dan keluasan hati untuk saling memaafkan";
  }
  if (normalized.includes("komunikasi") || normalized.includes("musyawarah")) {
    return "membangun komunikasi yang jujur, lembut, dan terbuka";
  }
  if (normalized.includes("amanah") || normalized.includes("nafkah") || normalized.includes("tanggung")) {
    return "menjaga amanah, tanggung jawab, dan rezeki yang halal";
  }
  if (normalized.includes("ibadah") || normalized.includes("takwa") || normalized.includes("allah")) {
    return "menjadikan ibadah dan takwa sebagai arah rumah tangga";
  }
  if (normalized.includes("sakinah") || normalized.includes("mawaddah") || normalized.includes("rahmah")) {
    return "merawat sakinah, mawaddah, dan rahmah dalam keseharian";
  }
  return `menghidupkan pesan ${tema} dalam akhlak sehari-hari`;
}

function indonesianWeddingExtendedAdvice(tema: string, couple: string) {
  const goal = weddingThemeGoal(tema);

  return `Wahai ${couple}, setelah akad terucap, kehidupan tidak lagi berjalan sebagai dua pribadi yang sendiri-sendiri. Ada rumah yang akan dibangun, ada keputusan yang perlu dibicarakan, ada keluarga yang perlu dijaga, dan ada amanah Allah yang harus dipikul dengan hati-hati. Karena itu, pesan tentang ${goal} perlu turun menjadi adab harian: bagaimana menyapa saat lelah, bagaimana meminta maaf saat keliru, bagaimana menjelaskan sesuatu tanpa melukai, dan bagaimana tetap memilih rahmah ketika perasaan sedang tidak mudah.

Pernikahan yang kuat bukan rumah tanpa perbedaan. Setiap pasangan membawa kebiasaan, cara berpikir, pengalaman keluarga, dan cara mengekspresikan kasih sayang yang tidak selalu sama. Perbedaan seperti ini tidak perlu segera dibaca sebagai ancaman. Ia bisa menjadi jalan untuk saling mengenal lebih dalam. Ketika ada yang terasa mengganjal, jangan biarkan hati menebak-nebak terlalu lama. Duduklah dengan tenang, bicarakan dengan kalimat yang menjaga martabat, dan dengarkan pasangan sampai selesai sebelum menjawab.

Jika tema yang dipilih hari ini menyentuh luka, kekhawatiran, atau kebiasaan yang perlu diperbaiki, maka jadikan ia pintu taubat bersama, bukan bahan untuk saling menunjuk. Suami dan istri sama-sama manusia yang bisa salah paham, bisa lelah, dan bisa kurang tepat membaca keadaan. Yang membedakan rumah tangga beriman adalah kesediaan untuk kembali kepada Allah, mengakui kekeliruan, lalu memperbaiki cara bersikap. Jangan rawat curiga dengan diam yang dingin; rawatlah percaya dengan kejujuran yang konsisten.

Kepercayaan tidak lahir dari pengawasan yang berlebihan, tetapi dari akhlak yang bisa diandalkan. Jika pergi, beri kabar dengan jujur. Jika ada kegelisahan, sampaikan tanpa menuduh. Jika ada kesalahan, jangan ditutup dengan kebohongan baru. Rumah tangga akan lebih tenang ketika suami dan istri sama-sama merasa aman untuk berbicara, aman untuk didengar, dan aman untuk memperbaiki diri tanpa terus dihakimi oleh masa lalu.

Di sinilah pentingnya menjaga lisan. Kata-kata yang keluar saat marah sering meninggalkan bekas lebih lama daripada yang kita bayangkan. Maka biasakan memilih kalimat yang menenangkan, bukan yang mempermalukan. Jika hati sedang panas, beri jeda sebelum menjawab. Jika pasangan sedang menjelaskan, dengarkan sampai selesai. Tidak semua kegelisahan harus langsung berubah menjadi tuduhan; sebagian cukup diajak bicara dengan lembut dan jujur.

Jagalah ibadah sebagai pusat rumah. Shalat, doa, tilawah, dan kebiasaan menyebut nama Allah akan menolong hati ketika masalah datang. Jika rezeki terasa sempit, jangan jauh dari Allah. Jika hubungan terasa renggang, jangan hanya mencari siapa yang salah, tetapi carilah jalan untuk kembali lembut. Rumah tangga yang dibangun untuk mencari ridha Allah tidak mudah menyerah hanya karena diuji; ia belajar bertahan dengan ikhtiar, musyawarah, dan doa.

Dalam urusan rezeki, tugas rumah, keluarga, dan rencana masa depan, biasakan musyawarah yang jernih. Jangan menunggu masalah menjadi besar baru belajar duduk bersama. Hal-hal kecil seperti mengatur pengeluaran, mengunjungi orang tua, membagi waktu, dan menjaga batas pergaulan perlu dibicarakan dengan adab. Dari percakapan-percakapan kecil yang jujur itulah rumah tangga belajar menjadi kokoh.

Jangan lupa pula menjaga kehormatan pasangan di hadapan orang lain. Kekurangan pasangan bukan bahan candaan, bukan bahan keluhan sembarangan, dan bukan cerita untuk mempermalukan. Bila membutuhkan nasihat, carilah orang yang amanah dan menenangkan, bukan yang memperbesar api. Rumah tangga yang sehat bukan rumah tanpa masalah, tetapi rumah yang tahu kepada siapa harus meminta pertolongan dan bagaimana menjaga rahasia.

Kepada ${couple}, jadikan hari akad ini sebagai awal latihan panjang untuk saling percaya. Kepercayaan itu perlu diberi makan dengan kejujuran, perhatian, dan kesediaan memperbaiki diri. Jangan menuntut pasangan langsung memahami semua isi hati, tetapi bantulah ia memahami dengan cara yang baik. Jangan pula menyimpan kecewa terlalu lama sampai berubah menjadi jarak. Sampaikan, dengarkan, maafkan, lalu bangun kembali kedekatan dengan cara yang diridhai Allah.

Dengan cara seperti itu, pesan khutbah ini tidak berhenti sebagai kalimat yang terdengar baik di majelis akad. Ia menjadi bekal yang hadir saat mengambil keputusan, saat berbeda pendapat, saat mengatur nafkah, saat menerima keluarga besar, dan saat keduanya belajar menjadi pasangan yang lebih matang.

Kepada keluarga besar, jadilah peneduh bagi ${couple}. Doakan, bimbing, dan bantu mereka tanpa memperkeruh urusan yang seharusnya mereka selesaikan sebagai pasangan. Orang tua tetap dimuliakan, keluarga tetap disambung, tetapi rumah tangga baru juga perlu diberi ruang untuk dewasa. Nasihat yang baik akan menenangkan; campur tangan yang berlebihan sering membuat luka bertambah dalam.

Semoga ${couple} mampu menjaga cinta sebagai amal yang diperbarui setiap hari. Cinta tampak ketika tetap jujur saat ada peluang menyembunyikan sesuatu, tetap lembut saat lelah, tetap mendoakan saat kecewa, dan tetap menyebut kebaikan pasangan ketika hati mulai sibuk melihat kekurangan. Semoga Allah menjadikan rumah tangga ini tempat tumbuhnya kepercayaan, ketenangan, rezeki yang halal, keturunan yang saleh, dan kasih sayang yang terus dijaga sampai akhir hayat.`;
}

function weddingPersonalPrayerFor(language: SupportedLanguage, tema: string, couple: string) {
  if (language === "Jawa") {
    return `Ya Allah, berkahana griya tangga ${couple}, lembutaken manah kekalihipun, lan dadosaken ${tema} minangka akhlak ingkang gesang wonten lampahipun.`;
  }
  if (language === "Sunda") {
    return `Ya Allah, berkahan rumah tangga ${couple}, lembutkeun hate duanana, jeung jadikeun ${tema} minangka akhlak anu hirup dina perjalanan maranehanana.`;
  }
  if (language === "Arab") {
    return `اَللّٰهُمَّ بَارِكْ لِهٰذَيْنِ الزَّوْجَيْنِ، وَأَلِّفْ بَيْنَ قَلْبَيْهِمَا، وَاجْعَلْ مَعْنَى ${tema} خُلُقًا حَيًّا فِيْ بَيْتِهِمَا.`;
  }
  return `Ya Allah, berkahilah rumah tangga ${couple}, lembutkan hati keduanya, kuatkan cinta dan rahmat di antara keduanya, serta jadikan tema ${tema} sebagai akhlak yang hidup dalam perjalanan mereka.`;
}

function weddingCopyFor(language: SupportedLanguage, tema: string, names = coupleNameText({})) {
  const couple = names.couple;
  if (language === "Jawa") {
    return {
      intro:
        `Hadirin ingkang dipun mulyakaken Allah, pernikahan ${couple} boten namung patemon kalih insan, nanging amanah ageng ingkang dipun sekseni kulawarga lan kacathet wonten ngarsaning Allah. Griya tangga ingkang sae boten dipun bangun dening janji endah kemawon, nanging dening sabar, jujur, rezeki halal, lan purun sami ngapura.`,
      advice: `Dhuh ${couple}, dadosaken ${tema} minangka bekal lampah. Sampun ngantos ngentosi pasangan sampurna kangge miwiti tumindak sae. Sinaua mireng sadurunge nyuwun dipun mirengaken, nyuwun pangapunten sadurunge ngetang kalepatan, lan njagi rahasia griya tangga kados njagi pakurmatan dhiri.`,
      family:
        `Kulawarga ageng prayoginipun dados pepayung kangge ${couple}, sanes dados sumber rame. Dongakna, tuntuna, lan tulung kekalihipun tuwuh dados kulawarga ingkang taat dhumateng Allah.`,
      closing:
        `Mugi Allah ndadosaken akad ${couple} punika wiwitan griya tangga ingkang sakinah, mawaddah, rahmah, lan kebak berkah. Amin ya rabbal 'alamin.`
    };
  }

  if (language === "Sunda") {
    return {
      intro:
        `Hadirin anu dimulyakeun ku Allah, pernikahan ${couple} lain saukur patepungna dua insan, tapi amanah gede anu disaksian ku kulawarga jeung dicatet di sisi Allah. Rumah tangga anu hade henteu diwangun ku jangji anu endah wungkul, tapi ku sabar, jujur, rezeki halal, jeung daek silih hampura.`,
      advice: `Wahai ${couple}, jadikeun ${tema} bekel perjalanan. Ulah nungguan pasangan sampurna pikeun ngamimitian hade. Diajar ngadenge samemeh nungtut didenge, menta hampura samemeh ngitung kasalahan, jeung ngajaga rusiah rumah tangga saperti ngajaga kahormatan diri.`,
      family:
        `Kulawarga ageung kedah janten payung anu nenangkeun kanggo ${couple}, sanés nambihan rame. Doakeun, bimbing, jeung bantos duanana tumuwuh janten kulawarga anu taat ka Allah.`,
      closing:
        `Mugia Allah ngajadikeun akad ${couple} ieu awal rumah tangga anu sakinah, mawaddah, rahmah, jeung pinuh ku berkah. Amin ya rabbal 'alamin.`
    };
  }

  if (language === "Arab") {
    return {
      intro:
        "أَيُّهَا الْحَاضِرُوْنَ أَكْرَمَكُمُ اللهُ، إِنَّ النِّكَاحَ لَيْسَ لِقَاءَ شَخْصَيْنِ فَقَطْ، بَلْ أَمَانَةٌ عَظِيْمَةٌ تَشْهَدُهَا الْأُسْرَةُ وَيَكْتُبُهَا اللهُ. وَالْبَيْتُ الصَّالِحُ لَا يُبْنَى بِالْوُعُوْدِ الْجَمِيْلَةِ وَحْدَهَا، بَلْ بِالصَّبْرِ، وَالصِّدْقِ، وَالرِّزْقِ الْحَلَالِ، وَالْعَفْوِ.",
      advice: `أَيُّهَا الزَّوْجَانِ، اِجْعَلَا ${tema} زَادًا لِلطَّرِيْقِ. لَا تَنْتَظِرَا الْكَمَالَ لِتَبْدَآ الْإِحْسَانَ؛ تَعَلَّمَا الْإِنْصَاتَ قَبْلَ طَلَبِهِ، وَالِاعْتِذَارَ قَبْلَ إِحْصَاءِ الْأَخْطَاءِ، وَحِفْظَ سِرِّ الْبَيْتِ كَحِفْظِ الْكَرَامَةِ.`,
      family:
        "وَلْتَكُنِ الْأُسْرَةُ الْكَبِيْرَةُ ظِلًّا رَحِيْمًا، لَا سَبَبًا لِلضَّجِيْجِ؛ اُدْعُوا لَهُمَا، وَأَرْشِدُوْهُمَا، وَأَعِيْنُوْهُمَا عَلَى طَاعَةِ اللهِ.",
      closing:
        "نَسْأَلُ اللهَ أَنْ يَجْعَلَ هٰذَا الْعَقْدَ بَدَايَةَ بَيْتٍ سَكِيْنَةٍ وَمَوَدَّةٍ وَرَحْمَةٍ وَبَرَكَةٍ. آمِيْنَ يَا رَبَّ الْعَالَمِيْنَ."
    };
  }

  return {
    intro:
      `Hadirin yang dimuliakan Allah, pernikahan ${couple} bukan hanya pertemuan dua insan, tetapi amanah besar yang disaksikan keluarga dan dicatat di sisi Allah. Rumah tangga yang baik tidak dibangun oleh janji yang indah saja, melainkan oleh kesabaran, kejujuran, nafkah yang halal, dan kemampuan untuk saling memaafkan saat kekurangan mulai terlihat.`,
    advice: `Wahai ${couple}, jadikan ${tema} sebagai bekal perjalanan. Jangan menunggu pasangan sempurna untuk bersikap baik. Belajarlah mendengar sebelum menuntut didengar, meminta maaf sebelum menghitung kesalahan, dan menjaga rahasia rumah tangga sebagaimana menjaga kehormatan diri sendiri.

${indonesianWeddingThemeApplication(tema, couple)}`,
    extendedAdvice: indonesianWeddingExtendedAdvice(tema, couple),
    family:
      `Keluarga besar hendaknya menjadi peneduh bagi ${couple}, bukan penambah gaduh. Doakan, bimbing, dan bantu keduanya tumbuh sebagai keluarga yang taat kepada Allah. Jangan jadikan perbedaan kebiasaan keluarga sebagai sumber tekanan; jadikan ia ruang belajar agar ${couple} semakin dewasa membangun rumah tangga.`,
    closing:
      `Semoga Allah menjadikan akad ${couple} ini awal dari rumah tangga yang sakinah, mawaddah, rahmah, dan penuh keberkahan. Amin ya rabbal 'alamin.`
  };
}

function fallbackRukunKhutbah(jenis: string, label: string, bahasa: string, tema: string, variationSeed = "") {
  const language = normalizeLanguage(bahasa);
  const labels = fallbackLabels[language];
  const seed = `${jenis}:${bahasa}:${tema}:${variationSeed}`;
  const takbirSembilan =
    "اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ.";
  const takbirTujuh =
    "اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ.";
  const hamdalahArab = pick(khutbahArabicVariants.hamdalah, seed, 1);
  const syahadatArab = pick(khutbahArabicVariants.syahadat, seed, 12);
  const shalawatArab = pick(khutbahArabicVariants.shalawat, seed, 3);
  const wasiatTakwaArab = pick(khutbahArabicVariants.wasiat, seed, 5);
  const selectedDalil = selectedDalilFor(jenis, tema, seed);
  const ayat = selectedDalil.ayat;
  const hadith = selectedDalil.hadith;
  const penutupPertamaArab = pick(khutbahArabicVariants.penutupPertama, seed, 9);
  const idulMessage = khutbahMessageFor(jenis, tema, seed, language, selectedDalil.label);
  const subsections = khutbahSubsectionsFor(jenis, tema, seed, language, selectedDalil.label);
  const firstTakbir = jenis === "idul-fitri" || jenis === "idul-adha"
    ? `${takbirSembilan}\n\n`
    : "";
  const audience = audienceFor(jenis, language);
  const secondKhutbahBlock = secondKhutbahArabicOnly(jenis === "idul-fitri" || jenis === "idul-adha" ? takbirTujuh : "", seed);
  const editorialWithDalil = interleaveKhutbahDalilBlocks(
    [
      subsections
        .map(
          (section) => `${section.title}
${section.body}`
        )
        .join("\n\n"),
      idulMessage,
      khutbahDeepeningFor(jenis, language, tema, selectedDalil.label)
    ]
      .filter(Boolean)
      .join("\n\n"),
    [
      `${QURAN_HEADING}
${ayat.arab}
${meaningLineFor(ayat, language)}`,
      `${HADITH_HEADING}
${hadith.arab}
${meaningLineFor(hadith, language)}`
    ]
  );

  return `${label}

${labels.topic}: ${tema}
${labels.language}: ${bahasa}

Khutbah Pertama
${firstTakbir}${hamdalahArab}

${syahadatArab}

${shalawatArab}

${wasiatTakwaArab}

${audience}, ${takwaIntroFor(language)}

Isi Khutbah
${editorialWithDalil}

Penutup Khutbah Pertama
${penutupPertamaArab}

Khutbah Kedua
${secondKhutbahBlock}`;
}

function promptDalilItemToText(item: PromptDalilItem | undefined, fallback: DalilText): DalilText {
  if (!item) return fallback;
  const referenceParts = [item.reference, item.grade, item.takhrij].filter(Boolean);
  return {
    arab: item.arab || fallback.arab,
    arti: item.translation || fallback.arti,
    rujukan: referenceParts.join(" - ") || fallback.rujukan
  };
}

function thematicPromptDalilItemIsRelevant(item: PromptDalilItem | undefined, set: ThematicDalilSet | null, kind: "quran" | "hadith") {
  if (!item || !set) return true;

  const localItems = kind === "quran" ? set.ayat : set.hadith;
  if (localItems.some((localItem) => normalizedTopic(localItem.rujukan) === normalizedTopic(item.reference))) return true;

  const haystack = normalizedTopic([item.reference, item.translation, item.relevance, item.tafsir, item.source].filter(Boolean).join(" "));
  const tokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  const score = set.keywords.reduce((total, keyword) => total + thematicKeywordScore(haystack, tokens, keyword), 0);
  return score > 0;
}

function normalizeEditorialKhutbahBody(text: string) {
  const withoutRukunHeadings = sanitizeGeneratedText(text)
    .replace(/^\s*(?:Judul|Tema|Bahasa)\s*:?.*$/gim, "")
    .replace(khutbahPertamaHeaderPattern, "")
    .replace(khutbahKeduaHeaderPattern, "")
    .replace(doaPenutupHeaderPattern, "")
    .replace(sittingHeaderPattern, "")
    .replace(/[^.!?\n]*(?:Allah|الله)[^.!?\n]*(?:berfirman|firman)[^.!?\n]*[.!?]?/gim, "")
    .replace(/[^.!?\n]*(?:Rasulullah|Nabi|النبي)[^.!?\n]*(?:bersabda|sabda)[^.!?\n]*[.!?]?/gim, "")
    .trim();

  const paragraphs = withoutRukunHeadings
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs.join("\n\n") : withoutRukunHeadings;
}

function interleaveKhutbahDalilBlocks(editorial: string, dalilBlocks: string[]) {
  const trimmedBlocks = dalilBlocks.map((block) => block.trim()).filter(Boolean);
  if (trimmedBlocks.length === 0) return editorial.trim();

  const paragraphs = editorial
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return trimmedBlocks.join("\n\n");
  if (paragraphs.length === 1) return [paragraphs[0], ...trimmedBlocks].join("\n\n");
  if (paragraphs.length === 2) return [paragraphs[0], trimmedBlocks[0], paragraphs[1], trimmedBlocks[1]].filter(Boolean).join("\n\n");

  const insertIndexes =
    trimmedBlocks.length === 1
      ? [Math.min(paragraphs.length - 1, Math.max(1, Math.ceil(paragraphs.length / 2) - 1))]
      : [
          Math.min(paragraphs.length - 1, Math.max(1, Math.floor(paragraphs.length / 3))),
          Math.min(paragraphs.length - 1, Math.max(2, Math.floor((paragraphs.length * 2) / 3)))
        ];

  const result: string[] = [];
  let blockIndex = 0;

  paragraphs.forEach((paragraph, index) => {
    result.push(paragraph);
    while (blockIndex < trimmedBlocks.length && insertIndexes[blockIndex] === index) {
      result.push(trimmedBlocks[blockIndex]);
      blockIndex++;
    }
  });

  while (blockIndex < trimmedBlocks.length) {
    result.push(trimmedBlocks[blockIndex]);
    blockIndex++;
  }

  return result.join("\n\n");
}

export function composeTemplatedRukunKhutbah(
  jenis: string,
  parameters: Record<string, unknown>,
  editorialBody: string,
  retrievedDalil?: PromptDalilContext,
  variationSeed = ""
) {
  const bahasa = String(parameters.bahasa ?? "Indonesia");
  const language = normalizeLanguage(bahasa);
  const label = fallbackLabelFor(jenis, language);
  const labels = fallbackLabels[language];
  const tema = topicFromParameters(parameters);
  const seed = `${jenis}:${bahasa}:${tema}:${variationSeed || "ai-composed"}`;
  const takbirSembilan =
    "اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ.";
  const takbirTujuh =
    "اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ، اَللهُ أَكْبَرُ.";
  const selectedDalil = selectedDalilFor(jenis, tema, seed);
  const thematicSet = matchingThematicDalilSet(jenis, tema);
  const retrievedQuran = thematicPromptDalilItemIsRelevant(retrievedDalil?.quran[0], thematicSet, "quran") ? retrievedDalil?.quran[0] : undefined;
  const retrievedHadith = thematicPromptDalilItemIsRelevant(retrievedDalil?.hadith[0], thematicSet, "hadith") ? retrievedDalil?.hadith[0] : undefined;
  const ayat = promptDalilItemToText(retrievedQuran, selectedDalil.ayat);
  const hadith = promptDalilItemToText(retrievedHadith, selectedDalil.hadith);
  const firstTakbir = jenis === "idul-fitri" || jenis === "idul-adha" ? `${takbirSembilan}\n\n` : "";
  const secondTakbir = jenis === "idul-fitri" || jenis === "idul-adha" ? takbirTujuh : "";
  const editorial = normalizeEditorialKhutbahBody(editorialBody) || khutbahDeepeningFor(jenis, language, tema, selectedDalil.label);
  const editorialWithDalil = interleaveKhutbahDalilBlocks(editorial, [
    `${QURAN_HEADING}
${ayat.arab}
${meaningLineFor(ayat, language)}`,
    `${HADITH_HEADING}
${hadith.arab}
${meaningLineFor(hadith, language)}`
  ]);
  const output = `${label}

${labels.topic}: ${tema}
${labels.language}: ${bahasa}

Khutbah Pertama
${firstTakbir}${pick(khutbahArabicVariants.hamdalah, seed, 1)}

${pick(khutbahArabicVariants.syahadat, seed, 12)}

${pick(khutbahArabicVariants.shalawat, seed, 3)}

${pick(khutbahArabicVariants.wasiat, seed, 5)}

${audienceFor(jenis, language)}, ${takwaIntroFor(language)}

Isi Khutbah
${editorialWithDalil}

Penutup Khutbah Pertama
${pick(khutbahArabicVariants.penutupPertama, seed, 9)}

Khutbah Kedua
${secondKhutbahArabicOnly(secondTakbir, seed)}`;

  return language === "Ogan (Baturaja)" ? localizeOganBaturajaText(output) : output;
}

function fallbackGeneralNaskah(
  jenis: string,
  label: string,
  bahasa: string,
  tema: string,
  variationSeed = "",
  parameters: Record<string, unknown> = {}
) {
  const language = normalizeLanguage(bahasa);
  const labels = fallbackLabels[language];
  const seed = `${jenis}:${bahasa}:${tema}:${variationSeed}`;
  const pembuka = pick(khutbahArabicVariants.hamdalah, seed, 20);
  const shalawat = pick(khutbahArabicVariants.shalawat, seed, 21);
  const selectedDalil = selectedDalilFor(jenis, tema, seed);
  const ayat = selectedDalil.ayat;
  const hadith = selectedDalil.hadith;
  const doa = pick(khutbahArabicVariants.doaPenutup, seed, 24);
  if (jenis === "nikah") {
    const names = coupleNameText(parameters);
    const wedding = weddingCopyFor(language, tema, names);
    const weddingAyat = selectedDalil.ayat;
    const weddingHadith = selectedDalil.hadith;
    const wasiatTakwa = pick(khutbahArabicVariants.wasiat, seed, 22);

    return `${label}

${labels.topic}: ${tema}
${labels.language}: ${bahasa}

${labels.opening}
${pembuka}
${shalawat}

اَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُوْلُ اللهِ.

${wasiatTakwa}

${labels.weddingIntro}
${wedding.intro}

${labels.weddingAdvice}
${QURAN_HEADING}
${weddingAyat.arab}
${meaningLineFor(weddingAyat, language)}

${HADITH_HEADING}
${weddingHadith.arab}
${meaningLineFor(weddingHadith, language)}

${wedding.advice}
${"extendedAdvice" in wedding ? `\n\n${wedding.extendedAdvice}` : ""}

${labels.familyMessage}
${wedding.family}

${labels.prayer}
بَارَكَ اللهُ لَكُمَا، وَبَارَكَ عَلَيْكُمَا، وَجَمَعَ بَيْنَكُمَا فِيْ خَيْرٍ.

${weddingPersonalPrayerFor(language, tema, names.couple)}

${doa}

${wedding.closing}`;
  }

  const bodyIntro = generalIntroFor(jenis, language, tema);
  const reflection = reflectionFor(language, seed);
  const keyPoints = generalKeyPointsFor(language, tema);

  return `${label}

${labels.topic}: ${tema}
${labels.language}: ${bahasa}

${labels.opening}
${pembuka}
${shalawat}

${labels.introduction}
${bodyIntro}

${labels.mainContent}
${labels.dalil}
${ayat.arab}
${meaningLineFor(ayat, language)}

${hadith.arab}
${meaningLineFor(hadith, language)}

${labels.reflection}
${reflection} ${reflectionClosingFor(language)}

${jenis === "ceramah" ? `${ceramahExpansionFor(language, tema, selectedDalil.label)}\n\n` : ""}${jenis === "kultum" ? `${labels.practical}\n${kultumExpansionFor(language, tema, selectedDalil.label)}\n\n` : ""}${labels.keyPoints}
1. ${keyPoints[0]}
2. ${keyPoints[1]}
3. ${keyPoints[2]}

${labels.closing}
${doa}

${generalClosingFor(language)}`;
}

export function fallbackNaskah(jenis: string, parameters: Record<string, unknown>) {
  const bahasa = String(parameters.bahasa ?? "Indonesia");
  const language = normalizeLanguage(bahasa);
  const label = fallbackLabelFor(jenis, language);
  const variationSeed = String(parameters.__variationSeed ?? "");
  const tema = topicFromParameters(parameters);
  const localizeFallback = (text: string) => (language === "Ogan (Baturaja)" ? localizeOganBaturajaText(text) : text);

  if (jenis === "khutbah-jumat" || jenis === "idul-fitri" || jenis === "idul-adha") {
    return localizeFallback(fallbackRukunKhutbah(jenis, label, bahasa, tema, variationSeed));
  }

  return localizeFallback(fallbackGeneralNaskah(jenis, label, bahasa, tema, variationSeed, parameters));
}

function normalizeRepeatedDalilLine(line: string) {
  return line
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function isLongArabicDalilLine(line: string) {
  return (line.match(/[\u0600-\u06FF]/g) ?? []).length >= 24;
}

function isTranslationLineAfterDuplicateDalil(line: string) {
  const trimmed = line.trim();
  return /^(?:arti|terjemah(?:an)?|makna)\s*:/i.test(trimmed) || /^["“][^"”]+["”]\s*\([^)]+\)\s*$/i.test(trimmed);
}

export function dedupeRepeatedDalilBlocks(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];
  const seenArabic = new Set<string>();

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (isLongArabicDalilLine(line)) {
      const normalized = normalizeRepeatedDalilLine(line);
      if (normalized && seenArabic.has(normalized)) {
        while (index + 1 < lines.length && isTranslationLineAfterDuplicateDalil(lines[index + 1])) {
          index++;
        }
        continue;
      }
      if (normalized) seenArabic.add(normalized);
    }

    result.push(line);
  }

  return result.join("\n");
}

export function injectRetrievedDalil(text: string, retrievedDalil?: PromptDalilContext): string {
  if (!retrievedDalil) return dedupeRepeatedDalilBlocks(text);

  const lines = text.split("\n");
  const resultLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (ayatHeaderPattern.test(line)) {
      resultLines.push(line);
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        if (
          nextLine.trim() === "" ||
          ayatHeaderPattern.test(nextLine) ||
          hadithHeaderPattern.test(nextLine) ||
          /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’`: -]{1,80}:?$/.test(nextLine.trim())
        ) {
          break;
        }
        i++;
      }

      if (retrievedDalil.quran && retrievedDalil.quran.length > 0) {
        const quran = retrievedDalil.quran[0];
        if (quran.arab && quran.translation) {
          resultLines.push(quran.arab);
          resultLines.push(`Arti: ${quran.translation} (${quran.reference})`);
        }
      }
      continue;
    }

    if (hadithHeaderPattern.test(line)) {
      resultLines.push(line);
      i++;

      while (i < lines.length) {
        const nextLine = lines[i];
        if (
          nextLine.trim() === "" ||
          ayatHeaderPattern.test(nextLine) ||
          hadithHeaderPattern.test(nextLine) ||
          /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’`: -]{1,80}:?$/.test(nextLine.trim())
        ) {
          break;
        }
        i++;
      }

      if (retrievedDalil.hadith && retrievedDalil.hadith.length > 0) {
        const hadith = retrievedDalil.hadith[0];
        if (hadith.arab && hadith.translation) {
          resultLines.push(hadith.arab);
          const gradeInfo = hadith.grade ? ` [Derajat: ${hadith.grade}]` : "";
          const takhrijInfo = hadith.takhrij ? ` - ${hadith.takhrij}` : "";
          resultLines.push(`Arti: ${hadith.translation} (${hadith.reference}${gradeInfo}${takhrijInfo})`);
        }
      }
      continue;
    }

    resultLines.push(line);
    i++;
  }

  return dedupeRepeatedDalilBlocks(resultLines.join("\n"));
}
