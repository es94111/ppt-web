import { cookies } from "next/headers";
import { notFound,redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verifyDeckAccessToken } from "@/lib/http";
import { DeckPassword } from "@/components/DeckPassword";
import { Viewer } from "@/components/Viewer";
import "@/app/viewer.css";

export const dynamic="force-dynamic";
export default async function ViewPage({params}:{params:Promise<{id:string}>}){const session=await auth();if(!session?.user)redirect("/login");const{id}=await params;const deck=await db.deck.findUnique({where:{id},include:{slides:{orderBy:{order:"asc"}}}});if(!deck)notFound();const owns=session.user.role==="ADMIN"||deck.ownerId===session.user.id;if(deck.visibility==="PRIVATE"&&!owns)redirect("/dashboard");const accessToken=(await cookies()).get(`deck_access_${id}`)?.value;if(deck.visibility==="PASSWORD"&&!owns&&!verifyDeckAccessToken(id,accessToken))return <main><DeckPassword deckId={id} title={deck.title}/></main>;return <main><Viewer deckId={id} title={deck.title} slides={deck.slides.map(s=>({id:s.id,order:s.order,content:s.content}))}/></main>}
