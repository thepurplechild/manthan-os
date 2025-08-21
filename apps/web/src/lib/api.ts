// apps/web/src/lib/api.ts
"use client";

/**
 * Unified frontend API for ManthanOS web.
 * - GenAPI: calls the backend (Cloud Run) for generation/export
 * - ProjectsAPI: browser-safe localStorage stub (so pages compile/run without server storage)
 *
 * Notes
 * - Backend base URL is retrieved at runtime from /api/app-config (populated via Cloud Run env).
 * - ProjectsAPI returns shapes that match existing pages (array and { projects } both supported).
 */

/* =================== Types =================== */
export type IdeaOption = { logline: string; premise: string };
export type OutlineOption = { outline: string };
export type ScriptOption = { script: string };

type IdeaReq = { genre: string; tone: string; seed: string; language: string };
type OutlineReq = { logline: string; structure: string; style: string; language: string };
type ScriptReq = { outline: string; style: string; language: string };
type DeckReq = {
  title: string;
  logline: string;
  synopsis: string;
  characters: string;
  world: string;
  comps: string;
  toneboard?: string;
  language: string;
};
type ExportReq = { deck_json: any; format: "pdf" | "docx" };

/* =================== Runtime config =================== */

let runtimeCache: { API_BASE: string } | null = null;

async function getRuntime(): Promise<{ API_BASE: string }> {
  if (runtimeCache) return runtimeCache;
  // This route must exist at apps/web/app/api/app-config/route.ts
  const res = await fetch("/api/app-config", { cache: "no-store" });
  if (!res.ok) throw new Error("Cannot load runtime app-config.");
  const data = (await res.json()) as { API_BASE: string };
  if (!data?.API_BASE) {
    throw new Error(
      "API base URL is empty. Set NEXT_PUBLIC_API_BASE on the frontend Cloud Run service."
    );
  }
  runtimeCache = data;
  return data;
}

async function post<T>(path: string, body: any): Promise<T> {
  const { API_BASE } = await getRuntime();
  const url = `${API_BASE.replace(/\/$/, "")}${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${path} failed: ${r.status} ${text.slice(0, 500)}`);
  }
  return (await r.json()) as T;
}

/* =================== GenAPI (backend calls) =================== */

export const GenAPI = {
  ideas: (req: IdeaReq) =>
    post<{ content?: string; options?: IdeaOption[] }>("/gen/idea", req),
  outlines: (req: OutlineReq) =>
    post<{ content?: string; options?: OutlineOption[] }>("/gen/outline", req),
  scripts: (req: ScriptReq) =>
    post<{ content?: string; options?: ScriptOption[] }>("/gen/script", req),
  deckBuild: (req: DeckReq) =>
    post<{ deck?: any; options?: { deck: any }[] }>("/gen/deck", req),
  export: (req: ExportReq) => post<{ url: string }>("/export", req),
};

/* =================== ProjectsAPI (browser localStorage stub) =================== */

export type ProjectIndexItem = { project_id: string; title: string; updatedAt: number };
type StepName = "ideas" | "outline" | "script" | "deck";
type ProjectSteps = {
  ideas?: { options: IdeaOption[]; chosen: number | null; meta?: any };
  outline?: { options: OutlineOption[]; chosen: number | null; input?: IdeaOption };
  script?: { options: ScriptOption[]; chosen: number | null; input?: OutlineOption };
  deck?: { deckJson: any };
};

export type ProjectDoc = {
  meta: { title: string; createdAt: number; updatedAt: number };
  steps: ProjectSteps;
};

const isBrowser = typeof window !== "undefined";
const PREFIX = "manthan:projects";

function idxKey(uid: string) {
  return `${PREFIX}:${uid}:index`;
}
function docKey(uid: string, pid: string) {
  return `${PREFIX}:${uid}:${pid}`;
}

function readIndex(uid: string): ProjectIndexItem[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(idxKey(uid));
    return raw ? (JSON.parse(raw) as ProjectIndexItem[]) : [];
  } catch {
    return [];
  }
}
function writeIndex(uid: string, items: ProjectIndexItem[]) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(idxKey(uid), JSON.stringify(items));
  } catch {}
}
function readDoc(uid: string, pid: string): ProjectDoc | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(docKey(uid, pid));
    return raw ? (JSON.parse(raw) as ProjectDoc) : null;
  } catch {
    return null;
  }
}
function writeDoc(uid: string, pid: string, doc: ProjectDoc) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(docKey(uid, pid), JSON.stringify(doc));
  } catch {}
}
function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const ProjectsAPI = {
  /**
   * Returns an Array that ALSO has a `.projects` property so both of these work:
   *   const arr = await ProjectsAPI.list(uid)
   *   const { projects } = await ProjectsAPI.list(uid)
   */
  async list(
    uid: string
  ): Promise<ProjectIndexItem[] & { projects: ProjectIndexItem[] }> {
    const arr = readIndex(uid);
    // Make a hybrid so callers can use either pattern
    const hybrid = Object.assign([...arr], { projects: arr });
    return hybrid as ProjectIndexItem[] & { projects: ProjectIndexItem[] };
  },

  async create(uid: string, title: string): Promise<{ project_id: string }> {
    if (!isBrowser) return { project_id: "" };
    const pid = newId();
    const now = Date.now();
    const index = readIndex(uid);
    index.unshift({ project_id: pid, title: title || "Untitled", updatedAt: now });
    writeIndex(uid, index);
    const doc: ProjectDoc = {
      meta: { title: title || "Untitled", createdAt: now, updatedAt: now },
      steps: {},
    };
    writeDoc(uid, pid, doc);
    return { project_id: pid };
  },

  async get(uid: string, pid: string): Promise<ProjectDoc> {
    const doc = readDoc(uid, pid);
    return (
      doc || {
        meta: {
          title: "Untitled",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        steps: {},
      }
    );
  },

  async saveStep(uid: string, pid: string, step: StepName, payload: any): Promise<void> {
    const doc = readDoc(uid, pid);
    const merged: ProjectDoc = doc || {
      meta: {
        title: "Untitled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      steps: {},
    };
    merged.steps = { ...merged.steps, [step]: payload };
    merged.meta.updatedAt = Date.now();
    writeDoc(uid, pid, merged);

    // update index updatedAt
    const idx = readIndex(uid);
    const i = idx.findIndex((x) => x.project_id === pid);
    if (i >= 0) {
      idx[i] = { ...idx[i], updatedAt: merged.meta.updatedAt };
      writeIndex(uid, idx);
    }
  },
};

