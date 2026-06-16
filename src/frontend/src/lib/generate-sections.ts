export type SectionMarker = {
  label: string;
  line: number;
  preview: string;
};

export type SectionBlock = SectionMarker & {
  start: number;
  end: number;
  text: string;
};

const defaultSectionMarkers = new Set([
  "pembuka",
  "pengantar",
  "dalil",
  "renungan",
  "pesan praktis",
  "poin-poin kunci",
  "poin-poin utama",
  "penutup",
  "khutbah pertama",
  "khutbah kedua",
  "doa penutup"
]);

export function extractSectionMarkers(content: string): SectionMarker[] {
  const lines = content.split("\n");
  const markers: SectionMarker[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;

    const normalized = trimmed.replace(/:$/, "").toLowerCase();
    const isMarker =
      defaultSectionMarkers.has(normalized) ||
      /^tema\s*:/i.test(trimmed) ||
      /^bahasa\s*:/i.test(trimmed);

    if (!isMarker || seen.has(normalized)) continue;
    seen.add(normalized);

    let preview = "";
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex].trim();
      if (nextLine) {
        preview = nextLine;
        break;
      }
    }

    markers.push({ label: trimmed.replace(/:$/, ""), line: index, preview });
  }

  return markers;
}

export function buildSectionBlocks(content: string, markers: SectionMarker[]): SectionBlock[] {
  if (!content.trim() || markers.length === 0) return [];

  const lines = content.split("\n");
  const lineStarts: number[] = [];
  let offset = 0;

  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  return markers.map((marker, index) => {
    const start = lineStarts[marker.line] ?? 0;
    const nextLine = markers[index + 1]?.line;
    const end = typeof nextLine === "number" ? Math.max(start, (lineStarts[nextLine] ?? content.length) - 1) : content.length;

    return {
      ...marker,
      start,
      end,
      text: content.slice(start, end).trim()
    };
  });
}

export function findActiveSectionIndex(content: string, blocks: Array<{ start: number; end: number }>, cursorPosition: number): number {
  if (!content.trim() || blocks.length === 0) return -1;
  const boundedCursor = Math.max(0, Math.min(cursorPosition, content.length));
  return blocks.findIndex((block) => boundedCursor >= block.start && boundedCursor <= block.end);
}
