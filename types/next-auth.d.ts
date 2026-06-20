import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; role: Role; isActive: boolean };
  }
  interface User { role?: Role; isActive?: boolean }
}

declare module "next-auth/jwt" {
  interface JWT { id: string; role: Role; isActive: boolean }
}
