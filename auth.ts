import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { extractClientIp } from "@/lib/security";

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
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google({ allowDangerousEmailAccountLinking: false }) as never);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) { return user.isActive !== false; },
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
