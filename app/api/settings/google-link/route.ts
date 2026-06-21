import { NextResponse } from "next/server";
import { createGoogleLinkToken } from "@/lib/google-link";
import { jsonError, requireUser } from "@/lib/http";

export async function POST() {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) return jsonError("Google 登入尚未設定", 503);

  const response = NextResponse.json({ ok: true });
  response.cookies.set("google_link_intent", createGoogleLinkToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return response;
}
