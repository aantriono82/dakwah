import type { JenisId } from "./utils";

const khutbahJenisIds: JenisId[] = ["khutbah-jumat", "idul-fitri", "idul-adha", "nikah"];

export const jenisCategoryOrder = ["khutbah", "ceramah", "kultum"] as const;
export type JenisCategoryId = (typeof jenisCategoryOrder)[number];

export const jenisCategoryMeta: Record<JenisCategoryId, { label: string; description: string }> = {
  khutbah: {
    label: "Khutbah",
    description: "Jumat, Idul Fitri, Idul Adha, dan Nikah"
  },
  ceramah: {
    label: "Ceramah",
    description: "Ceramah umum dengan struktur yang lebih panjang"
  },
  kultum: {
    label: "Kultum",
    description: "Materi singkat 5-7 menit untuk pengantar atau penutup"
  }
};

export function categoryForJenis(jenis: JenisId): JenisCategoryId {
  if (khutbahJenisIds.includes(jenis)) return "khutbah";
  return jenis === "ceramah" ? "ceramah" : "kultum";
}
