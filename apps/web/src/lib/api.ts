// apps/web/src/lib/api.ts
// All frontend calls go via Next proxy: /api/proxy/*
// Server reads API_BASE from Cloud Run env; browser never needs the URL.

export type IdeaOption = { logline: string; premise: string };
export type OutlineOption = { outline: string };
export type ScriptOption = { script: string };

const PROXY = "/api/proxy";

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`API ${r.status}: ${txt.slice(0, 300)}`);
  }
  return r.json() as Promise<T>;
}

export const GenAPI = {
  ideas: async (body: {
    genre: string;
    tone: string;
    seed: string;
    language: string;
  }): Promise<{ options: IdeaOption[] }> => {
    const r = await fetch(`${PROXY}/gen/idea`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await j<{ content?: string; options?: IdeaOption[] }>(r);
    if (data.options) return { options: data.options };
    // fallback: parse plain text content into 3 ideas if backend returns text
    const content = (data as any).content as string | undefined;
    const items =
      content
        ?.split(/\n{2,}/)
        .slice(0, 3)
        .map((chunk) => {
          const m = chunk.match(/logline:\s*(.*)/i);
          return {
            logline: m ? m[1].trim() : chunk.trim().slice(0, 140),
            premise: chunk.trim(),
          };
        }) ?? [];
    return { options: items as IdeaOption[] };
  },

  outlines: async (body: {
    logline: string;
    structure: string;
    style: string;
    language: string;
  }): Promise<{ options: OutlineOption[] }> => {
    const r = await fetch(`${PROXY}/gen/outline`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await j<{ content?: string; options?: OutlineOption[] }>(r);
    if (data.options) return { options: data.options };
    const outline =
      (data as any).content ??
      "Act I:\n...\n\nAct II:\n...\n\nAct III:\n...";
    return { options: [{ outline }] };
  },

  scripts: async (body: {
    outline: string;
    style: string;
    language: string;
  }): Promise<{ options: ScriptOption[] }> => {
    const r = await fetch(`${PROXY}/gen/script`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await j<{ content?: string; options?: ScriptOption[] }>(r);
    if (data.options) return { options: data.options };
    const script = (data as any).content ?? "INT. ROOM - DAY\n...";
    return { options: [{ script }] };
  },

  deckBuild: async (body: any): Promise<{ options: any[] }> => {
    const r = await fetch(`${PROXY}/gen/deck`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return j(r);
  },

  export: async (body: {
    deck_json: any;
    format: "pdf" | "docx";
  }): Promise<{ url: string }> => {
    const r = await fetch(`${PROXY}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return j(r);
  },
};

// (Optional) simple projects API if you’re using it later:
// export const ProjectsAPI = { ... }


