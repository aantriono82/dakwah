export type CaptchaChallenge = {
  difficulty: "ringan" | "sedang";
  question: string;
  answer: number;
};

type CaptchaNumbers = Record<string, number>;

type CaptchaTemplate = {
  difficulty: "ringan" | "sedang";
  pattern: RegExp;
  build: (numbers: CaptchaNumbers) => string;
  createNumbers: () => CaptchaNumbers;
  solve: (numbers: CaptchaNumbers) => number;
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTemplate(
  difficulty: "ringan" | "sedang",
  pattern: RegExp,
  build: (numbers: CaptchaNumbers) => string,
  createNumbers: () => CaptchaNumbers,
  solve: (numbers: CaptchaNumbers) => number
): CaptchaTemplate {
  return { difficulty, pattern, build, createNumbers, solve };
}

const templates: CaptchaTemplate[] = [
  createTemplate(
    "ringan",
    /^Ali punya (\d+) apel lalu membeli (\d+) lagi\. Berapa jumlah apel Ali\?$/,
    ({ a, b }) => `Ali punya ${a} apel lalu membeli ${b} lagi. Berapa jumlah apel Ali?`,
    () => ({ a: randomInt(2, 8), b: randomInt(2, 6) }),
    ({ a, b }) => a + b
  ),
  createTemplate(
    "ringan",
    /^Ada (\d+) kotak\. Tiap kotak berisi (\d+) buku\. Berapa total bukunya\?$/,
    ({ a, b }) => `Ada ${a} kotak. Tiap kotak berisi ${b} buku. Berapa total bukunya?`,
    () => ({ a: randomInt(2, 6), b: randomInt(2, 5) }),
    ({ a, b }) => a * b
  ),
  createTemplate(
    "ringan",
    /^Fatimah memiliki (\d+) kurma lalu membagikan (\d+)\. Berapa sisa kurmanya\?$/,
    ({ a, b }) => `Fatimah memiliki ${a} kurma lalu membagikan ${b}. Berapa sisa kurmanya?`,
    () => {
      const a = randomInt(8, 15);
      const b = randomInt(2, 6);
      return { a, b };
    },
    ({ a, b }) => a - b
  ),
  createTemplate(
    "sedang",
    /^Panitia menata (\d+) baris kursi\. Tiap baris ada (\d+) kursi, lalu ditambah (\d+) kursi\. Berapa total kursi\?$/,
    ({ a, b, c }) => `Panitia menata ${a} baris kursi. Tiap baris ada ${b} kursi, lalu ditambah ${c} kursi. Berapa total kursi?`,
    () => ({ a: randomInt(2, 5), b: randomInt(3, 6), c: randomInt(2, 5) }),
    ({ a, b, c }) => a * b + c
  ),
  createTemplate(
    "sedang",
    /^Disiapkan (\d+) nampan\. Tiap nampan berisi (\d+) gelas air, lalu (\d+) gelas dipakai\. Berapa sisa gelas air\?$/,
    ({ a, b, c }) => `Disiapkan ${a} nampan. Tiap nampan berisi ${b} gelas air, lalu ${c} gelas dipakai. Berapa sisa gelas air?`,
    () => ({ a: randomInt(2, 5), b: randomInt(3, 6), c: randomInt(2, 5) }),
    ({ a, b, c }) => a * b - c
  ),
  createTemplate(
    "ringan",
    /^Masjid menerima (\d+) sajadah lalu membeli (\d+) lagi\. Berapa jumlah sajadah sekarang\?$/,
    ({ a, b }) => `Masjid menerima ${a} sajadah lalu membeli ${b} lagi. Berapa jumlah sajadah sekarang?`,
    () => ({ a: randomInt(3, 9), b: randomInt(2, 6) }),
    ({ a, b }) => a + b
  ),
  createTemplate(
    "ringan",
    /^Ada (\d+) rak Al-Qur'an\. Tiap rak berisi (\d+) mushaf\. Berapa total mushaf\?$/,
    ({ a, b }) => `Ada ${a} rak Al-Qur'an. Tiap rak berisi ${b} mushaf. Berapa total mushaf?`,
    () => ({ a: randomInt(2, 5), b: randomInt(4, 8) }),
    ({ a, b }) => a * b
  ),
  createTemplate(
    "ringan",
    /^Panitia menyiapkan (\d+) piring dan (\d+) gelas\. Berapa jumlah semuanya\?$/,
    ({ a, b }) => `Panitia menyiapkan ${a} piring dan ${b} gelas. Berapa jumlah semuanya?`,
    () => ({ a: randomInt(4, 12), b: randomInt(4, 12) }),
    ({ a, b }) => a + b
  ),
  createTemplate(
    "ringan",
    /^Ibu membawa (\d+) roti untuk pengajian lalu dibagikan (\d+)\. Berapa sisa rotinya\?$/,
    ({ a, b }) => `Ibu membawa ${a} roti untuk pengajian lalu dibagikan ${b}. Berapa sisa rotinya?`,
    () => {
      const a = randomInt(8, 16);
      const b = randomInt(2, 7);
      return { a, b };
    },
    ({ a, b }) => a - b
  ),
  createTemplate(
    "ringan",
    /^Ada (\d+) baris sandal\. Tiap baris berisi (\d+) pasang\. Berapa total pasang sandal\?$/,
    ({ a, b }) => `Ada ${a} baris sandal. Tiap baris berisi ${b} pasang. Berapa total pasang sandal?`,
    () => ({ a: randomInt(2, 6), b: randomInt(3, 7) }),
    ({ a, b }) => a * b
  ),
  createTemplate(
    "ringan",
    /^Ustaz menulis (\d+) poin materi pagi hari dan (\d+) poin sore hari\. Berapa total poin materi\?$/,
    ({ a, b }) => `Ustaz menulis ${a} poin materi pagi hari dan ${b} poin sore hari. Berapa total poin materi?`,
    () => ({ a: randomInt(2, 8), b: randomInt(2, 8) }),
    ({ a, b }) => a + b
  ),
  createTemplate(
    "ringan",
    /^Remaja masjid mengumpulkan (\d+) buku lalu meminjamkan (\d+) buku\. Berapa sisa buku\?$/,
    ({ a, b }) => `Remaja masjid mengumpulkan ${a} buku lalu meminjamkan ${b} buku. Berapa sisa buku?`,
    () => {
      const a = randomInt(9, 18);
      const b = randomInt(2, 7);
      return { a, b };
    },
    ({ a, b }) => a - b
  ),
  createTemplate(
    "ringan",
    /^Terdapat (\d+) meja konsumsi\. Tiap meja memiliki (\d+) kotak makanan\. Berapa total kotak makanan\?$/,
    ({ a, b }) => `Terdapat ${a} meja konsumsi. Tiap meja memiliki ${b} kotak makanan. Berapa total kotak makanan?`,
    () => ({ a: randomInt(2, 5), b: randomInt(3, 8) }),
    ({ a, b }) => a * b
  ),
  createTemplate(
    "ringan",
    /^Bendahara mencatat pemasukan (\d+) ribu rupiah dan tambahan (\d+) ribu rupiah\. Berapa totalnya\?$/,
    ({ a, b }) => `Bendahara mencatat pemasukan ${a} ribu rupiah dan tambahan ${b} ribu rupiah. Berapa totalnya?`,
    () => ({ a: randomInt(10, 40), b: randomInt(5, 30) }),
    ({ a, b }) => a + b
  ),
  createTemplate(
    "ringan",
    /^Panitia membeli (\d+) spidol\. Sebanyak (\d+) spidol dipakai\. Berapa sisa spidol\?$/,
    ({ a, b }) => `Panitia membeli ${a} spidol. Sebanyak ${b} spidol dipakai. Berapa sisa spidol?`,
    () => {
      const a = randomInt(7, 14);
      const b = randomInt(2, 6);
      return { a, b };
    },
    ({ a, b }) => a - b
  ),
  createTemplate(
    "ringan",
    /^Ada (\d+) kelompok belajar\. Tiap kelompok terdiri dari (\d+) orang\. Berapa total orang\?$/,
    ({ a, b }) => `Ada ${a} kelompok belajar. Tiap kelompok terdiri dari ${b} orang. Berapa total orang?`,
    () => ({ a: randomInt(2, 6), b: randomInt(3, 7) }),
    ({ a, b }) => a * b
  ),
  createTemplate(
    "ringan",
    /^Kotak infak pertama berisi (\d+) lembar uang dan kotak kedua berisi (\d+) lembar uang\. Berapa jumlah lembar uang\?$/,
    ({ a, b }) => `Kotak infak pertama berisi ${a} lembar uang dan kotak kedua berisi ${b} lembar uang. Berapa jumlah lembar uang?`,
    () => ({ a: randomInt(5, 14), b: randomInt(5, 14) }),
    ({ a, b }) => a + b
  ),
  createTemplate(
    "ringan",
    /^Perpustakaan punya (\d+) buku tafsir lalu (\d+) buku dipinjam\. Berapa sisa buku tafsir\?$/,
    ({ a, b }) => `Perpustakaan punya ${a} buku tafsir lalu ${b} buku dipinjam. Berapa sisa buku tafsir?`,
    () => {
      const a = randomInt(10, 20);
      const b = randomInt(2, 8);
      return { a, b };
    },
    ({ a, b }) => a - b
  ),
  createTemplate(
    "ringan",
    /^Tersusun (\d+) kardus air minum\. Tiap kardus berisi (\d+) botol\. Berapa total botol\?$/,
    ({ a, b }) => `Tersusun ${a} kardus air minum. Tiap kardus berisi ${b} botol. Berapa total botol?`,
    () => ({ a: randomInt(2, 6), b: randomInt(4, 8) }),
    ({ a, b }) => a * b
  ),
  createTemplate(
    "ringan",
    /^Jamaah saf depan ada (\d+) orang dan saf belakang ada (\d+) orang\. Berapa jumlah jamaah\?$/,
    ({ a, b }) => `Jamaah saf depan ada ${a} orang dan saf belakang ada ${b} orang. Berapa jumlah jamaah?`,
    () => ({ a: randomInt(6, 15), b: randomInt(6, 15) }),
    ({ a, b }) => a + b
  ),
  createTemplate(
    "sedang",
    /^Ada (\d+) dus kurma\. Tiap dus berisi (\d+) bungkus, lalu dibagikan (\d+) bungkus\. Berapa sisa bungkus kurma\?$/,
    ({ a, b, c }) => `Ada ${a} dus kurma. Tiap dus berisi ${b} bungkus, lalu dibagikan ${c} bungkus. Berapa sisa bungkus kurma?`,
    () => ({ a: randomInt(2, 4), b: randomInt(4, 7), c: randomInt(2, 6) }),
    ({ a, b, c }) => a * b - c
  ),
  createTemplate(
    "sedang",
    /^Panitia menaruh (\d+) baris mukena\. Tiap baris ada (\d+) mukena, lalu datang lagi (\d+) mukena\. Berapa jumlah mukena sekarang\?$/,
    ({ a, b, c }) => `Panitia menaruh ${a} baris mukena. Tiap baris ada ${b} mukena, lalu datang lagi ${c} mukena. Berapa jumlah mukena sekarang?`,
    () => ({ a: randomInt(2, 4), b: randomInt(3, 6), c: randomInt(2, 5) }),
    ({ a, b, c }) => a * b + c
  ),
  createTemplate(
    "sedang",
    /^Tersedia (\d+) paket nasi\. Setiap paket berisi (\d+) lauk, lalu (\d+) lauk dimakan panitia\. Berapa sisa lauk\?$/,
    ({ a, b, c }) => `Tersedia ${a} paket nasi. Setiap paket berisi ${b} lauk, lalu ${c} lauk dimakan panitia. Berapa sisa lauk?`,
    () => ({ a: randomInt(2, 4), b: randomInt(3, 5), c: randomInt(2, 5) }),
    ({ a, b, c }) => a * b - c
  )
];

const templatesByDifficulty = {
  ringan: templates.filter((template) => template.difficulty === "ringan"),
  sedang: templates.filter((template) => template.difficulty === "sedang")
} satisfies Record<CaptchaTemplate["difficulty"], CaptchaTemplate[]>;

function createChallengeFromTemplate(template: CaptchaTemplate) {
  const numbers = template.createNumbers();
  return {
    difficulty: template.difficulty,
    question: template.build(numbers),
    answer: template.solve(numbers)
  };
}

export function createWordProblemCaptcha(previousQuestion?: string | null) {
  const maxAttempts = 12;
  const pool = Math.random() < 0.7 ? templatesByDifficulty.ringan : templatesByDifficulty.sedang;
  let challenge = createChallengeFromTemplate(pool[randomInt(0, pool.length - 1)]);

  if (!previousQuestion) return challenge;

  for (let attempt = 0; attempt < maxAttempts && challenge.question === previousQuestion; attempt += 1) {
    challenge = createChallengeFromTemplate(pool[randomInt(0, pool.length - 1)]);
  }

  return challenge;
}

export function solveWordProblemCaptcha(question: string) {
  for (const template of templates) {
    const match = question.match(template.pattern);
    if (!match) continue;

    const numbers = Object.fromEntries(
      match.slice(1).map((value, index) => [String.fromCharCode(97 + index), Number(value)])
    ) as CaptchaNumbers;

    return template.solve(numbers);
  }

  return null;
}
