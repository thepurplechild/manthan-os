"use client";

import { useEffect, useState } from "react";
import OptionCard from "../../src/components/Wizard/OptionCard";
import { GenAPI, IdeaOption, OutlineOption, ScriptOption, ProjectsAPI } from "../../src/lib/api";
import { requireUid } from "../../src/lib/firebase";

type Step = 0 | 1 | 2 | 3 | 4;

export default function GuidedPage({ searchParams }: { searchParams: { pid?: string } }) {
  const [step, setStep] = useState<Step>(0);

  const [genre, setGenre] = useState("thriller");
  const [language, setLanguage] = useState("English");
  const [tone, setTone] = useState("gritty");
  const [seed, setSeed] = useState("");

  const [ideas, setIdeas] = useState<IdeaOption[]>([]);
  const [chosenIdeaIdx, setChosenIdeaIdx] = useState<number | null>(null);

  const [outlines, setOutlines] = useState<OutlineOption[]>([]);
  const [chosenOutlineIdx, setChosenOutlineIdx] = useState<number | null>(null);

  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [chosenScriptIdx, setChosenScriptIdx] = useState<number | null>(null);

  const [deckJson, setDeckJson] = useState<any | null>(null);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restore project if pid is present
    (async () => {
      const pid = searchParams?.pid;
      if (!pid) return;
      try {
        const uid = await requireUid();
        const data = await ProjectsAPI.get(uid, pid);
        setProjectId(pid);
        const s = data.steps || {};
        if (s.ideas) { setIdeas(s.ideas.options || []); setChosenIdeaIdx(s.ideas.chosen ?? null); }
        if (s.outline) { setOutlines(s.outline.options || []); setChosenOutlineIdx(s.outline.chosen ?? null); }
        if (s.script) { setScripts(s.script.options || []); setChosenScriptIdx(s.script.chosen ?? null); }
        if (s.deck) { setDeckJson(s.deck.deckJson || null); }
      } catch { /* ignore */ }
    })();
  }, [searchParams?.pid]);

  function toastErr(e: any) {
    console.error(e);
    setError(e?.message || "Something went wrong");
    setTimeout(() => setError(null), 3000);
  }

  async function ensureProject() {
    const uid = await requireUid();
    if (projectId) return { uid, pid: projectId };
    const created = await ProjectsAPI.create(uid, "Guided Project");
    setProjectId(created.project_id);
    history.replaceState(null, "", `/guided?pid=${created.project_id}`);
    return { uid, pid: created.project_id };
  }

  async function onGenIdeas() {
    if (!seed.trim()) return toastErr(new Error("Enter a premise first."));
    setBusy(true);
    try {
      const { options } = await GenAPI.ideas({ genre, tone, seed, language });
      // take first 3 for cleaner UI if more come back
      const top3 = options.slice(0, 3).map(o => ({ ...o }));
      setIdeas(top3); setChosenIdeaIdx(null); setStep(0);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "ideas", { options: top3, chosen: null, meta: { genre, tone, language, seed } });
    } catch (e) { toastErr(e); } finally { setBusy(false); }
  }

  async function onGenOutlines() {
    const idea = chosenIdeaIdx != null ? ideas[chosenIdeaIdx] : null;
    if (!idea) return toastErr(new Error("Pick an idea first."));
    setBusy(true);
    try {
      const { options } = await GenAPI.outlines({
        logline: idea.logline + "\n\n" + idea.premise,
        structure: "film",
        style: "Commercial, character-led",
        language
      });
      const top3 = options.slice(0, 3);
      setOutlines(top3); setChosenOutlineIdx(null); setStep(1);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "outline", { options: top3, chosen: null, input: idea });
    } catch (e) { toastErr(e); } finally { setBusy(false); }
  }

  async function onGenScripts() {
    const outline = chosenOutlineIdx != null ? outlines[chosenOutlineIdx] : null;
    if (!outline) return toastErr(new Error("Pick an outline first."));
    setBusy(true);
    try {
      const { options } = await GenAPI.scripts({ outline: outline.outline, style: "cinematic, grounded", language });
      const top3 = options.slice(0, 3);
      setScripts(top3); setChosenScriptIdx(null); setStep(2);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "script", { options: top3, chosen: null, input: outline });
    } catch (e) { toastErr(e); } finally { setBusy(false); }
  }

  async function onBuildDeck() {
    const idea = chosenIdeaIdx != null ? ideas[chosenIdeaIdx] : null;
    const outline = chosenOutlineIdx != null ? outlines[chosenOutlineIdx] : null;
    const script = chosenScriptIdx != null ? scripts[chosenScriptIdx] : null;
    if (!idea || !outline || !script) return toastErr(new Error("Pick items in all steps."));
    setBusy(true);
    try {
      const { options } = await GenAPI.deckBuild({
        title: (idea.logline || "Untitled").slice(0, 60),
        logline: idea.logline,
        synopsis: idea.premise,
        characters: outline.outline.slice(0, 800),
        world: tone,
        comps: "Comparable titles (IN market)",
        toneboard: "Premium, cinematic",
        language
      });
      const built = options[0]?.deck || null;
      setDeckJson(built); setStep(3);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "deck", { deckJson: built });
    } catch (e) { toastErr(e); } finally { setBusy(false); }
  }

  async function onExport(fmt: "pdf" | "docx") {
    if (!deckJson) return toastErr(new Error("Build the deck first."));
    setBusy(true);
    try {
      const { url } = await GenAPI.export({ deck_json: deckJson, format: fmt });
      window.open(url, "_blank");
      setStep(4);
    } catch (e) { toastErr(e); } finally { setBusy(false); }
  }

  return (
    <div>
      <h1>Creator Guided Path</h1>
      <p className="kicker">From premise to presentation deck in 5 steps.</p>

      <div className="stepper">
        {["Ideas", "Outline", "Script", "Deck", "Export"].map((s, i) => (
          <span key={s} className={`step ${i === step ? "active" : ""}`}>{s}</span>
        ))}
      </div>

      {/* Step 0: Premise */}
      <section className="panel" style={{ padding: 18, marginBottom: 20 }}>
        <h3>1. Enter Your Premise</h3>
        <p className="kicker">Provide the core concept, then click Generate to see three options.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="panel" style={{ gridColumn: "span 12", background: "transparent", border: "none", boxShadow: "none" }}>
            <input className="input" placeholder="Premise (e.g., a kind man with a short fuse…)"
                   value={seed} onChange={(e) => setSeed(e.target.value)} />
          </div>
          <div style={{ gridColumn: "span 4" }}>
            <select className="select" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option>thriller</option><option>drama</option><option>romance</option><option>comedy</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 4" }}>
            <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option><option>Hindi</option><option>Tamil</option><option>Telugu</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 4" }}>
            <input className="input" placeholder="Tone (e.g., gritty)" value={tone} onChange={(e) => setTone(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button className="btn primary" onClick={onGenIdeas} disabled={busy}>Generate Ideas</button>
        </div>
      </section>

      {/* Ideas */}
      {ideas.length > 0 && (
        <>
          <h3>2. Pick & Edit Your Idea</h3>
          <div className="row" style={{ marginTop: 12 }}>
            {ideas.map((it, idx) => (
              <OptionCard
                key={idx}
                title={`Idea ${idx + 1}`}
                value={`Logline: ${it.logline}\n\nPremise: ${it.premise}`}
                onChange={(v) => {
                  const [l, ...rest] = v.split("\n\nPremise:");
                  const logline = l.replace(/^Logline:\s*/i, "").trim();
                  const premise = (rest.join("Premise:") || "").trim();
                  const next = [...ideas];
                  next[idx] = { logline, premise };
                  setIdeas(next);
                }}
                onChoose={() => setChosenIdeaIdx(idx)}
                chosen={chosenIdeaIdx === idx}
              />
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setIdeas([])}>Reset</button>
            <button className="btn primary" onClick={onGenOutlines} disabled={busy || chosenIdeaIdx == null}>
              Generate Outlines
            </button>
          </div>
        </>
      )}

      {/* Outlines */}
      {outlines.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>3. Pick & Edit Your Outline</h3>
          <div className="row" style={{ marginTop: 12 }}>
            {outlines.map((it, idx) => (
              <OptionCard
                key={idx}
                title={`Outline ${idx + 1}`}
                value={it.outline}
                onChange={(v) => { const next = [...outlines]; next[idx] = { outline: v }; setOutlines(next); }}
                onChoose={() => setChosenOutlineIdx(idx)}
                chosen={chosenOutlineIdx === idx}
              />
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setOutlines([])}>Reset</button>
            <button className="btn primary" onClick={onGenScripts} disabled={busy || chosenOutlineIdx == null}>
              Generate Script Pages
            </button>
          </div>
        </>
      )}

      {/* Scripts */}
      {scripts.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>4. Pick & Edit Script Pages</h3>
          <div className="row" style={{ marginTop: 12 }}>
            {scripts.map((it, idx) => (
              <OptionCard
                key={idx}
                title={`Script ${idx + 1}`}
                value={it.script}
                onChange={(v) => { const next = [...scripts]; next[idx] = { script: v }; setScripts(next); }}
                onChoose={() => setChosenScriptIdx(idx)}
                chosen={chosenScriptIdx === idx}
              />
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setScripts([])}>Reset</button>
            <button className="btn primary" onClick={onBuildDeck} disabled={busy || chosenScriptIdx == null}>
              Build Deck JSON
            </button>
          </div>
        </>
      )}

      {/* Deck */}
      {deckJson && (
        <section className="panel" style={{ padding: 16, marginTop: 24 }}>
          <h3>5. Export</h3>
          <p className="kicker">Deck JSON built. Export as PDF or DOCX.</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "rgba(255,255,255,.04)", padding: 12, borderRadius: 10, overflow: "auto", maxHeight: 260 }}>
            {JSON.stringify(deckJson, null, 2)}
          </pre>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => onExport("docx")} disabled={busy}>Export Docx</button>
            <button className="btn primary" onClick={() => onExport("pdf")} disabled={busy}>Export PDF</button>
          </div>
        </section>
      )}

      {error && <div style={{ marginTop: 12, color: "#ffb4b4" }}>{error}</div>}
    </div>
  );
}
