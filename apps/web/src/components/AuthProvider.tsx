"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getAuthIfReady } from "../lib/firebase";
import type { User } from "firebase/auth";

type AuthCtx = { user: User | null; ready: boolean };
const Ctx = createContext<AuthCtx>({ user: null, ready: false });

export function useAuth() { return useContext(Ctx); }

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const auth = await getAuthIfReady();
      if (!auth) { setReady(true); return; }
      const unsub = auth.onAuthStateChanged(u => { setUser(u); setReady(true); });
      return () => unsub();
    })();
  }, []);

  return <Ctx.Provider value={{ user, ready }}>{children}</Ctx.Provider>;
}
