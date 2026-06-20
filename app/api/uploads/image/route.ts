import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";

const schema=z.object({deckId:z.string().min(1),fileName:z.string().min(1).max(255),contentType:z.enum(["image/png","image/jpeg","image/webp","image/gif"]),size:z.number().int().positive().max(10*1024*1024)}).strict();
const extensions:Record<string,string>={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"};

export async function POST(request:NextRequest){const user=await requireUser();if(!user)return jsonError("請先登入",401);if(user.role==="GUEST")return jsonError("沒有上傳權限",403);const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return jsonError("圖片格式或大小不符合規定",400,parsed.error.flatten());const access=await getEditableDeck(parsed.data.deckId,user);if(access.error)return access.error;const {S3_ENDPOINT,S3_REGION,S3_BUCKET,S3_ACCESS_KEY,S3_SECRET_KEY,S3_PUBLIC_URL}=process.env;if(!S3_ENDPOINT||!S3_BUCKET||!S3_ACCESS_KEY||!S3_SECRET_KEY||!S3_PUBLIC_URL)return jsonError("尚未設定物件儲存服務",503);const key=`decks/${parsed.data.deckId}/images/${randomUUID()}.${extensions[parsed.data.contentType]}`;const client=new S3Client({region:S3_REGION||"auto",endpoint:S3_ENDPOINT,forcePathStyle:true,credentials:{accessKeyId:S3_ACCESS_KEY,secretAccessKey:S3_SECRET_KEY}});const command=new PutObjectCommand({Bucket:S3_BUCKET,Key:key,ContentType:parsed.data.contentType,ContentLength:parsed.data.size});const uploadUrl=await getSignedUrl(client,command,{expiresIn:300});return NextResponse.json({uploadUrl,publicUrl:`${S3_PUBLIC_URL.replace(/\/$/,"")}/${key}`})}
