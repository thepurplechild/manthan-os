"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Link from "next/link";

export default function Studio() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Studio</h2>
      <p className="text-gray-400">Choose your flow:</p>
      <div className="flex gap-3">
        <Link href="/guided" className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Guided Path</Link>
        <Link href="/accelerated" className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Accelerated Path</Link>
      </div>
    </main>
  );
}
