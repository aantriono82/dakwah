import { turnstileSecretKey } from "../config";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(token: string, remoteIp?: string) {
  if (!turnstileSecretKey) return false;

  const body = new URLSearchParams({
    secret: turnstileSecretKey,
    response: token
  });

  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) return false;
    const payload = (await response.json()) as TurnstileVerifyResponse;
    return payload.success === true;
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Validasi Turnstile gagal.");
    return false;
  }
}
