"use client";

import { useEffect } from "react";
import Link from "next/link";
import { completeEmailLink, sendEmailLink, signInWithGoogle } from "../src/lib/firebase";

export const dynamic = "force-dynamic"; // Avoid prerender running auth code

export default function Home() {
  useEffect(() => { completeEmailLink(); }, []);

  async function handleGoogle() {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      alert(e?.message || "Sign-in not ready. Set Firebase envs in Cloud Run.");
    }
  }

  async function handleEmail() {
    const email = prompt("Enter email for OTP link");
    if (!email) return;
    try {
      await sendEmailLink(email);
      alert("Magic link sent!");
    } catch (e: any) {
      alert(e?.message || "Email sign-in not ready. Set Firebase envs in Cloud Run.");
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-bold">Manthan Creator Suite</h1>
        <p className="text-gray-300">Guided & Accelerated paths to go from idea to a production-ready pitch.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleGoogle} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Sign in with Google</button>
          <button onClick={handleEmail} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Email OTP</button>
        </div>
        <div className="flex gap-4 justify-center pt-6">
          <Link className="underline" href="/guided">Guided Path</Link>
          <Link className="underline" href="/accelerated">Accelerated Path</Link>
          <Link className="underline" href="/outreach">Outreach Pipeline</Link>
        </div>
      </div>
    </main>
  );
}

