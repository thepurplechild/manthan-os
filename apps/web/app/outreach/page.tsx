"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { getFirestoreIfReady } from "../../src/lib/firebase";

type Lead = { id?: string; name: string; email: string; notes: string; createdAt: number };

export default function Outreach() {
  const [db, setDb] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const fdb = await getFirestoreIfReady();
      setDb(fdb);
      if (fdb) load(fdb);
    })();
  }, []);

  async function addLead() {
    if (!db) return alert("Firestore not ready (check Firebase envs).");
    setBusy(true);
    await addDoc(collection(db, "outreach_leads"), { name, email, notes, createdAt: Date.now() });
    setName(""); setEmail(""); setNotes("");
    await load(db);
    setBusy(false);
  }

  async function load(fdb = db) {
    if (!fdb) return;
    const snap = await getDocs(collection(fdb, "outreach_leads"));
    setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Lead, "id">) })));
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Outreach Pipeline (Minimal)</h2>

      <div className="grid gap-2">
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="bg-white/5 rounded px-3 py-2"/>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="bg-white/5 rounded px-3 py-2"/>
        <textarea placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} className="bg-white/5 rounded px-3 py-2"/>
        <div className="flex gap-2">
          <button disabled={busy || !db} onClick={addLead} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50">Add</button>
          <button disabled={!db} onClick={() => load()} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50">Refresh</button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="bg-white/5 rounded-xl px-4 py-3">
            <div className="font-semibold">
              {r.name} <span className="text-xs text-gray-400">{r.email}</span>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">{r.notes}</div>
          </div>
        ))}
        {(!rows.length) && <div className="text-gray-400 text-sm">No leads yet.</div>}
      </div>
    </main>
  );
}

