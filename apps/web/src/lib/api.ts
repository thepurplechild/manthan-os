const API = process.env.NEXT_PUBLIC_API_BASE!; // e.g. https://manthan-backend-...run.app

async function postJSON<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type IdeaOption = { logline: string; premise: string };
export type OutlineOption = { outline: string };
export type ScriptOption = { script: string };

export const GenAPI = {
  ideas: (p: { genre: string; tone: string; seed: string; language: string }) =>
    postJSON<{ options: IdeaOption[] }>("/v2/gen/ideas", p),
  outlines: (p: { logline: string; structure: string; style: string; language: string }) =>
    postJSON<{ options: OutlineOption[] }>("/v2/gen/outlines", p),
  scripts: (p: { outline: string; style: string; language: string }) =>
    postJSON<{ options: ScriptOption[] }>("/v2/gen/scripts", p),
  deckBuild: (p: {
    title: string; logline: string; synopsis: string; characters: string; world: string; comps: string; toneboard?: string; language: string;
  }) => postJSON<{ options: [{ deck: any }] }>("/v2/deck/build", p),
  export: (p: { deck_json: any; format: "pdf" | "docx" }) =>
    postJSON<{ url: string }>("/export", p),
};

export const ProjectsAPI = {
  create: (uid: string, title?: string) =>
    postJSON<{ project_id: string }>("/v2/projects/create", { uid, title }),
  saveStep: (uid: string, project_id: string, step: string, payload: any) =>
    postJSON<{ ok: true }>("/v2/projects/save-step", { uid, project_id, step, payload }),
  list: (uid: string) => getJSON<{ projects: any[] }>(`/v2/projects/list?uid=${encodeURIComponent(uid)}`),
  get: (uid: string, project_id: string) =>
    getJSON<any>(`/v2/projects/get?uid=${encodeURIComponent(uid)}&project_id=${encodeURIComponent(project_id)}`),
};
