"use client";
import { useEffect, useState } from "react";
import styles from "../../components/Wizard/Wizard.module.css";
import { ProjectsAPI } from "../../lib/api";
import { requireUid } from "../../lib/firebase";
import Link from "next/link";

export default function ProjectsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const uid = await requireUid();
        const { projects } = await ProjectsAPI.list(uid);
        setItems(projects);
      } catch (e:any) { setErr(e.message || "Error"); }
    })();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.hero}><div className={styles.title}>Your Projects</div></div>
      <div className={styles.panel}>
        {items.length === 0 && <div style={{color:"#a8a8b3"}}>No projects yet.</div>}
        {items.map(p => (
          <div key={p.id} style={{display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            <div>
              <div style={{fontWeight:600}}>{p.title || "Untitled Project"}</div>
              <div style={{fontSize:12, color:"#a8a8b3"}}>id: {p.id}</div>
            </div>
            <div style={{display:"flex", gap:10}}>
              <Link className={styles.secondary} href={`/guided?pid=${p.id}`}>Open Guided</Link>
            </div>
          </div>
        ))}
      </div>
      {err && <div style={{marginTop:12, color:"#ffb4b4"}}>{err}</div>}
    </div>
  );
}
