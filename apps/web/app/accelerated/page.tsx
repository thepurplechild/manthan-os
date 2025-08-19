"use client";
import { useState } from "react";
import styles from "../../src/components/Wizard/Wizard.module.css";
import OptionCard from "../../src/components/Wizard/OptionCard";
import { GenAPI, OutlineOption, ScriptOption } from "../../src/lib/api";

export default function AcceleratedPage() {
  const [language, setLanguage] = useState("Hindi");
  const [extracted, setExtracted] = useState<string>("");
  const [outlines, setOutlines] = useState<OutlineOption[]>([]);
  const [chosenOutlineIdx, setChosenOutlineIdx] = useState<number | null>(null);
  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [chosenScriptIdx, setChosenScriptIdx] = useState<number | null>(null);
  const [deckJson, setDeckJson] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toast(e:any){ setErr(e?.message||"Error"); setTimeout(()=>setErr(null),2800); }

  async function onUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("language", language);
    setBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/ingest/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setExtracted(data.extracted || "");
    } catch(e:any){ toast(e); } finally { setBusy(false); }
  }

  async function onGenOutlines() {
    if (!extracted.trim()) return toast(new Error("Upload a file first."));
    setBusy(true);
    try {
      const { options } = await GenAPI.outlines({
        logline: extracted.slice(0, 800),
        structure: "film",
        style: "Bollywood high-concept thriller",
        language
      });
      setOutlines(options); setChosenOutlineIdx(null);
    } catch(e:any){ toast(e); } finally { setBusy(false); }
  }

  async function onGenScripts() {
    const outline = chosenOutlineIdx!=null ? outlines[chosenOutlineIdx] : null;
    if (!outline) return toast(new Error("Choose an outline first."));
    setBusy(true);
    try {
      const { options } = await GenAPI.scripts({ outline: outline.outline, style:"cinematic", language });
      setScripts(options); setChosenScriptIdx(null);
    } catch(e:any){ toast(e); } finally { setBusy(false); }
  }

  async function onBuildDeck() {
    const outline = chosenOutlineIdx!=null ? outlines[chosenOutlineIdx] : null;
    const script = chosenScriptIdx!=null ? scripts[chosenScriptIdx] : null;
    if (!outline || !script) return toast(new Error("Choose outline + script."));
    setBusy(true);
    try {
      const { options } = await GenAPI.deckBuild({
        title: "Untitled",
        logline: extracted.slice(0, 140),
        synopsis: extracted.slice(0, 800),
        characters: "From extraction and outline.",
        world: "From extraction.",
        comps: "Comparable Indian titles",
        toneboard: "Premium, cinematic",
        language
      });
      setDeckJson(options[0]?.deck || null);
    } catch(e:any){ toast(e); } finally { setBusy(false); }
  }

  async function onExport(fmt: "pdf"|"docx") {
    if (!deckJson) return;
    const { url } = await GenAPI.export({ deck_json: deckJson, format: fmt });
    window.open(url, "_blank");
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}><div className={styles.title}>Accelerated Path</div>
        <div className={styles.subtitle}>Upload → extract → outline → script → deck</div></div>

      <div className={styles.panel}>
        <div className={styles.controls}>
          <select value={language} onChange={(e)=>setLanguage(e.target.value)} className={styles.secondary}>
            <option>Hindi</option><option>English</option><option>Tamil</option><option>Telugu</option>
          </select>
          <input type="file" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) onUpload(f); }} />
        </div>
        <textarea className={styles.textarea} placeholder="Extraction preview" value={extracted}
          onChange={(e)=>setExtracted(e.target.value)} />
        <div className={styles.footer}>
          <button className={styles.primary} onClick={onGenOutlines} disabled={busy}>Generate Outlines</button>
        </div>
      </div>

      {outlines.length>0 && (
        <>
          <h3 style={{margin:"14px 0 8px"}}>Outlines (choose one)</h3>
          <div className={styles.row}>
            {outlines.map((o,idx)=>(
              <OptionCard key={idx} title={`Outline ${idx+1}`} value={o.outline}
                onChange={(v)=>{ const arr=[...outlines]; arr[idx]={outline:v}; setOutlines(arr); }}
                onChoose={()=>setChosenOutlineIdx(idx)} chosen={chosenOutlineIdx===idx} />
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.primary} onClick={onGenScripts} disabled={busy||chosenOutlineIdx==null}>Generate Script Pages</button>
          </div>
        </>
      )}

      {scripts.length>0 && (
        <>
          <h3 style={{margin:"14px 0 8px"}}>Script (choose one)</h3>
          <div className={styles.row}>
            {scripts.map((s,idx)=>(
              <OptionCard key={idx} title={`Script ${idx+1}`} value={s.script}
                onChange={(v)=>{ const arr=[...scripts]; arr[idx]={script:v}; setScripts(arr); }}
                onChoose={()=>setChosenScriptIdx(idx)} chosen={chosenScriptIdx===idx} />
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.primary} onClick={onBuildDeck} disabled={busy||chosenScriptIdx==null}>Build Deck JSON</button>
          </div>
        </>
      )}

      {deckJson && (
        <>
          <h3 style={{margin:"14px 0 8px"}}>Deck JSON</h3>
          <div className={styles.panel}>
            <textarea className={styles.textarea} style={{minHeight:220}}
              value={JSON.stringify(deckJson,null,2)} onChange={(e)=>{ try{ setDeckJson(JSON.parse(e.target.value)); } catch{} }} />
            <div className={styles.footer}>
              <button className={styles.secondary} onClick={()=>onExport("docx")}>Export Docx</button>
              <button className={styles.primary} onClick={()=>onExport("pdf")}>Export PDF</button>
            </div>
          </div>
        </>
      )}

      {err && <div style={{marginTop:12, color:"#ffb4b4"}}>{err}</div>}
    </div>
  );
}


