const encoder = new TextEncoder();

export async function hashPassword(password: string) {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10
  });
}

export async function verifyPassword(password: string, hash: string) {
  return await Bun.password.verify(password, hash);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
