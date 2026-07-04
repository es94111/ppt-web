import { randomBytes } from "node:crypto";
import { createDeckAccessToken, verifyDeckAccessToken } from "@/lib/security";

export function createShareToken() {
  return randomBytes(18).toString("base64url");
}

export function isShareLinkActive(link: { expiresAt: Date | null; revokedAt: Date | null }) {
  if (link.revokedAt) return false;
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return false;
  return true;
}

// 分享連結密碼使用與簡報自身密碼「不同」的 cookie 命名空間，
// 避免解開分享密碼後連帶繞過簡報本身的密碼閘（反之亦然）。
export function shareAccessCookieName(token: string) {
  return `share_access_${token}`;
}

export function createShareAccessToken(token: string) {
  return createDeckAccessToken(`share:${token}`);
}

export function verifyShareAccessToken(token: string, value?: string) {
  return verifyDeckAccessToken(`share:${token}`, value);
}
