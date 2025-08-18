"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLockup from "../components/Brand/BrandLockup";
import {
  signInWithGoogle,
  sendEmailLink,
  completeEmailLink,
  signOut,
  getAuthIfReady,
} from "../src/lib/firebase";

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await completeEmailLink();
      const auth = await getAuthIfReady();
      setUserEmail(auth?.currentUser?.email ?? null);
    })();
  }, []);

  async function handleGoogle() {
    try { await signInWithGoogle();
      const auth = await getAuthIfReady();
      setUserEmail(auth?.currentUser?.email ?? null);
    } catch (e:any) { alert(e?.message || "Sign-in error"); }
  }

  async function handleEmail() {
    const email = prompt("Enter email for magic link"); if (!email) return;
    try { await sendEmailLink(email); alert("Magic link sent! Check your inbox."); }
    catch (e:any) { alert(e?.message || "Email sign-in error"); }
  }

  async function handleSignOut() { await signOut(); setUserEmail(null); }

  return (
    <main style={{maxWidth:1040, margin:"0 auto", padding:"32px 20px 80px"}}>
      <section>
        <BrandLockup size="hero" />
        <p style={{marginTop:12, opacity:.8, maxWidth:720, lineHeight:1.6, fontSize:18}}>
          Idea → Outline → Script → Pitch <span style={{opacity:.9}}>in minutes.</span>
        </p>

        {!userEmail ? (
          <div style={{display:"flex", gap:12, marginTop:18, flexWrap:"wrap"}}>
            <button className="btn btnPrimary" onClick={handleGoogle}>Sign in with Google</button>
            <button className="btn" onClick={handleEmail}>Email magic link</button>
          </div>
        ) : (
          <div style={{display:"flex", gap:10, marginTop:18, alignItems:"center"}}>
            <span style={{fontSize:12, opacity:.8}}>Signed in as {userEmail}</span>
            <button className="btn" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
      </section>

      <section style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginTop:28}}>
        <PathCard
          title="Guided Path"
          blurb="Three options at every step. Edit freely; your choices flow forward."
          href="/guided" cta="Start Guided"
          points={["3 ideas","Pick an outline","Draft script pages","Build + export deck"]}
        />
        <PathCard
          title="Accelerated Path"
          blurb="Upload a script/treatment. We extract and fast-track your deck."
          href="/accelerated" cta="Start Accelerated"
          points={["Upload PDF/DOCX/TXT","Auto-extract beats","Refine pages","Export deck"]}
        />
        <PathCard
          title="Projects"
          blurb="Resume where you left off. Autosaved to Firestore."
          href="/projects" cta="Open Projects"
          points={["Autosave","List & reopen","Continue any step","Export anytime"]}
        />
      </section>
    </main>
  );
}

function PathCard({title, blurb, href, cta, points}:{title:string; blurb:string; href:string; cta:string; points:string[]}) {
  return (
    <div style={{
      background:"linear-gradient(180deg, rgba(154,124,255,.06), rgba(18,18,26,1))",
      border:"1px solid rgba(154,124,255,.25)", borderRadius:14, padding:16, display:"flex", flexDirection:"column", minHeight:260
    }}>
      <h3 style={{fontSize:18, fontWeight:800, margin:"0 0 6px"}}>{title}</h3>
      <p style={{opacity:.9, lineHeight:1.55}}>{blurb}</p>
      <ul style={{margin:"10px 0 0", padding:0, listStyle:"none", lineHeight:1.55, flexGrow:1, opacity:.9}}>
        {points.map((p,i)=><li key={i} style={{margin:"2px 0"}}>• {p}</li>)}
      </ul>
      <div style={{display:"flex", justifyContent:"flex-end", marginTop:12}}>
        <Link href={href} className="btn btnPrimary">{cta}</Link>
      </div>
    </div>
  );
}
