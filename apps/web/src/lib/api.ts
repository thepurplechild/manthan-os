"use client";

type IdeaReq = { genre:string; tone:string; seed:string; language:string };
type OutlineReq = { logline:string; structure:string; style:string; language:string };
type ScriptReq = { outline:string; style:string; language:string };
type DeckReq = {
  title:string; logline:string; synopsis:string; characters:string; world:string; comps:string;
  toneboard?:string; language:string;
};
type ExportReq = { deck_json:any; format:"pdf"|"docx" };

let runtime: { API_BASE: string } | null = null;
async function getRuntime(): Promise<{ API_BASE: string }> {
  if (runtime) return runtime;
  const res = await fetch("/api/app-config", { cache: "no-store" });
  if (!res.ok) throw new Error("Cannot load runtime config.");
  runtime = await res.json();
  return runtime!;
}

async function post<T>(path: string, body: any): Promise<T> {
  const { API_BASE } = await getRuntime();
  if (!API_BASE) {
    throw new Error(
      "API base URL is empty. Set NEXT_PUBLIC_API_BASE on the frontend Cloud Run service."
    );
  }
  const url = `${API_BASE.replace(/\/$/, "")}${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${path} failed: ${r.status} ${text.slice(0, 500)}`);
  }
  return r.json() as Promise<T>;
}

export const GenAPI = {
  ideas: (req: IdeaReq) =>
    post<{ content?: string; options?: { logline: string; premise: string }[] }>(
      "/gen/idea",
      req
    ),
  outlines: (req: OutlineReq) =>
    post<{ content?: string; options?: { outline: string }[] }>("/gen/outline", req),
  scripts: (req: ScriptReq) =>
    post<{ content?: string; options?: { script: string }[] }>("/gen/script", req),
  deckBuild: (req: DeckReq) =>
    post<{ deck?: any; options?: { deck: any }[] }>("/gen/deck", req),
  export: (req: ExportReq) =>
    post<{ url: string }>("/export", req),
};
