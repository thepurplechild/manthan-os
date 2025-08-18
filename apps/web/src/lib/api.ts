const API = process.env.NEXT_PUBLIC_API_BASE!;

async function postJSON<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
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
