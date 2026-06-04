import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(body.message ?? "Permintaan gagal.");
  }

  return (await response.json()) as T;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const jenisOptions = [
  {
    id: "khutbah-jumat",
    label: "Khutbah Jumat",
    description: "Khutbah 1, khutbah 2, dan doa penutup.",
    accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
  },
  {
    id: "idul-fitri",
    label: "Idul Fitri",
    description: "Naskah lengkap dengan takbir pembuka.",
    accent: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200"
  },
  {
    id: "idul-adha",
    label: "Idul Adha",
    description: "Tema kurban, haji, dan doa kurban.",
    accent: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
  },
  {
    id: "nikah",
    label: "Khutbah Nikah",
    description: "Khutbah dan nasihat untuk mempelai.",
    accent: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200"
  },
  {
    id: "ceramah",
    label: "Ceramah Umum",
    description: "Ceramah lengkap dan poin-poin kunci.",
    accent: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
  },
  {
    id: "kultum",
    label: "Kultum",
    description: "Naskah singkat 5-7 menit.",
    accent: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200"
  }
] as const;

export type JenisId = (typeof jenisOptions)[number]["id"];
