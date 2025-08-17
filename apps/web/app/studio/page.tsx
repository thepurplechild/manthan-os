"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useAuth } from "../../src/components/AuthProvider";
import { api } from "../../src/lib/api";

type Outline = { title?: string; beats: string; notes?: string };
type OnePager = { title?: string; body: string };
type Deck = any;

export default function Studio() {
  const { user, ready } = useAuth();
  const [language, setLanguage] = useState("en");
  const [seed, setSeed] = useState("");
  const [logline, setLogline] = useState("");
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [chosenOutline, setChosenOutline] = useState<Outline | null>(null);
  const [onepagers, setOnepagers] = useState<OnePager[]>([]);
  const [chosenOnepager, setChosenOnepager] = useState<OnePager | null>(null);
  const [deckFirst, setDeckFirst] = useState(true);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [screenplay, setScreenplay] = useState("");
  const [dialogue, setDialogue] = useState("");
  const [busy, setBusy] = useState(false);

  if (ready && !user) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h2 className="text-xl font-semibold">Please sign in</h2>
        <p className="text-gray-400">Sign in to access the Studio.</p>
      </main>
    );
  }

  async function genIdeas() {
    setBusy(true);
    const r = await api.post("/gen/idea", { genre: "custom", tone: "cinematic", seed, language });
    // scrape first logline if present
    const first = String(r.data.content || "").split("\n").find(l => l.trim().length > 0) || "";
    setLogline(first.replace(/^\d+[\).\s-]*/, "").trim());
    setBusy(false);
  }

  async function genOutlineVariants() {
    setBusy(true);
    const r = await api.post("/gen/outline_variants", { logline, style: "Bollywood high-concept thriller", language, variants: 3 });
    setOutlines(r.data.variants || []);
    setBusy(false);
  }

  async function genOnePagerVariants() {
    if (!chosenOutline) return;
    setBusy(true);
    const r = await api.post("/gen/onepager_variants", { outline: chosenOutline.beats, language, variants: 3 });
    setOnepagers(r.data.variants || []);
    setBusy(false);
  }

  async function buildDeck() {
    const payload = {
      title: chosenOnepager?.title || "Untitled",
      logline,
      synopsis: chosenOnepager?.body || chosenOutline?.beats || "",
      characters: "TBD",
      world: "TBD",
      comps: "TBD",
      toneboard: "TBD",
      language
    };
    setBusy(true);
    const r = await api.post("/gen/deck", payload);
    setDeck(r.data.deck);
    setBusy(false);
  }

  async function genScreenplay() {
    if (!chosenOutline) return;
    setBusy(true);
    const r = await api.post("/gen/script", { outline: chosenOutline.beats, style: "Bollywood high-concept thriller", language });
    setScreenplay(r.data.content);
    setBusy(false);
  }

  async function polishDialogue() {
    setBusy(true);
    const r = await api.post("/gen/dialogue", { pages: screenplay, language });
    setDialogue(r.data.content);
    setBusy(false);
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-10">
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Idea</h2>
        <div className="flex gap-2">
          <input className="bg-white/5 rounded px-3 py-2 flex-1" placeholder="Seed / logline hint" value={seed} onChange={e=>setSeed(e.target.value)} />
          <select value={language} onChange={e=>setLanguage(e.target.value)} className="bg-white/5 rounded px-3">
            <option value="en">English</option><option value="hi">Hindi</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="bn">Bengali</option><option value="mr">Marathi</option>
          </select>
          <button disabled={busy} onClick={genIdeas} className="bg-white/10 hover:bg-white/20 rounded px-4">Generate</button>
        </div>
        <input className="bg-white/5 rounded px-3 py-2 w-full" placeholder="Chosen logline" value={logline} onChange={e=>setLogline(e.target.value)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Outlines (pick or edit)</h2>
        <button disabled={busy} onClick={genOutlineVariants} className="bg-white/10 hover:bg-white/20 rounded px-4">Generate 3 variants</button>
        <div className="grid md:grid-cols-3 gap-4">
          {outlines.map((o, i) => (
            <div key={i} className={`rounded-xl p-3 ${chosenOutline===o?'bg-white/20':'bg-white/10'}`}>
              <textarea className="w-full h-56 bg-transparent outline-none" value={o.beats} onChange={e => {
                const next = [...outlines]; next[i] = { ...o, beats: e.target.value }; setOutlines(next);
              }} />
              <div className="flex justify-end">
                <button onClick={()=>setChosenOutline(o)} className="mt-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded">Choose</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">One-pager (pick or edit)</h2>
        <button disabled={busy || !chosenOutline} onClick={genOnePagerVariants} className="bg-white/10 hover:bg-white/20 rounded px-4">Generate 3 variants</button>
        <div className="grid md:grid-cols-3 gap-4">
          {onepagers.map((p, i) => (
            <div key={i} className={`rounded-xl p-3 ${chosenOnepager===p?'bg-white/20':'bg-white/10'}`}>
              <input className="w-full bg-transparent border-b border-white/10 mb-2 outline-none" value={p.title || ""} placeholder="Title"
                onChange={e => { const next=[...onepagers]; next[i] = { ...p, title: e.target.value }; setOnepagers(next);} }/>
              <textarea className="w-full h-56 bg-transparent outline-none" value={p.body}
                onChange={e => { const next=[...onepagers]; next[i] = { ...p, body: e.target.value }; setOnepagers(next);} }/>
              <div className="flex justify-between mt-2">
                <label className="text-xs flex items-center gap-2">
                  <input type="checkbox" checked={deckFirst} onChange={e=>setDeckFirst(e.target.checked)} />
                  Put Deck before Screenplay
                </label>
                <button onClick={()=>setChosenOnepager(p)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded">Choose</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Build Deck / Screenplay</h2>
        <div className="flex gap-2">
          {deckFirst ? (
            <>
              <button disabled={busy || !chosenOnepager} onClick={buildDeck} className="bg-white/10 hover:bg-white/20 rounded px-4">Build Deck</button>
              <button disabled={busy || !chosenOutline} onClick={genScreenplay} className="bg-white/10 hover:bg-white/20 rounded px-4">Generate Screenplay</button>
            </>
          ) : (
            <>
              <button disabled={busy || !chosenOutline} onClick={genScreenplay} className="bg-white/10 hover:bg-white/20 rounded px-4">Generate Screenplay</button>
              <button disabled={busy || !chosenOnepager} onClick={buildDeck} className="bg-white/10 hover:bg-white/20 rounded px-4">Build Deck</button>
            </>
          )}
          <button disabled={busy || !screenplay} onClick={polishDialogue} className="bg-white/10 hover:bg-white/20 rounded px-4">Dialogue polish</button>
        </div>

        {deck && <pre className="bg-black/40 p-3 rounded text-xs overflow-auto">{JSON.stringify(deck,null,2)}</pre>}
        {screenplay && <textarea className="w-full h-64 bg-white/5 rounded p-3" value={screenplay} onChange={e=>setScreenplay(e.target.value)} />}
        {dialogue && <>
          <h3 className="text-xl font-semibold">Dialogue pass</h3>
          <textarea className="w-full h-48 bg-white/5 rounded p-3" value={dialogue} onChange={e=>setDialogue(e.target.value)} />
        </>}
      </section>
    </main>
  );
}
