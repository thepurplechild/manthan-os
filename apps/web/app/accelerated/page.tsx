"use client";

import { useState } from "react";
import { api } from "../../src/lib/api";

export default function Accelerated() {
  const [language, setLanguage] = useState("en");
  const [extracted, setExtracted] = useState("");
  const [busy, setBusy] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("language", language);
    const r = await api.post("/ingest/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setExtracted(r.data.extracted);
    setBusy(false);
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Accelerated Path</h2>
      <div className="flex gap-2">
        <select value={language} onChange={e=>setLanguage(e.target.value)} className="bg-white/5 rounded px-3 py-2">
          <option value="en">English</option><option value="hi">Hindi</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="bn">Bengali</option><option value="mr">Marathi</option>
        </select>
        <input type="file" accept=".txt,.md,.docx,.pdf" onChange={onUpload} />
      </div>
      {busy ? <p>Processing…</p> : <textarea rows={16} value={extracted} onChange={e=>setExtracted(e.target.value)} className="bg-white/5 rounded p-3 w-full" />}
    </main>
  )
}
