import type { JenisId } from "./lib/utils";

export type User = { id: string; username: string; name: string; role: "admin" | "user" };

export type Naskah = {
  id: string;
  title: string;
  jenis: JenisId;
  bahasa: string;
  duration?: string;
  parameters: Record<string, string>;
  content: string;
  createdAt: string;
  fileUrl?: string;
  user?: User;
};

export type Template = {
  id: string;
  name: string;
  jenis: JenisId;
  parameters: Record<string, string>;
  createdAt: string;
};

