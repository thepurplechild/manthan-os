"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthIfReady, signInWithGoogle, sendEmailLink, completeEmailLink, signOut } from "../src/lib/firebase";

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await completeEmailLink();
      const auth = await getAuthIfReady();
      setEmail(auth?.currentUser?.email ?? null);
    })();
  }, []);

  async function onGoogle() {
    try { await signInWithGoogle(); const a = await getAuthIfReady(); setEmail(a?.currentUser?.email ?? null); }
    catch (e: any) { alert(e?.message || "Sign-in failed"); }
  }
  async function onMagic() {
    const e = prompt("Your email for a magic link?"); if (!e) return;
    try { await sendEmailLink(e); alert("Magic link sent. Check your inbox."); }
    catch (err: any) { alert(err?.message || "Could not send link"); }
  }
  async function onSignOut() { await signOut(); setEmail(null); }

  return (
    <div>
      <section className="panel" style={{ padding: 28 }}>
        <h1>ManthanOS</h1>
        <h2>Idea → Outline → Script → Pitch in minutes.</h2>

        <div style={{ marginTop: 18 }} className="kicker">
          {email ? <>Signed in as {email}</> : <>Create for free. No credit card.</>}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          {email ? (
            <>
              <Link className="btn primary" href="/studio">Open Studio</Link>
              <button className="btn" onClick={onSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <button className="btn primary" onClick={onGoogle}>Sign in with Google</button>
              <button className="btn" onClick={onMagic}>Email magic link</button>
            </>
          )}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div className="stepper">
          <span className="step active">Guided Path</span>
          <span className="step">Accelerated Path</span>
          <span className="step">Outreach</span>
        </div>
        <div className="row">
          <Link href="/guided" className="panel" style={{ padding: 20, display: "block" }}>
            <h3>Guided Path</h3>
            <p className="kicker">Blank page to deck in 5 steps with 3 editable options at each stage.</p>
          </Link>
          <Link href="/accelerated" className="panel" style={{ padding: 20, display: "block" }}>
            <h3>Accelerated Path</h3>
            <p className="kicker">Upload script → extract → deck → export. Fast lane for pros.</p>
          </Link>
          <Link href="/outreach" className="panel" style={{ padding: 20, display: "block" }}>
            <h3>Outreach</h3>
            <p className="kicker">Matchmaking & mini-CRM (coming next).</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

