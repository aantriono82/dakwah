export type CaptchaDifficulty = "ringan" | "sedang";
export type CaptchaInputMode = "numeric" | "text";

export type CaptchaChallenge = {
  difficulty: CaptchaDifficulty;
  question: string;
  answer: string;
  inputMode: CaptchaInputMode;
  placeholder: string;
  hint?: string;
};

type CaptchaTemplate = {
  difficulty: CaptchaDifficulty;
  pattern: RegExp;
  inputMode: CaptchaInputMode;
  placeholder: string;
  hint?: string;
  build: () => { question: string; answer: string };
  solve: (match: RegExpMatchArray) => string;
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: readonly T[]) {
  return items[randomInt(0, items.length - 1)];
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeCaptchaAnswer(answer: string) {
  return normalizeWhitespace(answer).toLocaleLowerCase("id-ID");
}

function createNumericTemplate(
  difficulty: CaptchaDifficulty,
  pattern: RegExp,
  build: () => { question: string; answer: number },
  solve: (match: RegExpMatchArray) => number
): CaptchaTemplate {
  return {
    difficulty,
    pattern,
    inputMode: "numeric",
    placeholder: "Masukkan angka",
    build: () => {
      const challenge = build();
      return { question: challenge.question, answer: String(challenge.answer) };
    },
    solve: (match) => String(solve(match))
  };
}

function createTextTemplate(
  difficulty: CaptchaDifficulty,
  pattern: RegExp,
  placeholder: string,
  build: () => { question: string; answer: string },
  solve: (match: RegExpMatchArray) => string,
  hint?: string
): CaptchaTemplate {
  return {
    difficulty,
    pattern,
    inputMode: "text",
    placeholder,
    hint,
    build: () => {
      const challenge = build();
      return { question: challenge.question, answer: normalizeCaptchaAnswer(challenge.answer) };
    },
    solve: (match) => normalizeCaptchaAnswer(solve(match))
  };
}

const numericTemplates: CaptchaTemplate[] = [
  createNumericTemplate(
    "ringan",
    /^Ali punya (\d+) apel lalu membeli (\d+) lagi\. Berapa jumlah apel Ali\?$/,
    () => {
      const a = randomInt(2, 8);
      const b = randomInt(2, 6);
      return { question: `Ali punya ${a} apel lalu membeli ${b} lagi. Berapa jumlah apel Ali?`, answer: a + b };
    },
    (match) => Number(match[1]) + Number(match[2])
  ),
  createNumericTemplate(
    "ringan",
    /^Ada (\d+) kotak\. Tiap kotak berisi (\d+) buku\. Berapa total bukunya\?$/,
    () => {
      const a = randomInt(2, 6);
      const b = randomInt(2, 5);
      return { question: `Ada ${a} kotak. Tiap kotak berisi ${b} buku. Berapa total bukunya?`, answer: a * b };
    },
    (match) => Number(match[1]) * Number(match[2])
  ),
  createNumericTemplate(
    "ringan",
    /^Fatimah memiliki (\d+) kurma lalu membagikan (\d+)\. Berapa sisa kurmanya\?$/,
    () => {
      const a = randomInt(8, 15);
      const b = randomInt(2, 6);
      return { question: `Fatimah memiliki ${a} kurma lalu membagikan ${b}. Berapa sisa kurmanya?`, answer: a - b };
    },
    (match) => Number(match[1]) - Number(match[2])
  ),
  createNumericTemplate(
    "sedang",
    /^Panitia menata (\d+) baris kursi\. Tiap baris ada (\d+) kursi, lalu ditambah (\d+) kursi\. Berapa total kursi\?$/,
    () => {
      const a = randomInt(2, 5);
      const b = randomInt(3, 6);
      const c = randomInt(2, 5);
      return { question: `Panitia menata ${a} baris kursi. Tiap baris ada ${b} kursi, lalu ditambah ${c} kursi. Berapa total kursi?`, answer: a * b + c };
    },
    (match) => Number(match[1]) * Number(match[2]) + Number(match[3])
  ),
  createNumericTemplate(
    "sedang",
    /^Ada (\d+) dus kurma\. Tiap dus berisi (\d+) bungkus, lalu dibagikan (\d+) bungkus\. Berapa sisa bungkus kurma\?$/,
    () => {
      const a = randomInt(2, 4);
      const b = randomInt(4, 7);
      const c = randomInt(2, 6);
      return { question: `Ada ${a} dus kurma. Tiap dus berisi ${b} bungkus, lalu dibagikan ${c} bungkus. Berapa sisa bungkus kurma?`, answer: a * b - c };
    },
    (match) => Number(match[1]) * Number(match[2]) - Number(match[3])
  )
];

const dayPairs = [
  ["senin", "selasa"],
  ["selasa", "rabu"],
  ["rabu", "kamis"],
  ["kamis", "jumat"],
  ["jumat", "sabtu"],
  ["sabtu", "ahad"]
] as const;

const colorSets = [
  ["merah", "biru", "hijau"],
  ["kuning", "ungu", "putih"],
  ["hitam", "oranye", "biru"],
  ["hijau", "merah", "abu-abu"]
] as const;

const wordSets = [
  ["amanah", "ikhlas", "sabar"],
  ["masjid", "jamaah", "khutbah"],
  ["ilmu", "amal", "adab"],
  ["shalat", "zakat", "sedekah"]
] as const;

const textTemplates: CaptchaTemplate[] = [
  createTextTemplate(
    "ringan",
    /^Ketik warna terakhir dari urutan ini: ([a-z-]+), ([a-z-]+), ([a-z-]+)\.$/,
    "Masukkan satu kata",
    () => {
      const colors = randomItem(colorSets);
      return { question: `Ketik warna terakhir dari urutan ini: ${colors[0]}, ${colors[1]}, ${colors[2]}.`, answer: colors[2] };
    },
    (match) => match[3],
    "Jawab dengan satu kata."
  ),
  createTextTemplate(
    "ringan",
    /^Ketik kata kedua dari daftar ini: ([a-z-]+), ([a-z-]+), ([a-z-]+)\.$/,
    "Masukkan satu kata",
    () => {
      const words = randomItem(wordSets);
      return { question: `Ketik kata kedua dari daftar ini: ${words[0]}, ${words[1]}, ${words[2]}.`, answer: words[1] };
    },
    (match) => match[2],
    "Jawab dengan satu kata."
  ),
  createTextTemplate(
    "ringan",
    /^Ketik huruf pertama dari kata "([a-z-]+)"\.$/,
    "Masukkan satu huruf",
    () => {
      const words = randomItem(wordSets).filter((word) => !word.includes("-"));
      const word = randomItem(words);
      return { question: `Ketik huruf pertama dari kata "${word}".`, answer: word[0] };
    },
    (match) => match[1][0],
    "Jawab dengan satu huruf kecil."
  ),
  createTextTemplate(
    "sedang",
    /^Ketik nama hari setelah "([a-z-]+)"\.$/,
    "Masukkan nama hari",
    () => {
      const pair = randomItem(dayPairs);
      return { question: `Ketik nama hari setelah "${pair[0]}".`, answer: pair[1] };
    },
    (match) => {
      const pair = dayPairs.find(([day]) => day === normalizeCaptchaAnswer(match[1]));
      return pair?.[1] ?? "";
    },
    "Contoh jawaban: selasa."
  ),
  createTextTemplate(
    "sedang",
    /^Ketik kebalikan urutan ini dari kanan ke kiri: ([a-z-]+), ([a-z-]+), ([a-z-]+)\. Jawab kata tengahnya\.$/,
    "Masukkan satu kata",
    () => {
      const words = randomItem(wordSets);
      return {
        question: `Ketik kebalikan urutan ini dari kanan ke kiri: ${words[0]}, ${words[1]}, ${words[2]}. Jawab kata tengahnya.`,
        answer: words[1]
      };
    },
    (match) => match[2],
    "Fokus pada posisi kata setelah urutan dibalik."
  )
];

const templates = [...numericTemplates, ...textTemplates];
const templatesByDifficulty = {
  ringan: templates.filter((template) => template.difficulty === "ringan"),
  sedang: templates.filter((template) => template.difficulty === "sedang")
} satisfies Record<CaptchaDifficulty, CaptchaTemplate[]>;

function createChallengeFromTemplate(template: CaptchaTemplate): CaptchaChallenge {
  const challenge = template.build();
  return {
    difficulty: template.difficulty,
    question: challenge.question,
    answer: template.inputMode === "numeric" ? challenge.answer : normalizeCaptchaAnswer(challenge.answer),
    inputMode: template.inputMode,
    placeholder: template.placeholder,
    hint: template.hint
  };
}

export function createWordProblemCaptcha(previousQuestion?: string | null) {
  const maxAttempts = 12;
  const pool = Math.random() < 0.65 ? templatesByDifficulty.ringan : templatesByDifficulty.sedang;
  let challenge = createChallengeFromTemplate(randomItem(pool));

  if (!previousQuestion) return challenge;

  for (let attempt = 0; attempt < maxAttempts && challenge.question === previousQuestion; attempt += 1) {
    challenge = createChallengeFromTemplate(randomItem(pool));
  }

  return challenge;
}

export function solveWordProblemCaptcha(question: string) {
  for (const template of templates) {
    const match = question.match(template.pattern);
    if (!match) continue;
    return template.solve(match);
  }

  return null;
}
