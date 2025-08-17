"use client";

import { useEffect } from "react";
import { signInWithGoogle, sendEmailLink, completeEmailLink } from "../src/lib/firebase";
import Link from "next/link";

export default function Home() {
  useEffect(() => { completeEmailLink(); }, []);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-bold">Manthan Creator Suite</h1>
        <p className="text-gray-300">Guided & Accelerated paths to go from idea to a production-ready pitch.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={signInWithGoogle} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Sign in with Google</button>
          <button onClick={() => {
            const email = prompt("Enter email for OTP link");
            if (email) sendEmailLink(email);
          }} className="rounded-2xl px-5 py-3 bg-white/10 hover:bg-white/20">Email OTP</button>
        </div>
        <div className="flex gap-4 justify-center pt-6">
          <Link className="underline" href="/guided">Guided Path</Link>
          <Link className="underline" href="/accelerated">Accelerated Path</Link>
          <Link className="underline" href="/outreach">Outreach Pipeline</Link>
        </div>
      </div>
    </main>
  )
}
