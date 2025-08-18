// apps/web/app/page.tsx
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
    try {
      await signInWithGoogle();
      const auth = await getAuthIfReady();
      setUserEmail(auth?.currentUser?.email ?? null);
    } catch (e: any) {
      alert(e?.message || "Sign-in error");
    }
  }

  async function handleEmail() {
    const email = prompt("Enter email for magic link");
    if (!email) return;
    try {
      await sendEmailLink(email);
      alert("Magic link sent! Check your inbox.");
    } catch (e: any) {
      alert(e?.message || "Email sign-in error");
    }
  }

  async function handleSignOut() {
    await signOut();
    setUserEmail(null);
  }

  return (
    <main style={styles.wrap}>
      {/* HERO */}
      <section style={styles.hero}>
        <BrandLockup size="hero" />
        <p style={styles.tagline}>
          Idea → Outline → Script → Pitch <span style={{ opacity: 0.9 }}>in minutes.</span>
        </p>

        {!userEmail ? (
          <div style={styles.authRow}>
            <button className="btn btnPrimary" onClick={handleGoogle}>Sign in with Google</button>
            <button className="btn" onClick={handleEmail}>Email magic link</button>
          </div>
        ) : (
          <div style={{ ...styles.authRow, gap: 10 }}>
            <span style={styles.signedIn}>Signed in as {userEmail}</span>
            <button className="btn" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
      </section>

      {/* PATHS */}
      <section style={styles.paths}>
        <PathCard
          title="Guided Path"
          blurb="Three curated options at every step. Edit freely; your choices flow forward."
          href="/guided"
          cta="Start Guided"
          points={["Generate 3 ideas", "Pick an outline", "Draft script pages", "Build + export deck"]}
        />
        <PathCard
          title="Accelerated Path"
          blurb="Start from your script or treatment. We extract, structure, and fast-track your deck."
          href="/accelerated"
          cta="Start Accelerated"
          points={["Upload PDF/DOCX/TXT", "Auto-extract key beats", "Refine script pages", "Export deck"]}
        />
        <PathCard
          title="Projects"
          blurb="Resume where you left off. Your work is saved as you go."
          href="/projects"
          cta="Open Projects"
          points={["Autosave to Firestore", "List & reopen", "Continue any step", "Export anytime"]}
        />
      </section>
    </main>
  );
}

/* ---------- Components ---------- */

function PathCard(props: { title: string; blurb: string; href: string; cta: string; points: string[] }) {
  const { title, blurb, href, cta, points } = props;
  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <h3 style={styles.cardTitle}>{title}</h3>
      </div>
      <p style={styles.cardBlurb}>{blurb}</p>
      <ul style={styles.cardList}>
        {points.map((p, i) => (
          <li key={i} style={styles.cardPoint}>• {p}</li>
        ))}
      </ul>
      <div style={styles.cardCtas}>
        <Link href={href} className="btn btnPrimary">{cta}</Link>
      </div>
    </div>
  );
}

/* ---------- Styles (inline to avoid extra CSS files) ---------- */

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "32px 20px 80px",
  },
  hero: {
    textAlign: "left",
    paddingTop: 10,
    paddingBottom: 10,
  },
  tagline: {
    marginTop: 12,
    opacity: 0.8,
    maxWidth: 720,
    lineHeight: 1.6,
    fontSize: 18,
  },
  authRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 18,
    flexWrap: "wrap",
  },
  signedIn: {
    fontSize: 12,
    opacity: 0.8,
    marginRight: 8,
  },
  paths: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14,
    marginTop: 28,
  },
  card: {
    background: "linear-gradient(180deg, rgba(154,124,255,0.06), rgba(18,18,26,1))",
    border: "1px solid rgba(154,124,255,0.25)",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    minHeight: 260,
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: 0,
    letterSpacing: 0.2,
  },
  cardBlurb: {
    opacity: 0.9,
    marginTop: 4,
    lineHeight: 1.55,
  },
  cardList: {
    margin: "10px 0 0",
    padding: 0,
    listStyle: "none",
    opacity: 0.9,
    lineHeight: 1.55,
    flexGrow: 1,
  },
  cardPoint: {
    margin: "2px 0",
  },
  cardCtas: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 12,
  },
};

