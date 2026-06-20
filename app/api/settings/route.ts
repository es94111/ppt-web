import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

const settingsSchema=z.object({name:z.string().trim().min(1).max(80)}).strict();
export async function PATCH(request:NextRequest){const user=await requireUser();if(!user)return jsonError("請先登入",401);const parsed=settingsSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return jsonError("名稱格式不正確",400,parsed.error.flatten());return NextResponse.json(await db.user.update({where:{id:user.id},data:parsed.data,select:{id:true,name:true,email:true}}))}
