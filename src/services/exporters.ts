import PDFDocument from "pdfkit";
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { exportPdfTimeoutMs } from "../config";

const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const latinLetterPattern = /[A-Za-z]/;
const latinLikePattern = /[A-Za-z0-9]/;
const arabicFont = "Amiri";
const unicodeFontCandidates = [
  process.env.EXPORT_UNICODE_FONT_PATH,
  "/usr/share/fonts/truetype/amiri/Amiri-Regular.ttf",
  "/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf",
  "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf"
].filter((value): value is string => Boolean(value && value.trim()));
const browserCandidates = [
  process.env.EXPORT_PDF_BROWSER_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter((value): value is string => Boolean(value && value.trim()));

function containsArabic(text: string) {
  return arabicPattern.test(text);
}

function containsLatinLetter(text: string) {
  return latinLetterPattern.test(text);
}

function isArabicParagraph(text: string) {
  return containsArabic(text) && !containsLatinLetter(text);
}

function splitByScript(text: string) {
  const segments: Array<{ text: string; arabic: boolean }> = [];
  let current = "";
  let currentArabic = false;
  let hasMode = false;

  const flush = () => {
    if (!current) return;
    segments.push({ text: current, arabic: currentArabic });
    current = "";
  };

  for (const char of text) {
    const charIsArabic = containsArabic(char);
    const charIsLatinLike = latinLikePattern.test(char);
    let nextArabic: boolean;
    if (charIsArabic) {
      nextArabic = true;
    } else if (charIsLatinLike) {
      nextArabic = false;
    } else {
      nextArabic = currentArabic;
    }

    if (hasMode && nextArabic !== currentArabic) flush();
    currentArabic = nextArabic;
    hasMode = true;
    current += char;
  }

  flush();
  return segments;
}

function createScriptAwareRuns(text: string, options: { bold?: boolean; size?: number } = {}) {
  return splitByScript(text).map(
    (segment) =>
      new TextRun({
        text: segment.text,
        bold: options.bold,
        size: options.size,
        rightToLeft: segment.arabic,
        font: segment.arabic ? { ascii: arabicFont, hAnsi: arabicFont, cs: arabicFont } : undefined,
        sizeComplexScript: segment.arabic ? options.size : undefined,
        language: segment.arabic ? { bidirectional: "ar-SA" } : { value: "id-ID" }
      })
  );
}

function resolveUnicodeFontPath() {
  return unicodeFontCandidates.find((fontPath) => existsSync(fontPath));
}

function resolvePdfBrowserPath() {
  const browserPath = browserCandidates.find((candidate) => existsSync(candidate));
  if (!browserPath) return undefined;

  const executableName = basename(browserPath).toLowerCase();
  if (executableName.includes("firefox")) {
    throw new Error(
      "Firefox tidak didukung untuk export PDF teks Arab. Gunakan Chrome/Chromium lewat EXPORT_PDF_BROWSER_PATH."
    );
  }

  return browserPath;
}

const execFileAsync = promisify(execFile);

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function contentToHtml(title: string, content: string) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const isArabic = containsArabic(paragraph);
      const cls = isArabic ? "p ar" : "p";
      const attrs = isArabic ? ' lang="ar" dir="rtl"' : ' lang="id" dir="ltr"';
      return `<p class="${cls}"${attrs}>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
  const titleIsArabic = containsArabic(title);

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=block" rel="stylesheet" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, "DejaVu Sans", sans-serif; font-size: 14px; line-height: 1.55; color: #111; }
    h1 { font-size: 22px; text-align: center; margin: 0 0 20px 0; }
    .p { margin: 0 0 10px 0; text-align: justify; text-align-last: auto; white-space: pre-wrap; word-break: break-word; font-weight: 400; }
    .ar { direction: rtl; unicode-bidi: plaintext; text-align: justify; text-align-last: right; font-family: Amiri, "Noto Naskh Arabic", "Noto Sans Arabic", serif; font-size: 18px; line-height: 1.9; word-break: normal; overflow-wrap: anywhere; font-weight: 400; }
  </style>
</head>
<body>
  <h1${titleIsArabic ? ' class="ar" lang="ar" dir="rtl"' : ' lang="id" dir="ltr"'}>${escapeHtml(title)}</h1>
  ${paragraphs}
</body>
</html>`;
}

