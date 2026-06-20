import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DeckManager } from "@/components/DeckManager";
import { DeckUpload } from "@/components/DeckUpload";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isActive) redirect("/login");
  const where = session.user.role === "ADMIN" ? {} : { OR: [{ ownerId: session.user.id }, { visibility: "PUBLIC" as const }] };
  const decks = await db.deck.findMany({ where, include: { owner: { select: { name: true, email: true } }, _count: { select: { slides: true, viewLogs: true } } }, orderBy: { updatedAt: "desc" } });
  const canCreate = session.user.role !== "GUEST";
  return (
    <main>
      <section className="container section">
        <div className={canCreate ? "dashboard-layout" : ""}>
          <div className="dashboard-main">
            <DeckManager decks={decks.map(({ passwordHash: _, ...d }) => d)} canCreate={canCreate} userId={session.user.id} isAdmin={session.user.role === "ADMIN"} />
          </div>
          {canCreate && <DeckUpload />}
        </div>
      </section>
    </main>
  );
}
