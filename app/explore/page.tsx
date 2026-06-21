import { redirect } from "next/navigation";

// 公開藝廊已整併至首頁；保留此路徑並轉址，維持既有連結相容。
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.sort) params.set("sort", sp.sort);
  const qs = params.toString();
  redirect(qs ? `/?${qs}` : "/");
}
