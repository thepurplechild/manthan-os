"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../src/components/Wizard/Wizard.module.css";
import { GenAPI } from "../../src/lib/api";

type Step = 0 | 1 | 2 | 3 | 4; // Ideas, Outline, Script, Deck, Export
type Idea = { logline: string; premise: string };
type Outline = { outline: string };
type Script = { script: string };

function GuidedInner() {
  const qs = useSearchParams();

  const [step, setStep] = useState<Step>(0);
  const [genre, setGenre] = useState("thriller");
  const [language, setLanguage] = useState("Hindi");
  const [tone, setTone] = useState("gritty");
  const [seed, setSeed] = useState("");

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [chosenIdea, setChosenIdea] = useState<number | null>(null);

  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [chosenOutline, setChosenOutline] = useState<number | null>(null);

  const [scripts, setScripts] = useState<Script[]>([]);
  const [chosenScript, setChosenScript] = useState<number | null>(null);

  const [deckJson, setDeckJson] = useState<any | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toast(e: any) {
    console.error(e);
    setErr(typeof e === "string" ? e : e?.message || "Something went wrong");
    setTimeout(() => setErr(null), 3200);
  }

  // --- actions ---
  async function onGenIdeas() {
    if (!seed.trim()) return toast("Please enter a premise/seed.");
    setBusy(true);
    try {
      const r = await GenAPI.ideas({ genre, tone, seed, language });
      // The backend may return {content} or structured {options}; normalize to 3 options
      let options: Idea[] = [];
      if (r?.options?.length) {
        options = r.options.slice(0, 3);
      } else if (r?.content) {
        // naive split for now:
        const chunks = r.content.split(/\n{2,}/).slice(0, 3);
        options = chunks.map((c) => {
          const m = c.match(/logline[:\-]\s*(.*)/i);
          return { logline: m?.[1]?.trim() || c.slice(0, 120), premise: c.trim() };
        });
      }
      if (!options.length) throw new Error("Model returned no ideas.");
      setIdeas(options);
      setChosenIdea(null);
      setOutlines([]); setChosenOutline(null);
      setScripts([]); setChosenScript(null);
      setDeckJson(null);
      setStep(0);
    } catch (e) {
      toast(e);
    } finally {
      setBusy(false);
    }
  }

  async function onGenOutlines() {
    const idea = chosenIdea != null ? ideas[chosenIdea] : null;
    if (!idea) return toast("Choose one idea first.");
    setBusy(true);
    try {
      const r = await GenAPI.outlines({
        logline: `${idea.logline}\n\n${idea.premise}`,
        structure: "film",
        style: "Bollywood high-concept thriller",
        language,
      });
      let options: Outline[] = [];
      if (r?.options?.length) options = r.options.slice(0, 3);
      else if ((r as any)?.content) {
        const chunks = (r as any).content.split(/\n{2,}/).slice(0, 3);
        options = chunks.map((t) => ({ outline: t.trim() }));
      }
      if (!options.length) throw new Error("Model returned no outlines.");
      setOutlines(options);
      setChosenOutline(null);
      setScripts([]); setChosenScript(null);
      setDeckJson(null);
      setStep(1);
    } catch (e) {
      toast(e);
    } finally {
      setBusy(false);
    }
  }

  async function onGenScripts() {
    const o = chosenOutline != null ? outlines[chosenOutline] : null;
    if (!o) return toast("Choose one outline first.");
    setBusy(true);
    try {
      const r = await GenAPI.scripts({
        outline: o.outline,
        style: "cinematic, grounded, commercial",
        language,
      });
      let options: Script[] = [];
      if (r?.options?.length) options = r.options.slice(0, 3);
      else if ((r as any)?.content) {
        const chunks = (r as any).content.split(/\n{2,}/).slice(0, 3);
        options = chunks.map((t) => ({ script: t.trim() }));
      }
      if (!options.length) throw new Error("Model returned no script pages.");
      setScripts(options);
      setChosenScript(null);
      setDeckJson(null);
      setStep(2);
    } catch (e) {
      toast(e);
    } finally {
      setBusy(false);
    }
  }

  async function onBuildDeck() {
    const i = chosenIdea != null ? ideas[chosenIdea] : null;
    const o = chosenOutline != null ? outlines[chosenOutline] : null;
    const s = chosenScript != null ? scripts[chosenScript] : null;
    if (!i || !o || !s) return toast("Choose items in all previous steps.");
    setBusy(true);
    try {
      const r = await GenAPI.deckBuild({
        title: (i.logline || "Untitled").slice(0, 60),
        logline: i.logline,
        synopsis: i.premise,
        characters: "Key characters:\n" + o.outline.slice(0, 800),
        world: "World & tone:\n" + tone,
        comps: "Comparable titles for Indian market",
        toneboard: "Moody, premium, cinematic",
        language,
      });
      const built = r?.options?.[0]?.deck ?? (r as any)?.deck ?? null;
      if (!built) throw new Error("Model returned no deck JSON.");
      setDeckJson(built);
      setStep(3);
    } catch (e) {
      toast(e);
    } finally {
      setBusy(false);
    }
  }

  async function onExport(fmt: "pdf" | "docx") {
    if (!deckJson) return toast("Build the deck first.");
    setBusy(true);
    try {
      const { url } = await GenAPI.export({ deck_json: deckJson, format: fmt });
      window.open(url, "_blank");
      setStep(4);
    } catch (e) {
      toast(e);
    } finally {
      setBusy(false);
    }
  }

  // UI
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.title}>Creator Guided Path</div>
        <div className={styles.subtitle}>From premise to presentation deck in 5 steps.</div>
      </div>

      <div className={styles.stepper}>
        {["Ideas", "Outline", "Script", "Deck", "Export"].map((s, i) => (
          <div key={s} className={`${styles.step} ${i === step ? styles.stepActive : ""}`}>
            {s}
          </div>
        ))}
      </div>

      {/* Step 0: Seed -> Ideas */}
      <div className={styles.panel}>
        <label className={styles.label}>1. Enter Your Premise</label>
        <div className={styles.controls}>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className={styles.secondary}>
            <option>thriller</option><option>drama</option><option>romance</option><option>comedy</option>
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={styles.secondary}>
            <option>Hindi</option><option>English</option><option>Tamil</option><option>Telugu</option>
          </select>
          <input className={styles.secondary} placeholder="Tone (e.g., gritty)" value={tone} onChange={(e) => setTone(e.target.value)} />
        </div>
        <textarea className={styles.textarea} placeholder="Premise / seed" value={seed} onChange={(e) => setSeed(e.target.value)} />
        <div className={styles.footer}>
          <button className={styles.primary} onClick={onGenIdeas} disabled={busy}>Generate Ideas</button>
        </div>
      </div>

      {/* Ideas */}
      {ideas.length > 0 && (
        <>
          <h3 className={styles.section}>2. Choose an idea</h3>
          <div className={styles.cardGrid}>
            {ideas.map((it, idx) => (
              <div key={idx} className={`${styles.card} ${chosenIdea === idx ? styles.cardChosen : ""}`}>
                <div className={styles.cardTitle}>Idea {idx + 1}</div>
                <textarea
                  className={styles.cardText}
                  value={`Logline: ${it.logline}\n\nPremise: ${it.premise}`}
                  onChange={(e) => {
                    const [l, ...rest] = e.target.value.split("\n\nPremise:");
                    const logline = l.replace(/^Logline:\s*/i, "").trim();
                    const premise = (rest.join("Premise:") || "").trim();
                    const a = [...ideas]; a[idx] = { logline, premise }; setIdeas(a);
                  }}
                />
                <button onClick={() => setChosenIdea(idx)} className={styles.choice}>Use this</button>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.secondary} onClick={() => setIdeas([])}>Reset ideas</button>
            <button className={styles.primary} onClick={onGenOutlines} disabled={busy || chosenIdea == null}>Generate Outlines</button>
          </div>
        </>
      )}

      {/* Outlines */}
      {outlines.length > 0 && (
        <>
          <h3 className={styles.section}>3. Choose an outline</h3>
          <div className={styles.cardGrid}>
            {outlines.map((it, idx) => (
              <div key={idx} className={`${styles.card} ${chosenOutline === idx ? styles.cardChosen : ""}`}>
                <div className={styles.cardTitle}>Outline {idx + 1}</div>
                <textarea
                  className={styles.cardText}
                  value={it.outline}
                  onChange={(e) => {
                    const a = [...outlines]; a[idx] = { outline: e.target.value }; setOutlines(a);
                  }}
                />
                <button onClick={() => setChosenOutline(idx)} className={styles.choice}>Use this</button>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.secondary} onClick={() => setOutlines([])}>Reset outlines</button>
            <button className={styles.primary} onClick={onGenScripts} disabled={busy || chosenOutline == null}>Generate Script Pages</button>
          </div>
        </>
      )}

      {/* Scripts */}
      {scripts.length > 0 && (
        <>
          <h3 className={styles.section}>4. Choose a script sample</h3>
          <div className={styles.cardGrid}>
            {scripts.map((it, idx) => (
              <div key={idx} className={`${styles.card} ${chosenScript === idx ? styles.cardChosen : ""}`}>
                <div className={styles.cardTitle}>Script {idx + 1}</div>
                <textarea
                  className={styles.cardText}
                  value={it.script}
                  onChange={(e) => { const a = [...scripts]; a[idx] = { script: e.target.value }; setScripts(a); }}
                />
                <button onClick={() => setChosenScript(idx)} className={styles.choice}>Use this</button>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.secondary} onClick={() => setScripts([])}>Reset scripts</button>
            <button className={styles.primary} onClick={onBuildDeck} disabled={busy || chosenScript == null}>Build Deck JSON</button>
          </div>
        </>
      )}

      {/* Deck */}
      {deckJson && (
        <>
          <h3 className={styles.section}>5. Export</h3>
          <div className={styles.panel}>
            <textarea
              className={styles.textarea}
              style={{ minHeight: 220 }}
              value={JSON.stringify(deckJson, null, 2)}
              onChange={(e) => {
                try { setDeckJson(JSON.parse(e.target.value)); } catch {}
              }}
            />
            <div className={styles.footer}>
              <button className={styles.secondary} onClick={() => onExport("docx")} disabled={busy}>Export Docx</button>
              <button className={styles.primary} onClick={() => onExport("pdf")} disabled={busy}>Export PDF</button>
            </div>
          </div>
        </>
      )}

      {err && <div style={{ marginTop: 12, color: "#ffb4b4" }}>{err}</div>}
    </div>
  );
}

export default function GuidedPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <GuidedInner />
    </Suspense>
  );
}

