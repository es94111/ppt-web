import { notFound,redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Editor } from "@/components/Editor";
import "@/app/editor.css";

export const dynamic="force-dynamic";
export default async function EditPage({params}:{params:Promise<{id:string}>}){const session=await auth();if(!session?.user)redirect("/login");const{id}=await params;const deck=await db.deck.findUnique({where:{id},include:{slides:{orderBy:{order:"asc"}}}});if(!deck)notFound();if(session.user.role!=="ADMIN"&&deck.ownerId!==session.user.id)redirect("/dashboard");if(session.user.role==="GUEST")redirect(`/d/${id}`);return <main><Editor initial={{id:deck.id,title:deck.title,description:deck.description,visibility:deck.visibility,slides:deck.slides.map(s=>({id:s.id,order:s.order,content:s.content}))}}/></main>}