async function convertHtmlToPdfViaChrome(title: string, content: string) {
  const tempDir = await mkdtemp(join(tmpdir(), "khutbah-export-chrome-"));
  const htmlPath = join(tempDir, "naskah.html");
  const pdfPath = join(tempDir, "naskah.pdf");
  const chromeProfile = join(tempDir, "chrome-profile");
  const browserPath = resolvePdfBrowserPath();

  if (!browserPath) {
    throw new Error("Chrome/Chromium executable tidak ditemukan untuk export PDF.");
  }

  try {
    await writeFile(htmlPath, contentToHtml(title, content), "utf8");
    await execFileAsync(
      browserPath,
      [
        "--headless",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-breakpad",
        "--disable-crashpad",
        "--disable-crash-reporter",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-sandbox",
        "--virtual-time-budget=5000",
        `--user-data-dir=${chromeProfile}`,
        "--no-pdf-header-footer",
        "--print-to-pdf-no-header",
        `--print-to-pdf=${pdfPath}`,
        htmlPath
      ],
      {
        env: {
          ...process.env,
          HOME: tempDir,
          XDG_RUNTIME_DIR: tempDir
        },
        timeout: exportPdfTimeoutMs
      }
    );
    const pdf = await readFile(pdfPath);
    return new Uint8Array(pdf);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function createPdf(title: string, content: string) {
  if (containsArabic(`${title}\n${content}`)) {
    try {
      return await convertHtmlToPdfViaChrome(title, content);
    } catch (error) {
      const chromeError = error instanceof Error ? error.message : String(error);
      if (chromeError.includes("timed out")) {
        throw new Error(
          `Export PDF teks Arab melebihi batas waktu ${Math.ceil(exportPdfTimeoutMs / 1000)} detik. Coba DOCX atau ringkas isi naskah.`
        );
      }
      console.warn(`[exporters] HTML->PDF (Chrome) failed: ${chromeError}`);
      throw new Error(
        `Export PDF teks Arab gagal karena Chrome/Chromium tidak berhasil dipakai. ${chromeError} Export DOCX masih tersedia.`
      );
    }
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: "A4" });
    const chunks: Buffer[] = [];
    const unicodeFontPath = resolveUnicodeFontPath();
    const timeout = setTimeout(() => {
      doc.removeAllListeners();
      (doc as unknown as { destroy?: () => void }).destroy?.();
      reject(new Error(`Export PDF melebihi batas waktu ${Math.ceil(exportPdfTimeoutMs / 1000)} detik.`));
    }, exportPdfTimeoutMs);

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => {
      clearTimeout(timeout);
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
    doc.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    if (unicodeFontPath) {
      doc.font(unicodeFontPath);
    } else {
      console.warn("[exporters] Unicode font for PDF not found. Arabic rendering may degrade.");
    }

    doc.fontSize(18).text(title, { align: "center" });
    doc.moveDown();

    const paragraphs = content.split(/\n{2,}/);
    for (const paragraph of paragraphs) {
      const text = paragraph.trim();
      if (!text) continue;
      doc.fontSize(11).text(text, {
        align: "justify",
        lineGap: 4
      });
      doc.moveDown(0.5);
    }

    doc.end();
  });
}

export async function createDocx(title: string, content: string) {
  const docxParagraphs = content.split(/\r?\n/).map((line) => {
    const normalized = line.trim();
    const arabicOnly = isArabicParagraph(normalized);

    if (!normalized) {
      return new Paragraph({ spacing: { after: 120 } });
    }

    return new Paragraph({
      bidirectional: arabicOnly,
      alignment: AlignmentType.JUSTIFIED,
      children: createScriptAwareRuns(normalized),
      spacing: { after: 180 }
    });
  });
  const titleArabicOnly = isArabicParagraph(title);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            bidirectional: titleArabicOnly,
            alignment: titleArabicOnly ? AlignmentType.RIGHT : AlignmentType.CENTER,
            children: createScriptAwareRuns(title, { bold: true, size: 32 }),
            spacing: { after: 320 }
          }),
          ...docxParagraphs
        ]
      }
    ]
  });

  return new Uint8Array(await Packer.toBuffer(doc));
}
