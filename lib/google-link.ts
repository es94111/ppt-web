import { createHmac, timingSafeEqual } from "crypto";

function signature(payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return createHmac("sha256", secret).update(`google-link:${payload}`).digest("base64url");
}

export function createGoogleLinkToken(userId: string, ttlSeconds = 300) {
  const payload = `${userId}.${Date.now() + ttlSeconds * 1000}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyGoogleLinkToken(token?: string) {
  if (!token) return null;
  const [userId, expires, supplied] = token.split(".");
  if (!userId || !expires || !supplied || Number(expires) < Date.now()) return null;
  const expected = signature(`${userId}.${expires}`);
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes) ? userId : null;
}
