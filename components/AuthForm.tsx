"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode, googleEnabled=false }: { mode: "login"|"register"; googleEnabled?: boolean }) {
  const router = useRouter(); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError("");const data=Object.fromEntries(new FormData(e.currentTarget));
    if(mode==="register"){const response=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!response.ok){const body=await response.json();setError(body.error??"註冊失敗");setLoading(false);return;}}
    const result=await signIn("credentials",{email:data.email,password:data.password,redirect:false});if(result?.error){setError("Email 或密碼錯誤");setLoading(false);return;}router.push("/dashboard");router.refresh();}
  return <><form onSubmit={submit}>{mode==="register"&&<div className="field"><label htmlFor="name">名稱</label><input className="input" id="name" name="name" required maxLength={80}/></div>}<div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required/></div><div className="field"><label htmlFor="password">密碼</label><input className="input" id="password" name="password" type="password" required minLength={mode==="register"?10:1}/>{mode==="register"&&<small className="muted">至少 10 碼，包含大小寫字母與數字</small>}</div>{error&&<p className="error">{error}</p>}<button className="btn" style={{width:"100%"}} disabled={loading}>{loading?"處理中…":mode==="login"?"登入":"註冊並登入"}</button></form>{googleEnabled&&<><div className="auth-divider"><span>或</span></div><button className="btn secondary" style={{width:"100%"}} onClick={()=>signIn("google",{redirectTo:"/dashboard"})}>使用 Google 繼續</button></>}</>;
}
