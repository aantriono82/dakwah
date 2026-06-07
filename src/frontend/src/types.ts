import type { JenisId } from "./lib/utils";

export type User = { id: string; username: string; name: string; role: "admin" | "user"; dailyGenerateLimit?: number | null };

export type CuratedDalil = {
  id: string;
  kind: "quran" | "hadith";
  reference: string;
  arab?: string | null;
  translation: string;
  source: string;
  grade?: string | null;
  takhrij?: string | null;
  tafsir?: string | null;
  tags: string[];
  status: "draft" | "reviewed" | "approved" | "archived";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QualityCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: "info" | "warning" | "critical";
};

export type QualityReport = {
  score: number;
  wordCount: number;
  reviewRequired: boolean;
  checks: QualityCheck[];
  metrics?: Array<{ id: string; label: string; score: number; detail: string }>;
  generatedAt: string;
};

export type Naskah = {
  id: string;
  title: string;
  jenis: JenisId;
  bahasa: string;
  duration?: string;
  parameters: Record<string, string>;
  content: string;
  status?: "draft" | "final";
  version?: number;
  autosavedAt?: string | null;
  qualityScore?: number | null;
  qualityReport?: QualityReport | null;
  createdAt: string;
  updatedAt?: string;
  fileUrl?: string;
  user?: User;
};

export type NaskahVersion = {
  id: string;
  naskahId: string;
  versionNumber: number;
  title: string;
  qualityScore?: number | null;
  changeSummary: string;
  createdAt: string;
};

export type Template = {
  id: string;
  name: string;
  jenis: JenisId;
  parameters: Record<string, string>;
  createdAt: string;
};
