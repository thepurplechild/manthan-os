"use client";
export const dynamic = "force-dynamic";
export default function Outreach() {
  return <main className="p-6">Outreach – coming soon</main>;
}

import { useState } from "react";
import { collection, addDoc, getDocs, getFirestore } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
const app = getApps().length ? getApps()[0] : initializeApp(config);
const db = getFirestore(app);

export default function Outreach() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  async function addLead() {
    await addDoc(collection(db, "outreach_leads"), { name, email, notes, createdAt: Date.now() });
    setName(""); setEmail(""); setNotes("");
    load();
  }
  async function load() {
    const snap = await getDocs(collection(db, "outreach_leads"));
    setRows(snap.docs.map(d=>({ id:d.id, ...d.data()})));
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Outreach Pipeline (Minimal)</h2>
      <div className="grid gap-2">
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="bg-white/5 rounded px-3 py-2"/>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="bg-white/5 rounded px-3 py-2"/>
        <textarea placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} className="bg-white/5 rounded px-3 py-2"/>
        <div className="flex gap-2">
          <button onClick={addLead} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Add</button>
          <button onClick={load} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Refresh</button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="bg-white/5 rounded-xl px-4 py-3">
            <div className="font-semibold">{r.name} <span className="text-xs text-gray-400">{r.email}</span></div>
            <div className="text-sm text-gray-300">{r.notes}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
