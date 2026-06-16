import type { SectionBlock } from "./generate-sections";

export type QuickFixId = "theme_focus" | "language_flow" | "dalil_alignment";

export function quickFixInstruction(fixId: QuickFixId) {
  if (fixId === "theme_focus") {
    return "Perkuat fokus tema. Buat isi utama lebih spesifik terhadap tema yang dipilih, kurangi nasihat yang terlalu umum, dan jelaskan kaitan dalil dengan realitas jamaah secara lebih langsung.";
  }
  if (fixId === "language_flow") {
    return "Perhalus bahasa naskah. Hilangkan kalimat yang terasa template atau generik, rapikan transisi, dan buat redaksi lebih natural untuk dibacakan.";
  }
  return "Rapikan penggunaan dalil. Pertahankan dalil yang ada, pastikan penjelasannya lebih akurat, relevan dengan tema, dan tidak terasa sekadar tempelan.";
}

export function buildSectionAiInstruction(activeSection: SectionBlock | null, action: "polish" | "shorten" | "dalil" | "closing") {
  if (!activeSection) return "";
  if (action === "polish") {
    return `Perhalus section "${activeSection.label}" saja. Buat bahasanya lebih natural, enak dibacakan, dan tetap setia pada makna aslinya. Jangan ubah section lain.`;
  }
  if (action === "shorten") {
    return `Pendekkan section "${activeSection.label}" saja sekitar 25-35% tanpa menghilangkan inti pesan. Pertahankan gaya dakwah yang ringkas dan jelas. Jangan ubah section lain.`;
  }
  if (action === "dalil") {
    return `Perkuat section "${activeSection.label}" saja dengan penjelasan dalil yang lebih tepat dan lebih nyambung ke tema. Jika belum ada dalil yang eksplisit, tambahkan rujukan yang singkat dan aman. Jangan ubah section lain.`;
  }
  return `Khusus untuk section "${activeSection.label}", buat penutup atau kalimat akhirnya lebih kuat, lebih mengajak, dan lebih layak dibacakan di akhir bagian. Jangan ubah section lain.`;
}
