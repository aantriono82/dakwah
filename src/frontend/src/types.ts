import type { JenisId } from "./lib/utils";

export type User = { id: string; username: string; name: string; role: "admin" | "user"; dailyGenerateLimit?: number | null };

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
  content: string;
  qualityScore?: number | null;
  qualityReport?: QualityReport | null;
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
