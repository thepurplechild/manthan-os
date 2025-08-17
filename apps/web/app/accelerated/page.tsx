"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useState } from "react";
import { api } from "../../src/lib/api";

export default function Accelerated() {
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState("");
  const [deck, setDeck] = useState<any>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("language", language);
    setBusy(true);
    try {
      const r = await api.post("/ingest/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setExtracted(r.data?.extracted ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function buildDeck() {
    setBusy(true);
    try {
      const payload = {
        title: "Untitled",
        logline: "",
        synopsis: extracted,
        characters: "TBD",
        world: "TBD",
        comps: "TBD",
        toneboard: "TBD",
        language
      };
      const r = await api.post("/gen/deck", payload);
      setDeck(r.data?.deck || { raw: "No deck data" });
    } finally {
      setBusy(false);
    }
  }

  async function exportDeck(format: "pdf" | "docx") {
    if (!deck) return;
    setBusy(true);
    try {
      const r = await api.post("/export", { deck_json: deck, format });
      if (r.data?.url) window.open(r.data.url, "_blank");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Accelerated Path</h2>

      <div className="flex items-center gap-3">
        <select value={language} onChange={e=>setLanguage(e.target.value)} className="bg-white/5 rounded px-3 py-2">
          <option value="en">English</option><option value="hi">Hindi</option>
          <option value="ta">Tamil</option><option value="te">Telugu</option>
          <option value="bn">Bengali</option><option value="mr">Marathi</option>
        </select>

        <input type="file" accept=".txt,.md,.docx,.pdf" onChange={onUpload} className="block text-sm" />
        {busy && <span className="text-sm text-gray-400">Working…</span>}
      </div>

      <div className="grid gap-3">
        <label className="text-sm text-gray-400">Extracted summary / fields</label>
        <textarea rows={10} value={extracted} onChange={e=>setExtracted(e.target.value)} className="bg-white/5 rounded p-3" />
      </div>

      <div className="flex gap-2">
        <button disabled={!extracted || busy} onClick={buildDeck}
                className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50">
          Build Deck JSON
        </button>
        <button disabled={!deck || busy} onClick={() => exportDeck("pdf")}
                className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50">
          Export PDF
        </button>
        <button disabled={!deck || busy} onClick={() => exportDeck("docx")}
                className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50">
          Export Docx
        </button>
      </div>

      <pre className="bg-black/40 p-3 rounded overflow-auto text-xs">{JSON.stringify(deck, null, 2)}</pre>
    </main>
  );
}

