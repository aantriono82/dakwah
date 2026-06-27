import { api } from "./utils";

export type AuthCaptchaConfig = { provider: "manual" } | { provider: "turnstile"; turnstileSiteKey: string };

export type PublicConfig = {
  generateClientTimeoutMs?: number;
  aiProvider?: string;
  aiModel?: string;
  aiModels?: string[];
  aiBaseURL?: string;
  authCaptcha?: AuthCaptchaConfig;
  googleOAuthEnabled?: boolean;
};

let publicConfigRequest: Promise<{ data: PublicConfig }> | null = null;

export function getPublicConfig() {
  publicConfigRequest ??= api<{ data: PublicConfig }>("/api/config").catch((error) => {
    publicConfigRequest = null;
    throw error;
  });
  return publicConfigRequest;
}
