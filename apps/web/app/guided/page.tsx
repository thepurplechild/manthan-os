"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../../components/Wizard/Wizard.module.css";
import OptionCard from "../../components/Wizard/OptionCard";
import { GenAPI, IdeaOption, OutlineOption, ScriptOption, ProjectsAPI } from "../../lib/api";
import { requireUid } from "../../src/lib/firebase";

type Step = 0 | 1 | 2 | 3 | 4; // Ideas, Outline, Script, Deck, Export

export default function GuidedPage() {
  const router = useRouter();
  const qs = useSearchParams();

  const [step, setStep] = useState<Step>(0);
  const [genre, setGenre] = useState("thriller");
  const [language, setLanguage] = useState("Hindi");
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

  const stepNames = ["Ideas", "Outline", "Script", "Deck", "Export"];

  useEffect(() => {
    const pid = qs.get("pid");
    if (pid) {
      (async () => {
        try {
          const uid = await requireUid();
          const data = await ProjectsAPI.get(uid, pid);
          setProjectId(pid);
          const steps = data.steps || {};
          if (steps.ideas) { setIdeas(steps.ideas.options||[]); setChosenIdeaIdx(steps.ideas.chosen ?? null); }
          if (steps.outline) { setOutlines(steps.outline.options||[]); setChosenOutlineIdx(steps.outline.chosen ?? null); }
          if (steps.script) { setScripts(steps.script.options||[]); setChosenScriptIdx(steps.script.chosen ?? null); }
          if (steps.deck) { setDeckJson(steps.deck.deckJson||null); }
        } catch {}
      })();
    }
  }, [qs]);

  function toastErr(e:any){ console.error(e); setError(e?.message||"Something went wrong"); setTimeout(()=>setError(null),2800); }

  async function ensureProject(){ const uid=await requireUid();
    if (projectId) return { uid, pid: projectId };
    const created = await ProjectsAPI.create(uid, "Guided Project");
    setProjectId(created.project_id); router.replace(`/guided?pid=${created.project_id}`);
    return { uid, pid: created.project_id };
  }

  async function onGenIdeas(){
    if (!seed.trim()) return toastErr(new Error("Please enter a premise/seed."));
    setBusy(true);
    try{
      const { options } = await GenAPI.ideas({ genre, tone, seed, language });
      setIdeas(options.map(o=>({...o}))); setChosenIdeaIdx(null); setStep(0);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "ideas", { options, chosen: null, meta:{genre, tone, language, seed}});
    }catch(e){ toastErr(e);} finally{ setBusy(false); }
  }
  async function onGenOutlines(){
    const idea = chosenIdeaIdx!=null ? ideas[chosenIdeaIdx] : null;
    if (!idea) return toastErr(new Error("Choose an idea first."));
    setBusy(true);
    try{
      const { options } = await GenAPI.outlines({
        logline: idea.logline + "\n\n" + idea.premise,
        structure: "film", style: "Bollywood high-concept thriller", language
      });
      setOutlines(options.map(o=>({...o}))); setChosenOutlineIdx(null); setStep(1);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "outline", { options, chosen:null, input: idea });
    }catch(e){ toastErr(e);} finally{ setBusy(false); }
  }
  async function onGenScripts(){
    const outline = chosenOutlineIdx!=null ? outlines[chosenOutlineIdx] : null;
    if (!outline) return toastErr(new Error("Choose an outline first."));
    setBusy(true);
    try{
      const { options } = await GenAPI.scripts({ outline: outline.outline, style:"cinematic, grounded, commercial", language });
      setScripts(options.map(o=>({...o}))); setChosenScriptIdx(null); setStep(2);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "script", { options, chosen:null, input: outline });
    }catch(e){ toastErr(e);} finally{ setBusy(false); }
  }
  async function onBuildDeck(){
    const idea = chosenIdeaIdx!=null ? ideas[chosenIdeaIdx] : null;
    const outline = chosenOutlineIdx!=null ? outlines[chosenOutlineIdx] : null;
    const script = chosenScriptIdx!=null ? scripts[chosenScriptIdx] : null;
    if (!idea || !outline || !script) return toastErr(new Error("Choose items in all previous steps."));
    setBusy(true);
    try{
      const { options } = await GenAPI.deckBuild({
        title:(idea.logline||"Untitled").slice(0,60), logline: idea.logline, synopsis: idea.premise,
        characters: "Key characters:\n"+outline.outline.slice(0,800),
        world: "World & tone:\n"+tone, comps:"Comparable titles for Indian market", toneboard:"Moody, premium, cinematic", language
      });
      const built = options[0]?.deck || null; setDeckJson(built); setStep(3);
      const { uid, pid } = await ensureProject();
      await ProjectsAPI.saveStep(uid, pid, "deck", { deckJson: built });
    }catch(e){ toastErr(e);} finally{ setBusy(false); }
  }

  async function onExport(fmt:"pdf"|"docx"){
    if (!deckJson) return toastErr(new Error("Build the deck first."));
    setBusy(true);
    try{ const { url } = await GenAPI.export({ deck_json: deckJson, format: fmt }); window.open(url,"_blank"); setStep(4); }
    catch(e){ toastErr(e);} finally{ setBusy(false); }
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.title}>Guided Path</div>
        <div className={styles.subtitle}>From premise → deck in 4 steps</div>
      </div>

      <div className={styles.stepper}>
        {["Ideas","Outline","Script","Deck","Export"].map((s,i)=>(
          <div key={s} className={`${styles.step} ${i===step?styles.stepActive:""}`}>{s}</div>
        ))}
      </div>

      {/* Step 0: seed → ideas */}
      {step===0 && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <select value={genre} onChange={e=>setGenre(e.target.value)} className={styles.secondary}>
              <option>thriller</option><option>drama</option><option>romance</option><option>comedy</option>
            </select>
            <select value={language} onChange={e=>setLanguage(e.target.value)} className={styles.secondary}>
              <option>Hindi</option><option>English</option><option>Tamil</option><option>Telugu</option>
            </select>
            <input className={styles.secondary} placeholder="Tone (e.g., gritty)" value={tone} onChange={e=>setTone(e.target.value)} />
          </div>
          <textarea className={styles.textarea} placeholder="Premise / seed" value={seed} onChange={e=>setSeed(e.target.value)}/>
          <div className={styles.footer}>
            <button className={styles.primary} onClick={onGenIdeas} disabled={busy}>Generate Ideas</button>
          </div>
        </div>
      )}

      {/* Ideas */}
      {ideas.length>0 && (
        <>
          <h3 style={{margin:"14px 0 8px"}}>Ideas (choose one)</h3>
          <div className={styles.row}>
            {ideas.map((it,idx)=>(
              <OptionCard key={idx} title={`Idea ${idx+1}`}
                value={`Logline: ${it.logline}\n\nPremise: ${it.premise}`}
                onChange={(v)=>{ const [l,...rest]=v.split("\n\nPremise:"); const logline=l.replace(/^Logline:\s*/i,"").trim();
                  const premise=(rest.join("Premise:")||"").trim(); const a=[...ideas]; a[idx]={logline,premise}; setIdeas(a); }}
                onChoose={()=>setChosenIdeaIdx(idx)} chosen={chosenIdeaIdx===idx}/>
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.secondary} onClick={()=>setIdeas([])}>Reset ideas</button>
            <button className={styles.primary} onClick={onGenOutlines} disabled={busy||chosenIdeaIdx==null}>Generate Outlines</button>
          </div>
        </>
      )}

      {/* Outlines */}
      {outlines.length>0 && (
        <>
          <h3 style={{margin:"14px 0 8px"}}>Outlines (choose one)</h3>
          <div className={styles.row}>
            {outlines.map((it,idx)=>(
              <OptionCard key={idx} title={`Outline ${idx+1}`}
                value={it.outline} onChange={(v)=>{ const a=[...outlines]; a[idx]={outline:v}; setOutlines(a); }}
                onChoose={()=>setChosenOutlineIdx(idx)} chosen={chosenOutlineIdx===idx}/>
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.secondary} onClick={()=>setOutlines([])}>Reset outlines</button>
            <button className={styles.primary} onClick={onGenScripts} disabled={busy||chosenOutlineIdx==null}>Generate Script Pages</button>
          </div>
        </>
      )}

      {/* Scripts */}
      {scripts.length>0 && (
        <>
          <h3 style={{margin:"14px 0 8px"}}>Script (choose one)</h3>
          <div className={styles.row}>
            {scripts.map((it,idx)=>(
              <OptionCard key={idx} title={`Script ${idx+1}`} value={it.script}
                onChange={(v)=>{ const a=[...scripts]; a[idx]={script:v}; setScripts(a); }}
                onChoose={()=>setChosenScriptIdx(idx)} chosen={chosenScriptIdx===idx}/>
            ))}
          </div>
          <div className={styles.footer}>
            <button className={styles.secondary} onClick={()=>setScripts([])}>Reset scripts</button>
            <button className={styles.primary} onClick={onBuildDeck} disabled={busy||chosenScriptIdx==null}>Build Deck JSON</button>
          </div>
        </>
      )}

      {/* Deck */}
      {deckJson && (
        <>
          <h3 style={{margin:"14px 0 8px"}}>Deck JSON</h3>
          <div className={styles.panel}>
            <textarea className={styles.textarea} style={{minHeight:220}}
              value={JSON.stringify(deckJson,null,2)} onChange={(e)=>{ try{ setDeckJson(JSON.parse(e.target.value)); } catch{} }}/>
            <div className={styles.footer}>
              <button className={styles.secondary} onClick={()=>onExport("docx")} disabled={busy}>Export Docx</button>
              <button className={styles.primary} onClick={()=>onExport("pdf")} disabled={busy}>Export PDF</button>
            </div>
          </div>
        </>
      )}

      {error && <div style={{marginTop:12, color:"#ffb4b4"}}>{error}</div>}
    </div>
  );
}

