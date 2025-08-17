"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signInWithGoogle, sendEmailLink, completeEmailLink, signOut, getAuthIfReady } from "../src/lib/firebase";

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
    try { await signInWithGoogle(); const auth = await getAuthIfReady(); setUserEmail(auth?.currentUser?.email ?? null); }
    catch (e: any) { alert(e?.message || "Sign-in error"); }
  }
  async function handleEmail() {
    const email = prompt("Enter email for magic link"); if (!email) return;
    try { await sendEmailLink(email); alert("Magic link sent! Check your inbox."); }
    catch (e: any) { alert(e?.message || "Email sign-in error"); }
  }
  async function handleSignOut() {
    await signOut(); setUserEmail(null);
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-bold">Manthan Creator Suite</h1>
        <p className="text-gray-300">Idea → Outline → Script → Pitch in minutes.</p>

        {userEmail ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-400">Signed in as {userEmail}</div>
            <div className="flex gap-3 justify-center">
              <Link href="/studio" className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Open Studio</Link>
              <button onClick={handleSignOut} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Sign out</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            <button onClick={handleGoogle} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Sign in with Google</button>
            <button onClick={handleEmail} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Email magic link</button>
          </div>
        )}

        <div className="flex gap-4 justify-center pt-6 text-sm">
          <Link href="/guided" className="underline hover:opacity-80">Guided Path</Link>
          <Link href="/accelerated" className="underline hover:opacity-80">Accelerated Path</Link>
          <Link href="/outreach" className="underline hover:opacity-80">Outreach</Link>
        </div>
      </div>
    </main>
  );
}
