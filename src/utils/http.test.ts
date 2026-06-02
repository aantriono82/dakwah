import { describe, expect, test } from "bun:test";
import type { Context } from "hono";
import type { User } from "../db/schema";
import { canAccessOwner, parseJsonBody, publicUser, type AppEnv } from "./http";

describe("http utilities", () => {
  test("publicUser strips sensitive and internal user fields", () => {
    const user = {
      id: "user-1",
      username: "admin",
      name: "Admin",
      passwordHash: "hash",
      role: "admin",
      createdAt: "2026-05-31",
      updatedAt: "2026-05-31"
    } satisfies User;

    expect(publicUser(user)).toEqual({
      id: "user-1",
      username: "admin",
      name: "Admin",
      role: "admin"
    });
  });

  test("parseJsonBody handles empty, invalid, string, and object bodies", () => {
    const fallback = { enabled: false };

    expect(parseJsonBody(undefined, fallback)).toEqual(fallback);
    expect(parseJsonBody("{invalid", fallback)).toEqual(fallback);
    expect(parseJsonBody('{"enabled":true}', fallback)).toEqual({ enabled: true });
    expect(parseJsonBody({ enabled: true }, fallback)).toEqual({ enabled: true });
  });

  test("canAccessOwner allows admins and matching owners only", () => {
    const context = (role: "admin" | "user", id: string) =>
      ({
        get: () => ({ id, username: "user", name: "User", role })
      }) as unknown as Context<AppEnv>;

    expect(canAccessOwner(context("admin", "admin-1"), "owner-1")).toBe(true);
    expect(canAccessOwner(context("user", "owner-1"), "owner-1")).toBe(true);
    expect(canAccessOwner(context("user", "user-2"), "owner-1")).toBe(false);
  });
});
