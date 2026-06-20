import { describe,expect,it } from "vitest";
import { registerSchema,slideContentSchema } from "./schemas";
import { rateLimit } from "./rate-limit";

describe("slideContentSchema",()=>{
  it("accepts safe slide data",()=>expect(slideContentSchema.safeParse({background:"#ffffff",elements:[{id:"a",type:"text",x:0,y:0,w:100,h:40,text:"<script>alert(1)</script>",fontSize:24,color:"#111111"}]}).success).toBe(true));
  it("rejects unknown fields and invalid URLs",()=>expect(slideContentSchema.safeParse({elements:[{id:"a",type:"image",x:0,y:0,w:100,h:40,src:"javascript:alert(1)",evil:true}]}).success).toBe(false));
});
describe("registerSchema",()=>it("enforces password complexity",()=>expect(registerSchema.safeParse({name:"A",email:"a@example.com",password:"alllowercase1"}).success).toBe(false)));
describe("rateLimit",()=>it("blocks requests beyond the limit",()=>{const key=`test-${Date.now()}`;expect(rateLimit(key,2).allowed).toBe(true);expect(rateLimit(key,2).allowed).toBe(true);expect(rateLimit(key,2).allowed).toBe(false)}));
