import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const arabicPattern = /[\u0600-\u06FF]/;
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
    .p { margin: 0 0 10px 0; text-align: left; white-space: pre-wrap; word-break: break-word; }
    .ar { direction: rtl; unicode-bidi: plaintext; text-align: right; font-family: Amiri, "Noto Naskh Arabic", "Noto Sans Arabic", serif; font-size: 18px; line-height: 1.9; word-break: normal; overflow-wrap: anywhere; }
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
        }
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
      console.warn(`[exporters] HTML->PDF (Chrome) failed: ${chromeError}`);
      throw new Error(
        `Export PDF teks Arab gagal karena Chrome/Chromium tidak berhasil dipakai. ${chromeError} Export DOCX masih tersedia.`
      );
    }
  }

  const doc = new PDFDocument({ margin: 56, size: "A4" });
  const chunks: Buffer[] = [];
  const unicodeFontPath = resolveUnicodeFontPath();

  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
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
      align: containsArabic(text) ? "right" : "left",
      lineGap: 4
    });
    doc.moveDown(0.5);
  }

  doc.end();

  return new Uint8Array(await done);
}

export async function createDocx(title: string, content: string) {
  const docxParagraphs = content.split(/\n{2,}/).map((paragraph) => {
    const normalized = paragraph.replace(/\n/g, " ").trim();
    const hasArabic = containsArabic(normalized);
    return new Paragraph({
      bidirectional: hasArabic,
      children: [
        new TextRun({
          text: normalized,
          rightToLeft: hasArabic,
          font: hasArabic ? "Amiri" : undefined
        })
      ],
      spacing: { after: 180 }
    });
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
            spacing: { after: 320 }
          }),
          ...docxParagraphs
        ]
      }
    ]
  });

  return new Uint8Array(await Packer.toBuffer(doc));
}
