import { describe, expect, test } from "bun:test";
import { hashPassword, sha256, verifyPassword } from "./password";

describe("password utilities", () => {
  test("sha256 returns a stable hexadecimal digest", async () => {
    expect(await sha256("khutbah-ai")).toBe("79e8912764935f948b6fea5037f3ac26e93f79fed3fa72adbceb8255a2f662da");
  });

  test("hashPassword creates a verifiable bcrypt hash", async () => {
    const hash = await hashPassword("secret123");

    expect(hash).toStartWith("$2");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
