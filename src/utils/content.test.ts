import { describe, expect, test } from "bun:test";
import {
  buildPrompt,
  completeMissingSecondKhutbah,
  fallbackNaskah,
  hasContextLeak,
  hasSubstantialArabicClosingPrayer,
  hasSubstantialArabicOpening,
  injectRetrievedDalil,
  isGeneratedTextAcceptable,
  isKhutbahSecondSectionArabicOnly,
  isKhutbahJumatSecondSectionArabicOnly,
  matchesTargetLanguage,
  meetsMinimumLength,
  minimumWordCountFor,
  missingRequiredArabicSections,
  normalizeLanguage,
  sanitizeGeneratedText,
  titleFromParameters,
  validateContentParameters,
  wordCount,
  type PromptDalilContext
} from "./content";

describe("content utilities", () => {
  test("titleFromParameters uses content label and first available topic field", () => {
    expect(titleFromParameters("khutbah-jumat", { temaUtama: "Menjaga amanah" })).toBe(
      "Khutbah Jumat: Menjaga amanah"
    );
    expect(titleFromParameters("khutbah-jumat", { temaUtama: "shalat", subTema: "shalat sunah" })).toBe(
      "Khutbah Jumat: shalat - shalat sunah"
    );
    expect(titleFromParameters("kultum", { topikSingkat: "Syukur harian" })).toBe("Kultum: Syukur harian");
    expect(titleFromParameters("unknown", {})).toBe("Naskah: Tanpa Tema");
  });

  test("validateContentParameters reports missing required fields with friendly labels", () => {
    expect(validateContentParameters("ceramah", { topik: "  " })).toBe("Topik wajib diisi.");
    expect(validateContentParameters("nikah", {})).toBe("Tema pesan pernikahan wajib diisi.");
    expect(validateContentParameters("idul-fitri", {})).toBe("");
  });

  test("buildPrompt includes only filled parameters", () => {
    const prompt = buildPrompt("ceramah", {
      bahasa: "Indonesia",
      topik: "Menjaga lisan",
      fokusAkurasi: "maksimal",
      gayaBahasaNaskah: "natural-jelas",
      strategiDalil: "sangat-relevan",
      kosong: " ",
      nihil: null
    });

    expect(prompt).toContain("Tulis Ceramah Umum FINAL");
    expect(prompt).toContain("- bahasa: Indonesia");
    expect(prompt).toContain("- topik: Menjaga lisan");
    expect(prompt).not.toContain("kosong");
    expect(prompt).not.toContain("nihil");
    expect(prompt).toContain("Bahasa target: Indonesia");
    expect(prompt).toContain("Jangan terlalu ringkas");
    expect(prompt).toContain("Targetkan 1300-1800 kata untuk ceramah");
    expect(prompt).toContain("Isi utama minimal 8 paragraf narasi");
    expect(prompt).toContain("Jangan tampilkan analisis");
    expect(prompt).toContain("Naskah harus terdiri dari");
    expect(prompt).toContain("Standar editorial:");
    expect(prompt).toContain("Akurasi isi wajib sangat ketat");
    expect(prompt).toContain("Bahasa harus natural, jelas, dan enak dibacakan");
    expect(prompt).toContain("Dalil wajib benar-benar melayani tema yang dipilih");
    expect(prompt).toContain("- Fokus akurasi: maksimal");
  });

  test("buildPrompt aligns kultum and khutbah nikah length guidance with quality floor", () => {
    const kultumPrompt = buildPrompt("kultum", { bahasa: "Indonesia", topikSingkat: "Syukur harian" });
    const nikahPrompt = buildPrompt("nikah", { bahasa: "Indonesia", temaPesan: "Sakinah mawaddah rahmah" });
    const namedNikahPrompt = buildPrompt("nikah", {
      bahasa: "Indonesia",
      mempelaiPria: "Ahmad",
      mempelaiWanita: "Fatimah",
      temaPesan: "Komunikasi dalam rumah tangga"
    });

    expect(kultumPrompt).toContain("Targetkan 700-900 kata untuk kultum");
    expect(kultumPrompt).toContain("minimal 4 paragraf narasi");
    expect(kultumPrompt).toContain("Kesesuaian tema Kultum");
    expect(kultumPrompt).toContain('Semua bagian Kultum wajib spesifik membahas "Syukur harian"');
    expect(nikahPrompt).toContain("Targetkan 1100-1500 kata untuk khutbah nikah");
    expect(nikahPrompt).toContain("Nasihat untuk mempelai minimal 6 paragraf narasi");
    expect(nikahPrompt).toContain("Kesesuaian tema Khutbah Nikah");
    expect(namedNikahPrompt).toContain("Mempelai pria: Ahmad");
    expect(namedNikahPrompt).toContain("Mempelai wanita: Fatimah");
    expect(namedNikahPrompt).toContain('Sebutkan pasangan sebagai "Ahmad dan Fatimah"');
    expect(namedNikahPrompt).toContain("menjaga lisan dan akhlak sosial");
    expect(namedNikahPrompt).toContain("QS. Qaf: 18");
  });

  test("buildPrompt chooses specific marriage-theme dalil instead of always generic family dalil", () => {
    const komunikasi = buildPrompt("nikah", {
      bahasa: "Indonesia",
      temaPesan: "Komunikasi dalam rumah tangga"
    });
    const nafkah = buildPrompt("nikah", {
      bahasa: "Indonesia",
      temaPesan: "Amanah nafkah"
    });
    const sabar = buildPrompt("nikah", {
      bahasa: "Indonesia",
      temaPesan: "Sabar dan saling memaafkan"
    });
    const sakinah = buildPrompt("nikah", {
      bahasa: "Indonesia",
      temaPesan: "Sakinah mawaddah rahmah"
    });

    expect(komunikasi).toContain("menjaga lisan dan akhlak sosial");
    expect(komunikasi).not.toContain("QS. Ar-Rum: 21");
    expect(nafkah).toContain("amanah dan kejujuran");
    expect(sabar).toContain("sabar dan keteguhan");
    expect(sakinah).toContain("keluarga dan pernikahan");
  });

  test("buildPrompt chooses specific dalil for istri shalihah instead of generic marriage package", () => {
    const kultumPrompt = buildPrompt("kultum", {
      bahasa: "Indonesia",
      topikSingkat: "Istri shalihah"
    });
    const ceramahPrompt = buildPrompt("ceramah", {
      bahasa: "Indonesia",
      topik: "Menjadi istri shalihah yang menenangkan rumah"
    });

    for (const prompt of [kultumPrompt, ceramahPrompt]) {
      expect(prompt).toContain("istri shalihah dan pasangan yang meneguhkan iman");
      expect(prompt).toContain("QS. An-Nisa: 34");
      expect(prompt).toContain("QS. Al-Furqan: 74");
      expect(prompt).toContain("sebaik-baik perhiasan dunia adalah wanita yang salehah");
      expect(prompt).not.toContain("QS. At-Taghabun: 16");
      expect(prompt).not.toContain("hendaklah ia berkata baik atau diam");
    }
  });

  test("buildPrompt strongly instructs selected local language", () => {
    const jawaPrompt = buildPrompt("khutbah-jumat", { bahasa: "Jawa", temaUtama: "Amanah" });
    const arabPrompt = buildPrompt("ceramah", { bahasa: "Arab", topik: "Sabar" });
    const oganPrompt = buildPrompt("ceramah", { bahasa: "Ogan (Baturaja)", topik: "Sabar" });

    expect(jawaPrompt).toContain("Bahasa target: Jawa");
    expect(jawaPrompt).toContain("jangan menulis narasi, transisi, terjemah dalil");
    expect(jawaPrompt).toContain("Targetkan 1500-2000 kata");
    expect(jawaPrompt).toContain("Doa untuk kaum mukminin harus digabungkan dalam rangkaian doa khutbah kedua");
    expect(oganPrompt).toContain("Bahasa target: Ogan (Baturaja)");
    expect(oganPrompt).toContain("bahasa Ogan dialek Baturaja");
    expect(oganPrompt).toContain("kite, jeme, dang, nian, pacak, idak, nak, bae, galak, dusun");
    expect(arabPrompt).toContain("Bahasa target: Arab");
    expect(arabPrompt).toContain("Semua teks Arab, termasuk narasi biasa, wajib memakai harakat");
  });

  test("normalizes and detects Ogan Baturaja language", () => {
    expect(normalizeLanguage("Bahasa Ogan dialek Baturaja")).toBe("Ogan (Baturaja)");
    expect(matchesTargetLanguage("Jamaah sekalian, kite pacak ngajaga amanah dalam dusun dan keluarge.", "Ogan")).toBe(true);
    expect(matchesTargetLanguage("Hadirin yang dirahmati Allah, mari menjaga amanah.", "Ogan")).toBe(false);
  });

  test("rejects mixed-language prose when target language is specific", () => {
    expect(
      matchesTargetLanguage(
        "Para jamaah ingkang dipun rahmati Allah, mugi tansah eling. Setelah itu kita harus menjaga amanah dalam kehidupan sehari-hari.",
        "Jawa"
      )
    ).toBe(false);
    expect(
      matchesTargetLanguage(
        "Saderek sadaya mugia tiasa ngajaga amanah. Setelah itu kita perlu memperbaiki diri dalam kehidupan masyarakat.",
        "Sunda"
      )
    ).toBe(false);
    expect(
      matchesTargetLanguage(
        "Jamaah sekalian, kite pacak jage amanah. Setelah itu kita harus menjaga amanah dalam kehidupan sehari-hari.",
        "Ogan (Baturaja)"
      )
    ).toBe(false);
    expect(
      matchesTargetLanguage(
        "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِيْنَ. Setelah itu kita menjaga amanah dalam masyarakat dan kehidupan sehari-hari.",
        "Arab"
      )
    ).toBe(false);
  });

  test("isGeneratedTextAcceptable rejects mixed-language generated drafts", () => {
    const mixedJawaDraft = [
      "Judul: Amanah",
      "Pembukaan",
      "Para jamaah ingkang dipun rahmati Allah, mugi tansah eling marang amanah. Setelah itu kita perlu menjaga amanah dalam keluarga dan masyarakat.",
      "Allah SWT berfirman dalam AlQuran",
      "اِنَّ اللّٰهَ يَأْمُرُكُمْ اَنْ تُؤَدُّوا الْاَمٰنٰتِ اِلٰى اَهْلِهَا",
      "Tegesipun: Allah dhawuh supados amanah dipun paringaken dhateng ingkang kagungan hak.",
      "Rujukan: QS. An-Nisa: 58",
      "Rasulullah SAW bersabda",
      "آيَةُ الْمُنَافِقِ ثَلَاثٌ، اِذَا حَدَّثَ كَذَبَ، وَاِذَا وَعَدَ اَخْلَفَ، وَاِذَا اؤْتُمِنَ خَانَ",
      "Tegesipun: Tandha munafik wonten tiga.",
      "Rujukan: HR. Bukhari dan Muslim",
      "Isi Utama",
      "Amanah kedah dipun jaga kanthi temen. Dalam pekerjaan sehari-hari, kita harus jujur dan tidak menyia-nyiakan kepercayaan.",
      "Pesan Praktis",
      "Jaga lisan, jaga janji, lan jaga titipan.",
      "Penutup",
      "Mugi Allah paring pitulungan dhateng kita sedaya."
    ].join("\n\n");

    expect(matchesTargetLanguage(mixedJawaDraft, "Jawa")).toBe(false);
    expect(isGeneratedTextAcceptable("ceramah", mixedJawaDraft, { bahasa: "Jawa" })).toBe(false);
  });

  test("rejects indonesia output when local-language markers are mixed in", () => {
    expect(
      matchesTargetLanguage(
        "Hadirin yang dirahmati Allah, mari menjaga amanah dalam kehidupan masyarakat dan keluarga kita.",
        "Indonesia"
      )
    ).toBe(true);
    expect(
      matchesTargetLanguage(
        "Hadirin yang dirahmati Allah, mari menjaga amanah. Mugi kita tansah eling lan boten sembrana.",
        "Indonesia"
      )
    ).toBe(false);
  });

  test("fallbackNaskah localizes Ogan Baturaja prose", () => {
    const draft = fallbackNaskah("ceramah", { bahasa: "Ogan (Baturaja)", topik: "Sabar" });

    expect(draft).toContain("Bahasa: Ogan (Baturaja)");
    expect(draft).toMatch(/\b(kite|pacak|idak|jeme|nian|griye|keluarge)\b/i);
    expect(draft).not.toContain("Mari kita");
    expect(matchesTargetLanguage(draft, "Ogan (Baturaja)")).toBe(true);
  });

  test("buildPrompt requires full Arabic structure for Idul khutbah", () => {
    const fitriPrompt = buildPrompt("idul-fitri", { tema: "Syukur setelah Ramadhan" });
    const adhaPrompt = buildPrompt("idul-adha", { tema: "Ikhlas berkurban" });
    const jumatPrompt = buildPrompt("khutbah-jumat", { temaUtama: "Amanah publik" });

    for (const prompt of [fitriPrompt, adhaPrompt]) {
      expect(prompt).toContain("STYLE PROFILE: dakwah.id");
      expect(prompt).toContain("Takbir Arab berharakat sebanyak 9 kali");
      expect(prompt).toContain("takbir Arab 7 kali tanpa heading");
      expect(prompt).toContain("Mukadimah Arab berharakat");
      expect(prompt).toContain("Allah SWT berfirman dalam AlQuran berisi ayat Arab berharakat");
      expect(prompt).toContain("Rasulullah SAW bersabda berisi hadits Arab berharakat");
      expect(prompt).toContain('Setelah heading "Khutbah Kedua", seluruh isi harus hanya teks Arab berharakat');
      expect(prompt).toContain('Jangan tulis heading "Pesan Praktis", "Doa Penutup", "Takbir Pembuka Kedua"');
      expect(prompt).toContain('Jangan membuat heading terpisah "Doa untuk Kaum Mukminin"');
      expect(prompt).not.toContain("Rukun 1: Hamdalah Arab berharakat");
    }
    expect(jumatPrompt).toContain("STYLE PROFILE: dakwah.id (Khutbah Jumat)");
    expect(jumatPrompt).toContain('Setelah heading "Khutbah Kedua", seluruh isi harus hanya teks Arab berharakat');
    expect(jumatPrompt).toContain('Jangan tulis heading "Pesan Praktis", "Doa Penutup"');
  });

  test("buildPrompt gives thematic dalil guidance for selected theme", () => {
    const amanahPrompt = buildPrompt("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "Menjaga amanah publik" });
    const sabarPrompt = buildPrompt("kultum", { bahasa: "Indonesia", topikSingkat: "Sabar saat mendapat ujian" });
    const shalatSunahPrompt = buildPrompt("khutbah-jumat", {
      bahasa: "Indonesia",
      temaUtama: "shalat",
      subTema: "shalat sunah"
    });

    expect(amanahPrompt).toContain("Tema, ayat Al-Quran, hadits, isi utama");
    expect(amanahPrompt).toContain("QS. An-Nisa: 58");
    expect(amanahPrompt).toContain("apabila diberi amanah ia berkhianat");
    expect(sabarPrompt).toContain("QS. Al-Baqarah: 153");
    expect(sabarPrompt).toContain("Sungguh menakjubkan keadaan seorang mukmin");
    expect(shalatSunahPrompt).toContain("Fokus pembahasan utama: shalat - shalat sunah");
    expect(shalatSunahPrompt).toContain("QS. Al-'Ankabut: 45");
    expect(shalatSunahPrompt).toContain("dua belas rakaat sunah selain shalat wajib");
  });

  test("buildPrompt prioritizes specific dalil for pergaulan bebas across content types", () => {
    const cases = [
      buildPrompt("khutbah-jumat", {
        bahasa: "Indonesia",
        temaUtama: "Perisai iman di tengah badai pergaulan bebas",
        subTema: "Pesan untuk pemuda kampus"
      }),
      buildPrompt("idul-fitri", {
        bahasa: "Indonesia",
        tema: "Menjaga kehormatan diri setelah Ramadhan dari pergaulan bebas"
      }),
      buildPrompt("idul-adha", {
        bahasa: "Indonesia",
        tema: "Pengorbanan ego untuk menjauhi seks bebas"
      }),
      buildPrompt("nikah", {
        bahasa: "Indonesia",
        temaPesan: "Menjaga kehormatan dan batas pergaulan sebelum menikah"
      }),
      buildPrompt("ceramah", {
        bahasa: "Indonesia",
        topik: "Bahaya seks bebas bagi pemuda kampus"
      }),
      buildPrompt("kultum", {
        bahasa: "Indonesia",
        topikSingkat: "Menjauhi zina dan pergaulan bebas"
      })
    ];

    for (const prompt of cases) {
      expect(prompt).toContain("menjauhi zina, pergaulan bebas, dan menjaga kehormatan");
      expect(prompt).toContain("QS. Al-Isra: 32");
      expect(prompt).toContain("Janganlah kamu mendekati zina");
      expect(prompt).toContain("Janganlah seorang laki-laki berduaan");
      expect(prompt).not.toContain("QS. Al-Kahf: 13");
    }
  });

  test("sanitizeGeneratedText removes leaked reasoning and markdown wrappers", () => {
    const cleaned = sanitizeGeneratedText(`Need cautious if hadith authenticity maybe Hasan.
Let's craft concise-medium maybe 1000 words.
**Khutbah Pertama**
### Pembukaan
> _“Wahai orang-orang yang beriman.”_
---
Isi khutbah.`);

    expect(cleaned).toStartWith("Khutbah Pertama");
    expect(cleaned).toContain("Pembukaan");
    expect(cleaned).toContain("_“Wahai orang-orang yang beriman.”_");
    expect(cleaned).not.toContain("Need cautious");
    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("###");
    expect(cleaned).not.toContain("---");
  });

  test("fallbackNaskah produces readable draft with selected language and theme", () => {
    const draft = fallbackNaskah("ceramah", { bahasa: "Sunda", topik: "Sabar" });

    expect(draft).toContain("Ceramah Umum");
    expect(draft).toContain("Tema: Sabar");
    expect(draft).toContain("Basa: Sunda");
    expect(draft).toContain("Hartina:");
    expect(draft).toContain("Poin-Poin Utama");
    expect(matchesTargetLanguage(draft, "Sunda")).toBe(true);
    expect(matchesTargetLanguage(draft, "Jawa")).toBe(false);
  });

  test("fallbackNaskah localizes Jawa and Arab prose", () => {
    const jawa = fallbackNaskah("khutbah-jumat", { bahasa: "Jawa", temaUtama: "Amanah" });
    const arab = fallbackNaskah("ceramah", { bahasa: "Arab", topik: "Sabar" });
    const arabKhutbah = fallbackNaskah("khutbah-jumat", { bahasa: "Arab", temaUtama: "Amanah" });

    expect(jawa).toContain("Basa: Jawa");
    expect(jawa).toContain("ingkang dipun rahmati Allah");
    expect(jawa).toContain("Tegesipun:");
    expect(matchesTargetLanguage(jawa, "Jawa")).toBe(true);
    expect(arab).toContain("اَللُّغَةُ: Arab");
    expect(arab).toContain("اَلْمَعْنَى:");
    expect(matchesTargetLanguage(arab, "Arab")).toBe(true);
    expect(isGeneratedTextAcceptable("khutbah-jumat", arabKhutbah, { bahasa: "Arab" })).toBe(true);
    expect(hasSubstantialArabicOpening("khutbah-jumat", arabKhutbah)).toBe(true);
    expect(hasSubstantialArabicClosingPrayer("khutbah-jumat", arabKhutbah)).toBe(true);
  });

  test("length quality helpers reject overly short khutbah drafts", () => {
    const shortDraft = "Khutbah Pertama\nIsi ringkas.\n\nKhutbah Kedua\nDoa singkat.";
    const fullDraft = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "Amanah", __variationSeed: "quality" });

    expect(minimumWordCountFor("khutbah-jumat", { durasi: "sedang" })).toBe(1100);
    expect(meetsMinimumLength("khutbah-jumat", shortDraft, { durasi: "sedang" })).toBe(false);
    expect(meetsMinimumLength("khutbah-jumat", fullDraft, { durasi: "pendek" })).toBe(true);
  });

  test("ceramah minimum length stays above kultum for generated output quality", () => {
    expect(minimumWordCountFor("kultum", { durasi: "pendek" })).toBe(500);
    expect(minimumWordCountFor("kultum", { durasi: "sedang" })).toBe(700);
    expect(minimumWordCountFor("kultum", { durasi: "panjang" })).toBe(900);
    expect(minimumWordCountFor("ceramah", { durasi: "pendek" })).toBe(900);
    expect(minimumWordCountFor("ceramah", { durasi: "sedang" })).toBe(1300);
    expect(minimumWordCountFor("ceramah", { durasi: "panjang" })).toBe(1800);
    expect(minimumWordCountFor("ceramah", { durasi: "sedang" })).toBeGreaterThan(
      minimumWordCountFor("kultum", { durasi: "sedang" })
    );
  });

  test("khutbah nikah minimum length follows requested duration", () => {
    expect(minimumWordCountFor("nikah", { durasi: "pendek" })).toBe(800);
    expect(minimumWordCountFor("nikah", { durasi: "sedang" })).toBe(1100);
    expect(minimumWordCountFor("nikah", { durasi: "panjang" })).toBe(1500);
    expect(minimumWordCountFor("nikah", { durasi: "sedang" })).toBeGreaterThan(
      minimumWordCountFor("kultum", { durasi: "sedang" })
    );
  });

  test("fallback khutbah nikah uses couple names and selected marriage theme", () => {
    const draft = fallbackNaskah("nikah", {
      bahasa: "Indonesia",
      mempelaiPria: "Ahmad",
      mempelaiWanita: "Fatimah",
      temaPesan: "Komunikasi dalam rumah tangga",
      durasi: "sedang"
    });

    expect(draft).toContain("Ahmad dan Fatimah");
    expect(draft).toContain("Komunikasi dalam rumah tangga");
    expect(draft).toContain("cara berbicara setelah akad");
    expect(draft).toContain("Banyak masalah rumah tangga bukan lahir dari kurangnya cinta");
    expect(meetsMinimumLength("nikah", draft, { durasi: "sedang" })).toBe(true);
  });

  test("fallback khutbah nikah avoids numbered template prose and frames negative themes as problems", () => {
    const draft = fallbackNaskah("nikah", {
      bahasa: "Indonesia",
      mempelaiPria: "ini",
      mempelaiWanita: "itu",
      temaPesan: "saling curiga",
      durasi: "sedang"
    });

    expect(draft).toContain("ini dan itu");
    expect(draft).toContain("menumbuhkan saling percaya dan mengikis prasangka");
    expect(draft).toContain("Jangan rawat curiga");
    expect(draft).not.toContain("Nasihat pertama");
    expect(draft).not.toContain("Nasihat kedua");
    expect(draft).not.toContain("menjadikan saling curiga");
    expect(meetsMinimumLength("nikah", draft, { durasi: "sedang" })).toBe(true);
  });

  test("fallback kultum meets the medium duration minimum", () => {
    const draft = fallbackNaskah("kultum", {
      bahasa: "Indonesia",
      topikSingkat: "Syukur harian",
      durasi: "sedang"
    });

    expect(meetsMinimumLength("kultum", draft, { durasi: "sedang" })).toBe(true);
  });

  test("fallback ceramah is longer than kultum and meets the medium duration minimum", () => {
    const ceramah = fallbackNaskah("ceramah", {
      bahasa: "Indonesia",
      topik: "Menjaga amanah",
      durasi: "sedang"
    });
    const kultum = fallbackNaskah("kultum", {
      bahasa: "Indonesia",
      topikSingkat: "Menjaga amanah",
      durasi: "sedang"
    });

    expect(ceramah).toContain("Isi Utama");
    expect(meetsMinimumLength("ceramah", ceramah, { durasi: "sedang" })).toBe(true);
    expect(wordCount(ceramah)).toBeGreaterThan(wordCount(kultum));
  });

  test("fallback kultum adapts practical advice to the selected theme", () => {
    const syukur = fallbackNaskah("kultum", {
      bahasa: "Indonesia",
      topikSingkat: "Syukur harian",
      durasi: "sedang"
    });
    const sedekah = fallbackNaskah("kultum", {
      bahasa: "Indonesia",
      topikSingkat: "Sedekah kepada tetangga",
      durasi: "sedang"
    });
    const taubat = fallbackNaskah("kultum", {
      bahasa: "Indonesia",
      topikSingkat: "Taubat dari maksiat",
      durasi: "sedang"
    });

    expect(syukur).toContain("Syukur bukan hanya ucapan");
    expect(syukur).toContain("nikmat");
    expect(sedekah).toContain("Sedekah bukan hanya tentang jumlah uang");
    expect(sedekah).toContain("kepedulian");
    expect(taubat).toContain("Taubat bukan tanda seseorang buruk");
    expect(taubat).toContain("istighfar");
  });

  test("fallbackNaskah keeps Idul khutbah Arabic sections complete", () => {
    const draft = fallbackNaskah("idul-adha", { bahasa: "Indonesia", tema: "Ikhlas berkurban" });

    expect(draft).toContain("اَللهُ أَكْبَرُ");
    expect(draft).not.toContain("Takbir Pembuka Kedua");
    expect(draft).toMatch(/اَلْحَمْدُ|إِنَّ الْحَمْدَ/);
    expect(draft).toMatch(/أَشْهَدُ|نَشْهَدُ/);
    expect(draft).toContain("Jamaah Idul Adha");
    expect(draft).toContain("Allah SWT berfirman dalam AlQuran");
    expect(draft).toContain("Rasulullah SAW bersabda");
    expect(draft).toContain("Penutup Khutbah Pertama");
    expect(draft).not.toContain("Duduk di Antara" + " Dua Khutbah");
    expect(draft).not.toContain("Pesan Praktis");
    expect(draft).not.toContain("Doa Penutup");
    expect(draft).not.toContain("Doa untuk Kaum Mukminin");
    expect(draft).toMatch(/Khutbah Kedua[\s\S]*(?:الْمُسْلِمِيْنَ|الْمُسْلِمِينَ|الْمُؤْمِنِيْنَ|الْمُؤْمِنِينَ)/);
    expect(isKhutbahSecondSectionArabicOnly(draft)).toBe(true);
    expect(draft).not.toContain("Rukun 1:");
    expect(missingRequiredArabicSections("idul-adha", draft)).toEqual([]);
    expect(isGeneratedTextAcceptable("idul-adha", draft)).toBe(true);
  });

  test("fallback Idul Fitri does not leak Jumat context", () => {
    const draft = fallbackNaskah("idul-fitri", { bahasa: "Indonesia", tema: "silaturahmi" });

    expect(draft).toContain("Jamaah Idul Fitri");
    expect(draft).toContain("silaturahmi");
    expect(draft).not.toMatch(/shalat Jumat|Khutbah Jumat|Jumat meminta|majelis Jumat|Setiap Jumat/i);
    expect(hasContextLeak("idul-fitri", draft)).toBe(false);
    expect(isGeneratedTextAcceptable("idul-fitri", draft, { bahasa: "Indonesia" })).toBe(true);
  });

  test("Idul khutbah with Jumat context leak is rejected", () => {
    const leaked = fallbackNaskah("idul-fitri", { bahasa: "Indonesia", tema: "silaturahmi" }).replace(
      "Maka pada hari yang mulia ini",
      "Padahal Jumat meminta lebih dari itu. Maka pada hari yang mulia ini"
    );

    expect(hasContextLeak("idul-fitri", leaked)).toBe(true);
    expect(isGeneratedTextAcceptable("idul-fitri", leaked, { bahasa: "Indonesia" })).toBe(false);
  });

  test("fallbackNaskah keeps Jumat khutbah rukun complete", () => {
    const draft = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "Amanah" });

    expect(draft).toContain("Khutbah Pertama");
    expect(draft).toContain("Khutbah Kedua");
    expect(draft).toMatch(/اَلْحَمْدُ|إِنَّ الْحَمْدَ/);
    expect(draft).toMatch(/أَشْهَدُ|نَشْهَدُ/);
    expect(draft).toContain("Jamaah shalat Jumat");
    expect(draft).toContain("Allah SWT berfirman dalam AlQuran");
    expect(draft).not.toContain("Doa untuk Kaum Mukminin");
    expect(draft).toMatch(/Khutbah Kedua[\s\S]*(?:الْمُسْلِمِيْنَ|الْمُسْلِمِينَ|الْمُؤْمِنِيْنَ|الْمُؤْمِنِينَ)/);
    expect(draft).not.toContain("Pesan Praktis");
    expect(draft).not.toContain("Doa Penutup");
    expect(isKhutbahJumatSecondSectionArabicOnly(draft)).toBe(true);
    expect(draft).not.toContain("Rukun 1:");
    expect(draft).not.toContain("hari raya ini");
    expect(missingRequiredArabicSections("khutbah-jumat", draft)).toEqual([]);
    expect(isGeneratedTextAcceptable("khutbah-jumat", draft)).toBe(true);
  });

  test("khutbah validation accepts standard headings with colon", () => {
    const draft = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "Amanah" })
      .replace(/^Khutbah Pertama$/m, "Khutbah Pertama:")
      .replace(/^Allah SWT berfirman dalam AlQuran$/m, "Allah SWT berfirman dalam AlQuran:")
      .replace(/^Khutbah Kedua$/m, "Khutbah Kedua:")
      .replace(/^Doa Penutup$/m, "Doa Penutup:");

    expect(missingRequiredArabicSections("khutbah-jumat", draft)).toEqual([]);
    expect(isGeneratedTextAcceptable("khutbah-jumat", draft, { bahasa: "Indonesia" })).toBe(true);
  });

  test("can complete provider text that only misses second khutbah", () => {
    const draft = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "Amanah" });
    const incomplete = draft.replace(/Khutbah Kedua[\s\S]*$/m, "").trim();
    const completed = completeMissingSecondKhutbah("khutbah-jumat", incomplete, {
      bahasa: "Indonesia",
      temaUtama: "Amanah"
    });

    expect(completed).toContain("Khutbah Kedua");
    expect(missingRequiredArabicSections("khutbah-jumat", completed)).toEqual([]);
    expect(isGeneratedTextAcceptable("khutbah-jumat", completed, { bahasa: "Indonesia" })).toBe(true);
  });

  test("fallbackNaskah varies Arabic opening and keeps Jumat second khutbah Arabic-only", () => {
    const drafts = ["seed-a", "seed-b", "seed-c", "seed-d", "seed-e"].map((seed) =>
      fallbackNaskah("khutbah-jumat", {
        bahasa: "Indonesia",
        temaUtama: "Amanah",
        __variationSeed: seed
      })
    );
    const openings = drafts.map(
      (draft) => draft.match(/Khutbah Pertama\n([\s\S]*?)\n\nJamaah shalat Jumat/)?.[1] ?? ""
    );
    const secondKhutbahs = drafts.map((draft) => draft.match(/Khutbah Kedua\n([\s\S]*)$/)?.[1] ?? "");

    expect(new Set(openings).size).toBeGreaterThan(1);
    expect(new Set(secondKhutbahs).size).toBeGreaterThan(1);
    for (const draft of drafts) {
      expect(isKhutbahJumatSecondSectionArabicOnly(draft)).toBe(true);
      expect(isGeneratedTextAcceptable("khutbah-jumat", draft, { bahasa: "Indonesia" })).toBe(true);
      expect(hasSubstantialArabicOpening("khutbah-jumat", draft)).toBe(true);
      expect(hasSubstantialArabicClosingPrayer("khutbah-jumat", draft)).toBe(true);
    }
  });

  test("fallbackNaskah aligns ayat and hadith with selected theme", () => {
    const amanah = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "Amanah" });
    const sabar = fallbackNaskah("ceramah", { bahasa: "Indonesia", topik: "Sabar menghadapi musibah" });
    const kesabaran = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "kesabaran" });
    const nikah = fallbackNaskah("nikah", { bahasa: "Indonesia", temaPesan: "Sakinah mawaddah rahmah" });
    const shalatSunah = fallbackNaskah("khutbah-jumat", {
      bahasa: "Indonesia",
      temaUtama: "shalat",
      subTema: "shalat sunah"
    });

    expect(amanah).toMatch(/QS\. (An-Nisa: 58|Al-Anfal: 27)/);
    expect(amanah).toContain("apabila diberi amanah ia berkhianat");
    expect(sabar).toContain("QS. Al-Baqarah: 153");
    expect(sabar).toContain("HR. Muslim");
    expect(kesabaran).toContain("QS. Al-Baqarah: 153");
    expect(kesabaran).toContain("Sungguh menakjubkan keadaan seorang mukmin");
    expect(kesabaran).toContain("Sabar Bukan Pasrah Tanpa Ikhtiar");
    expect(kesabaran).toContain("Sabar dan Shalat sebagai Penolong");
    expect(kesabaran).not.toContain("QS. An-Nahl: 90");
    expect(kesabaran).not.toContain("berkata baik atau diam");
    expect(nikah).toContain("QS. Ar-Rum: 21");
    expect(nikah).toContain("Rasulullah SAW bersabda");
    expect(nikah).toContain("paling baik kepada keluarganya");
    expect(shalatSunah).toContain("Tema: shalat - shalat sunah");
    expect(shalatSunah).toMatch(/QS\. (Al-'Ankabut: 45|Al-Mu'minun: 1-2)/);
    expect(shalatSunah).toContain("HR. Muslim");
    expect(shalatSunah).toMatch(/Shalat Sunah|Rawatib|Tahajud|Dhuha|Witir|Nawafil/);
    expect(shalatSunah).not.toContain("Siapa yang beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam");
  });

  test("fallbackNaskah covers expanded thematic dalil packages", () => {
    const cases = [
      {
        params: { temaUtama: "riba", subTema: "bahaya pinjaman berbunga" },
        ayat: "QS. Al-Baqarah: 276",
        hadith: "melaknat pemakan riba"
      },
      {
        params: { temaUtama: "judi online", subTema: "slot dan taruhan" },
        ayat: "QS. Al-Ma'idah: 90",
        hadith: "Mari aku berjudi denganmu"
      },
      {
        params: { temaUtama: "kematian", subTema: "persiapan akhirat" },
        ayat: "QS. Ali 'Imran: 185",
        hadith: "pemutus segala kenikmatan"
      },
      {
        params: { temaUtama: "parenting anak remaja", subTema: "tanggung jawab keluarga" },
        ayat: "QS. Luqman: 17",
        hadith: "Setiap kalian adalah pemimpin"
      },
      {
        params: { temaUtama: "persaudaraan umat", subTema: "mencegah perpecahan" },
        ayat: "QS. Al-Hujurat: 10",
        hadith: "seperti bangunan"
      },
      {
        params: { temaUtama: "taubat", subTema: "jangan putus asa dari rahmat Allah" },
        ayat: "QS. Az-Zumar: 53",
        hadith: "lebih dari tujuh puluh kali"
      },
      {
        params: { temaUtama: "sedekah", subTema: "kepedulian kepada fakir miskin" },
        ayat: "QS. Al-Baqarah: 261",
        hadith: "Sedekah tidak akan mengurangi harta"
      },
      {
        params: { temaUtama: "berbakti kepada orang tua", subTema: "jangan durhaka" },
        ayat: "QS. Al-Isra: 23",
        hadith: "Ridha Allah"
      },
      {
        params: { temaUtama: "ikhlas", subTema: "menjauhi riya" },
        ayat: "QS. Al-Bayyinah: 5",
        hadith: "amal-amal itu bergantung pada niat"
      },
      {
        params: { temaUtama: "menuntut ilmu", subTema: "mengamalkan ilmu agama" },
        ayat: "QS. Az-Zumar: 9",
        hadith: "pemahaman dalam agama"
      },
      {
        params: { temaUtama: "tawakal", subTema: "ikhtiar dan berserah kepada Allah" },
        ayat: "QS. Ath-Thalaq: 3",
        hadith: "memberi rezeki kepada kalian sebagaimana Dia memberi rezeki kepada burung"
      },
      {
        params: { temaUtama: "istiqamah", subTema: "konsisten menjaga amal" },
        ayat: "QS. Fussilat: 30",
        hadith: "kemudian istiqamahlah"
      },
      {
        params: { temaUtama: "memanfaatkan waktu", subTema: "jangan lalai dengan umur" },
        ayat: "QS. Al-'Ashr: 1-3",
        hadith: "kesehatan dan waktu luang"
      },
      {
        params: { temaUtama: "silaturahmi", subTema: "menyambung keluarga" },
        ayat: "QS. An-Nisa: 1",
        hadith: "menyambung silaturahmi"
      },
      {
        params: { temaUtama: "dzikir", subTema: "ketenangan hati" },
        ayat: "QS. Ar-Ra'd: 28",
        hadith: "mengingat Rabbnya"
      },
      {
        params: { temaUtama: "kepemimpinan adil", subTema: "tanggung jawab pejabat" },
        ayat: "QS. An-Nahl: 90",
        hadith: "pemimpin yang adil"
      },
      {
        params: { temaUtama: "cinta Rasul", subTema: "mengikuti sunnah Nabi" },
        ayat: "QS. Al-Ahzab: 21",
        hadith: "lebih ia cintai daripada orang tuanya"
      },
      {
        params: { temaUtama: "menahan marah", subTema: "belajar memaafkan" },
        ayat: "QS. Ali 'Imran: 134",
        hadith: "mampu menguasai dirinya ketika marah"
      },
      {
        params: { temaUtama: "ghibah di media sosial", subTema: "prasangka dan mencari aib" },
        ayat: "QS. Al-Hujurat: 12",
        hadith: "sesuatu yang tidak ia sukai"
      },
      {
        params: { temaUtama: "hak tetangga", subTema: "kepedulian lingkungan" },
        ayat: "QS. An-Nisa: 36",
        hadith: "Jibril terus-menerus berpesan kepadaku tentang tetangga"
      },
      {
        params: { temaUtama: "tolong-menolong", subTema: "gotong royong dalam kebaikan" },
        ayat: "QS. Al-Ma'idah: 2",
        hadith: "selama hamba itu menolong saudaranya"
      },
      {
        params: { temaUtama: "dakwah dengan hikmah", subTema: "nasihat yang baik" },
        ayat: "QS. An-Nahl: 125",
        hadith: "Sampaikanlah dariku walaupun satu ayat"
      },
      {
        params: { temaUtama: "menjaga pandangan", subTema: "kehormatan diri pemuda" },
        ayat: "QS. An-Nur: 30",
        hadith: "Janganlah seorang laki-laki berduaan"
      },
      {
        params: { temaUtama: "tilawah Al-Quran", subTema: "belajar dan mengajarkan Quran" },
        ayat: "QS. Al-Isra: 9",
        hadith: "belajar Al-Quran dan mengajarkannya"
      },
      {
        params: { temaUtama: "memakmurkan masjid", subTema: "shalat berjamaah" },
        ayat: "QS. At-Tawbah: 18",
        hadith: "membangun masjid karena mengharap wajah Allah"
      },
      {
        params: { temaUtama: "kebersihan", subTema: "thaharah dan kesehatan ibadah" },
        ayat: "QS. Al-Baqarah: 222",
        hadith: "Bersuci adalah separuh iman"
      }
    ];

    for (const item of cases) {
      const draft = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", ...item.params });

      expect(draft).toContain(item.ayat);
      expect(draft).toContain(item.hadith);
      expect(draft).toContain(`Tema: ${item.params.temaUtama} - ${item.params.subTema}`);
    }
  });

  test("khutbah without syahadat in first mukadimah is rejected", () => {
    const draft = fallbackNaskah("khutbah-jumat", { bahasa: "Indonesia", temaUtama: "Amanah" });
    const withoutSyahadat = draft.replace(
      /^\s*(?:أَشْهَدُ|نَشْهَدُ)[^\n]+(?:\n|$)/m,
      ""
    );

    expect(missingRequiredArabicSections("khutbah-jumat", withoutSyahadat)).toContain("syahadat_khutbah_pertama");
    expect(isGeneratedTextAcceptable("khutbah-jumat", withoutSyahadat)).toBe(false);
  });

  test("Idul khutbah without required Arabic sections is rejected", () => {
    const draft = `Khutbah Idul Fitri

Takbir Pembuka
Allahu akbar, Allahu akbar.

Khutbah Pertama
Isi khutbah tanpa ayat dan hadits Arab.

Doa Penutup
Amin.`;

    expect(missingRequiredArabicSections("idul-fitri", draft).length).toBeGreaterThan(0);
    expect(isGeneratedTextAcceptable("idul-fitri", draft)).toBe(false);
  });

  test("validate khutbah nikah rukun and injectRetrievedDalil", () => {
    const draft = fallbackNaskah("nikah", {
      bahasa: "Indonesia",
      mempelaiPria: "Ahmad",
      mempelaiWanita: "Fatimah",
      temaPesan: "Sakinah mawaddah rahmah",
      durasi: "sedang"
    });

    expect(missingRequiredArabicSections("nikah", draft)).toEqual([]);
    expect(isGeneratedTextAcceptable("nikah", draft, { bahasa: "Indonesia" })).toBe(true);

    const incompleteDraft = draft.replace(/اَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُوْلُ اللهِ\./g, "");
    expect(missingRequiredArabicSections("nikah", incompleteDraft)).toContain("syahadat_pembukaan");

    const dalilContext: PromptDalilContext = {
      theme: "Sakinah mawaddah rahmah",
      source: "local-curated",
      quran: [
        {
          kind: "quran",
          reference: "QS. Ar-Rum: 21",
          arab: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا",
          translation: "Dan di antara tanda-tanda kekuasaan-Nya...",
          source: "curated"
        }
      ],
      hadith: [
        {
          kind: "hadith",
          reference: "HR. Tirmidzi",
          arab: "أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا",
          translation: "Orang mukmin yang paling sempurna imannya...",
          grade: "Hasan Sahih",
          takhrij: "Tirmidzi no. 1162",
          source: "curated"
        }
      ]
    };

    const injected = injectRetrievedDalil(draft, dalilContext);
    expect(injected).toContain("وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا");
    expect(injected).toContain("أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا");
    expect(injected).toContain("[Derajat: Hasan Sahih]");
  });

  test("buildPrompt includes preacher style profiles instructions when requested", () => {
    const promptTeduh = buildPrompt("ceramah", {
      bahasa: "Indonesia",
      topik: "Sabar",
      gayaRetorika: "teduh"
    });
    expect(promptTeduh).toContain("Teduh & Akademik (seperti Prof. Quraish Shihab)");

    const promptZainuddin = buildPrompt("ceramah", {
      bahasa: "Indonesia",
      topik: "Sabar",
      gayaRetorika: "zainuddin-mz"
    });
    expect(promptZainuddin).toContain("Praktis & Komunikatif (seperti KH. Zainuddin MZ)");

    const promptHamka = buildPrompt("ceramah", {
      bahasa: "Indonesia",
      topik: "Sabar",
      gayaRetorika: "buya-hamka"
    });
    expect(promptHamka).toContain("Sastra & Filosofis (seperti Buya Hamka)");
  });
});
