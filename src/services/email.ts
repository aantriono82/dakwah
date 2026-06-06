import { emailFrom, resendApiKey } from "../config";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resendApiKey) {
    console.log(`[password-reset] Link reset untuk ${to}: ${resetUrl}`);
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: emailFrom,
      to,
      subject: "Reset kata sandi Dakwah",
      html: `
        <p>Assalamu'alaikum,</p>
        <p>Klik tautan berikut untuk mengganti kata sandi akun Dakwah Anda:</p>
        <p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
        <p>Tautan ini berlaku selama 30 menit. Abaikan email ini jika Anda tidak meminta reset kata sandi.</p>
      `
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gagal mengirim email reset password: ${response.status} ${body}`);
  }

  return { delivered: true };
}
