import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DeckManager } from "@/components/DeckManager";

export const dynamic="force-dynamic";
export default async function Dashboard(){const session=await auth();if(!session?.user)redirect("/login");if(!session.user.isActive)redirect("/login");const where=session.user.role==="ADMIN"?{}:{OR:[{ownerId:session.user.id},{visibility:"PUBLIC" as const}]};const decks=await db.deck.findMany({where,include:{owner:{select:{name:true,email:true}},_count:{select:{slides:true,viewLogs:true}}},orderBy:{updatedAt:"desc"}});return <main><section className="container section"><DeckManager decks={decks.map(({passwordHash:_,...d})=>d)} canCreate={session.user.role!=="GUEST"} userId={session.user.id} isAdmin={session.user.role==="ADMIN"}/></section></main>}
