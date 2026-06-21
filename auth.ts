import NextAuth from "next-auth";
import { cookies } from "next/headers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { extractClientIp } from "@/lib/security";
import { canCreatePublicAccount } from "@/lib/site-settings";
import { verifyGoogleLinkToken } from "@/lib/google-link";

const providers = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw, request) {
      const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(raw);
      if (!parsed.success) return null;
      const ip=extractClientIp(request.headers,Number(process.env.TRUSTED_PROXY_COUNT??"1"));
      if(!rateLimit(`login:${ip}:${parsed.data.email.toLowerCase()}`,10,60_000).allowed)return null;
      const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user?.passwordHash || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
      return user;
    }
  })
];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google({
  allowDangerousEmailAccountLinking: true,
  profile(profile) {
    if (!profile.email_verified || !profile.email) throw new Error("Google Email 尚未驗證");
    return { id: profile.sub, name: profile.name, email: profile.email.toLowerCase(), image: profile.picture };
  },
}) as never);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(db),
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (user.isActive === false) return false;
      if (account?.provider !== "google") return true;

      const linkIntentCookie = (await cookies()).get("google_link_intent")?.value;
      if (linkIntentCookie) {
        const linkingUserId = verifyGoogleLinkToken(linkIntentCookie);
        if (!linkingUserId || !user.email) return false;
        const linkingUser = await db.user.findUnique({ where: { id: linkingUserId }, select: { email: true, isActive: true } });
        if (!linkingUser?.isActive || linkingUser.email.toLowerCase() !== user.email.toLowerCase()) return false;
      }

      const linked = await db.account.findUnique({
        where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
        include: { user: { select: { isActive: true } } },
      });
      if (linked) return linked.user.isActive;

      const existing = user.email ? await db.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { isActive: true } }) : null;
      if (existing) return existing.isActive;
      return canCreatePublicAccount();
    },
    async jwt({ token, user, trigger }) {
      if (user) { token.id = user.id; token.role = user.role ?? "GUEST"; token.isActive = user.isActive ?? true; }
      if (trigger === "update" || !token.role) {
        const fresh = await db.user.findUnique({ where: { id: token.sub! }, select: { role: true, isActive: true } });
        if (fresh) { token.role = fresh.role; token.isActive = fresh.isActive; }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? token.sub);
      session.user.role = token.role as typeof session.user.role;
      session.user.isActive = Boolean(token.isActive);
      return session;
    }
  }
});
