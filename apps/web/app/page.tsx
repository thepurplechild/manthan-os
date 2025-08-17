"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import Link from "next/link";
import { completeEmailLink, sendEmailLink, signInWithGoogle } from "../src/lib/firebase";
import { useAuth } from "../src/components/AuthProvider";

export const dynamic = "force-dynamic";

export default function Home() {
  const { user } = useAuth();
  useEffect(() => { completeEmailLink(); }, []);

  async function handleGoogle() {
    try { await signInWithGoogle(); } catch (e: any) { alert(e?.message || "Sign-in error"); }
  }
  async function handleEmail() {
    const email = prompt("Enter email for OTP link"); if (!email) return;
    try { await sendEmailLink(email); alert("Magic link sent!"); } catch (e: any) { alert(e?.message || "Email sign-in error"); }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-bold">Manthan Creator Suite</h1>
        <p className="text-gray-300">From idea to pitch & pages, in minutes.</p>
        {user ? (
          <div className="flex gap-3 justify-center">
            <Link href="/studio" className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Open Studio</Link>
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            <button onClick={handleGoogle} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Sign in with Google</button>
            <button onClick={handleEmail} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Email OTP</button>
          </div>
        )}
      </div>
    </main>
  );
}
