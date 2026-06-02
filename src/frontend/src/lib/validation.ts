import type { JenisId } from "./utils";

const labels: Record<string, string> = {
  temaUtama: "Tema utama",
  temaPesan: "Tema pesan pernikahan",
  topik: "Topik bebas",
  topikSingkat: "Topik singkat"
};

const requiredFields: Partial<Record<JenisId, string[]>> = {
  "khutbah-jumat": ["temaUtama"],
  nikah: ["temaPesan"],
  ceramah: ["topik"],
  kultum: ["topikSingkat"]
};

export function validateGenerateParameters(jenis: JenisId, parameters: Record<string, string>) {
  const missing = (requiredFields[jenis] ?? []).filter((field) => !parameters[field]?.trim());
  if (missing.length === 0) return "";

  return `${missing.map((field) => labels[field] ?? field).join(", ")} wajib diisi.`;
}

