"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { useState } from "react";
import { api } from "../../src/lib/api";

export default function Guided() {
  const [seed, setSeed] = useState("");
  const [genre, setGenre] = useState("thriller");
  const [language, setLanguage] = useState("en");

  const [busy, setBusy] = useState(false);
  const [idea, setIdea] = useState("");
  const [logline, setLogline] = useState("");
  const [outline, setOutline] = useState("");
  const [script, setScript] = useState("");
  const [deck, setDeck] = useState<any>(null);

  async function stepIdea() {
    setBusy(true);
    const r = await api.post("/gen/idea", { genre, tone: "cinematic", seed, language });
    setIdea(r.data.content || "");
    // try to pull first logline automatically
    const first = String(r.data.content || "").split("\n").find(l => l.trim()) || "";
    setLogline(first.replace(/^\d+[\).\s-]*/, "").trim());
    setBusy(false);
  }

  async function stepOutline() {
    setBusy(true);
    const r = await api.post("/gen/outline", { logline, structure: "film", style: "Bollywood high-concept thriller", language });
    setOutline(r.data.content || "");
    setBusy(false);
  }

  async function stepScript() {
    setBusy(true);
    const r = await api.post("/gen/script", { outline, style: "Bollywood high-concept thriller", language });
    setScript(r.data.content || "");
    setBusy(false);
  }

  async function stepDeck() {
    setBusy(true);
    const payload = {
      title: (logline || "Untitled").slice(0, 80),
      logline,
      synopsis: outline,
      characters: "TBD",
      world: "TBD",
      comps: "TBD",
      toneboard: "TBD",
      language
    };
    const r = await api.post("/gen/deck", payload);
    setDeck(r.data.deck || { raw: "No deck data" });
    setBusy(false);
  }

  async function exportDeck(format: "pdf" | "docx") {
    if (!deck) return;
    setBusy(true);
    const r = await api.post("/export", { deck_json: deck, format });
    setBusy(false);
    if (r.data?.url) window.open(r.data.url, "_blank");
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Guided Path</h2>

      <div className="grid gap-3">
        <input
          placeholder="Seed Idea"
          value={seed}
          onChange={e=>setSeed(e.target.value)}
          className="bg-white/5 rounded px-3 py-2"
        />

        <div className="flex gap-2">
          <select value={genre} onChange={e=>setGenre(e.target.value)} className="bg-white/5 rounded px-3 py-2">
            <option>thriller</option><option>drama</option><option>rom-com</option>
            <option>action</option><option>satire</option><option>fantasy</option>
          </select>
          <select value={language} onChange={e=>setLanguage(e.target.value)} className="bg-white/5 rounded px-3 py-2">
            <option value="en">English</option><option value="hi">Hindi</option>
            <option value="ta">Tamil</option><option value="te">Telugu</option>
            <option value="bn">Bengali</option><option value="mr">Marathi</option>
          </select>
        </div>

        <button disabled={busy} onClick={stepIdea} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Generate Ideas</button>
        <textarea rows={6} value={idea} onChange={e=>setIdea(e.target.value)} className="bg-white/5 rounded p-3" />

        <input
          placeholder="Chosen logline"
          value={logline}
          onChange={e=>setLogline(e.target.value)}
          className="bg-white/5 rounded px-3 py-2"
        />

        <button disabled={busy} onClick={stepOutline} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Generate Outline</button>
        <textarea rows={10} value={outline} onChange={e=>setOutline(e.target.value)} className="bg-white/5 rounded p-3" />

        <button disabled={busy} onClick={stepScript} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Generate Script Pages</button>
        <textarea rows={10} value={script} onChange={e=>setScript(e.target.value)} className="bg-white/5 rounded p-3" />

        <button disabled={busy} onClick={stepDeck} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Build Deck JSON</button>
        <pre className="bg-black/40 p-3 rounded overflow-auto text-xs">{JSON.stringify(deck, null, 2)}</pre>

        <div className="flex gap-2">
          <button disabled={!deck || busy} onClick={() => exportDeck("pdf")} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Export PDF</button>
          <button disabled={!deck || busy} onClick={() => exportDeck("docx")} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Export Docx</button>
        </div>
      </div>
    </main>
  );
}

