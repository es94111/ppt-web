import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoogleLinkToken, verifyGoogleLinkToken } from "./google-link";

describe("Google account link token", () => {
  beforeEach(() => vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-characters"));

  it("accepts a valid token for the intended user", () => {
    const token = createGoogleLinkToken("user-a", 60);
    expect(verifyGoogleLinkToken(token)).toBe("user-a");
  });

  it("rejects tampered and expired tokens", () => {
    const token = createGoogleLinkToken("user-a", 60);
    expect(verifyGoogleLinkToken(`${token}x`)).toBeNull();
    expect(verifyGoogleLinkToken(createGoogleLinkToken("user-a", -1))).toBeNull();
  });
});
