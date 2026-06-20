import { beforeAll,describe,expect,it } from "vitest";
import { createDeckAccessToken,extractClientIp,verifyDeckAccessToken } from "./security";

beforeAll(()=>{process.env.AUTH_SECRET="test-secret-with-at-least-thirty-two-characters"});
describe("deck access token",()=>{it("is scoped and tamper resistant",()=>{const token=createDeckAccessToken("deck-a",60);expect(verifyDeckAccessToken("deck-a",token)).toBe(true);expect(verifyDeckAccessToken("deck-b",token)).toBe(false);expect(verifyDeckAccessToken("deck-a",`${token}x`)).toBe(false)})});
describe("extractClientIp",()=>{it("uses the address before trusted proxies",()=>{const headers=new Headers({"x-forwarded-for":"203.0.113.8, 10.0.0.1"});expect(extractClientIp(headers,1)).toBe("203.0.113.8")})});
