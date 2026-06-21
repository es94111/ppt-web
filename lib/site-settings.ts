import { db } from "@/lib/db";

export async function getSiteSettings() {
  return db.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, allowPublicRegistration: true },
  });
}

export async function canCreatePublicAccount() {
  if (await db.user.count() === 0) return true;
  return (await getSiteSettings()).allowPublicRegistration;
}
