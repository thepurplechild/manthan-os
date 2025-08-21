// apps/web/src/lib/api.ts

export type IdeaOption = { logline: string; premise: string };
export type OutlineOption = { outline: string };
export type ScriptOption = { script: string };

type AppConfig = { API_BASE: string };

let API_BASE_CACHED: string | null = null;

async function getBase(): Promise<string> {
  if (API_BASE_CACHED) return API_BASE_CACHED;

  // Try runtime route first (browser)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/app-config", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as AppConfig;
        if (j?.API_BASE) {
          API_BASE_CACHED = j.API_BASE.replace(/\/+$/, "");
          return API_BASE_CACHED;
        }
      }
    } catch {}
  }

  // Fallback to build-time env
  API_BASE_CACHED = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
  return API_BASE_CACHED;
}

async function post<T>(path: string, body: any): Promise<T> {
  const base = await getBase();
  if (!base) throw new Error("Backend API base URL is not configured. Set NEXT_PUBLIC_API_BASE on the frontend service.");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText} – ${text.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

export const GenAPI = {
  async ideas(req: { genre: string; tone: string; seed: string; language: string }): Promise<{ options: IdeaOption[] }> {
    const r = await post<{ content: string }>("/gen/idea", req);
    const ideas = r.content
      ?.split(/\n{2,}/)
      .filter(Boolean)
      .slice(0, 3)
      .map((chunk) => {
        const m = chunk.match(/logline[:\-]\s*(.+)/i);
        const n = chunk.match(/premise[:\-]\s*(.+)/i);
        return {
          logline: (m ? m[1] : chunk).trim().slice(0, 240),
          premise: (n ? n[1] : chunk).trim().slice(0, 1200),
        };
      }) || [];
    return { options: ideas.length ? ideas : [{ logline: r.content.slice(0, 140), premise: r.content }] };
  },

  async outlines(req: { logline: string; structure: string; style: string; language: string }): Promise<{ options: OutlineOption[] }> {
    const r = await post<{ content: string }>("/gen/outline", req);
    const options = r.content?.split(/\n{2,}/).filter(Boolean).slice(0, 3).map((o) => ({ outline: o })) || [];
    return { options: options.length ? options : [{ outline: r.content }] };
  },

  async scripts(req: { outline: string; style: string; language: string }): Promise<{ options: ScriptOption[] }> {
    const r = await post<{ content: string }>("/gen/script", req);
    const options = r.content?.split(/\n{3,}/).filter(Boolean).slice(0, 3).map((s) => ({ script: s })) || [];
    return { options: options.length ? options : [{ script: r.content }] };
  },

  async deckBuild(req: {
    title: string; logline: string; synopsis: string; characters: string; world: string; comps: string; toneboard?: string; language: string;
  }): Promise<{ options: { deck: any }[] }> {
    const r = await post<{ deck: any } | { content: string }>("/gen/deck", req);
    const deckObj = (r as any).deck && typeof (r as any).deck === "object" ? (r as any).deck : { raw: (r as any).content || "" };
    return { options: [{ deck: deckObj }] };
  },

  async export(req: { deck_json: any; format: "pdf" | "docx" }): Promise<{ url: string }> {
    return await post<{ url: string }>("/export", { deck_json: req.deck_json, format: req.format });
  },
};

/** Local, no-backend projects index to keep builds unblocked */
export type ProjectIndexItem = { id: string; title: string; updated_at: number };
const LS_KEY = "manthan.projects";

export const ProjectsAPI = {
  async list(_uid: string): Promise<{ projects: ProjectIndexItem[] }> {
    if (typeof window === "undefined") return { projects: [] };
    const arr = JSON.parse(window.localStorage.getItem(LS_KEY) || "[]") as ProjectIndexItem[];
    return { projects: arr.sort((a, b) => b.updated_at - a.updated_at) };
  },
  async create(_uid: string, title: string): Promise<{ project_id: string }> {
    if (typeof window === "undefined") return { project_id: "" };
    const id = crypto.randomUUID();
    const arr = JSON.parse(window.localStorage.getItem(LS_KEY) || "[]") as ProjectIndexItem[];
    arr.push({ id, title, updated_at: Date.now() });
    window.localStorage.setItem(LS_KEY, JSON.stringify(arr));
    return { project_id: id };
  },
  async get(_uid: string, id: string): Promise<{ steps: any }> {
    if (typeof window === "undefined") return { steps: {} };
    const raw = window.localStorage.getItem(`manthan.project.${id}`);
    return { steps: raw ? JSON.parse(raw) : {} };
  },
  async saveStep(_uid: string, id: string, key: string, value: any): Promise<void> {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(`manthan.project.${id}`);
    const obj = raw ? JSON.parse(raw) : {};
    obj[key] = value;
    window.localStorage.setItem(`manthan.project.${id}`, JSON.stringify(obj));
    const arr = JSON.parse(window.localStorage.getItem(LS_KEY) || "[]") as ProjectIndexItem[];
    const i = arr.findIndex((p) => p.id === id);
    if (i >= 0) arr[i].updated_at = Date.now();
    window.localStorage.setItem(LS_KEY, JSON.stringify(arr));
  },
};


