// apps/web/src/lib/firebase.ts
"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  signOut as fbSignOut, type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * We try env-based config first (NEXT_PUBLIC_* baked at build time).
 * If missing, we fetch at runtime from /api/runtime-env (which can proxy to the backend /runtime-env).
 */

type RuntimeEnv = {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
};

let cachedEnv: Promise<RuntimeEnv | null> | null = null;

function envConfigOrNull() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  return Object.values(cfg).every(Boolean) ? (cfg as Required<typeof cfg>) : null;
}

async function fetchRuntimeEnv(): Promise<RuntimeEnv | null> {
  if (cachedEnv) return cachedEnv;
  cachedEnv = (async () => {
    try {
      if (typeof window === "undefined") return null;
      // 1) Try local frontend API route (recommended).
      let res = await fetch("/api/runtime-env", { cache: "no-store" });
      if (!res.ok) {
        // 2) Fallback: call backend directly if the route isn't present.
        const base = process.env.NEXT_PUBLIC_API_BASE;
        if (!base) return null;
        res = await fetch(`${base}/runtime-env`, { cache: "no-store" });
        if (!res.ok) return null;
      }
      const d = (await res.json()) as RuntimeEnv;
      if (!d.FIREBASE_API_KEY || !d.FIREBASE_AUTH_DOMAIN || !d.FIREBASE_PROJECT_ID || !d.FIREBASE_APP_ID) {
        return null;
      }
      return d;
    } catch {
      return null;
    }
  })();
  return cachedEnv;
}

function ensureAppFromEnv(cfg: {
  apiKey: string; authDomain: string; projectId: string; appId: string; storageBucket?: string; messagingSenderId?: string;
}): FirebaseApp {
  const apps = getApps();
  return apps.length ? apps[0] : initializeApp(cfg);
}

/** ---------- Public helpers ---------- */

/** Initialize Firebase using NEXT_PUBLIC_* if present, else runtime fetch. Throws if neither is available. */
export async function getFirebaseApp(): Promise<FirebaseApp> {
  // 1) Build-time envs
  const baked = envConfigOrNull();
  if (baked) return ensureAppFromEnv(baked);

  // 2) Runtime fetch (backend-provided safe envs)
  const env = await fetchRuntimeEnv();
  if (!env) throw new Error("Firebase not configured yet.");
  return ensureAppFromEnv({
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    appId: env.FIREBASE_APP_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  });
}

/** Strict getters (throw if not configured) */
export async function getAuthStrict(): Promise<Auth> {
  const app = await getFirebaseApp();
  return getAuth(app);
}
export async function getFirestoreStrict(): Promise<Firestore> {
  const app = await getFirebaseApp();
  return getFirestore(app);
}

/** Back-compat light getters (return null instead of throw) */
export async function getAuthIfReady(): Promise<Auth | null> {
  try { return await getAuthStrict(); } catch { return null; }
}
export async function getFirestoreIfReady(): Promise<Firestore | null> {
  try { return await getFirestoreStrict(); } catch { return null; }
}

/** Require a signed-in user and return their UID (used by Projects pages) */
export async function requireUid(): Promise<string> {
  const auth = await getAuthStrict();
  const u = auth.currentUser;
  if (!u) throw new Error("Please sign in to continue.");
  return u.uid;
}

/** Auth actions */
export async function signInWithGoogle(): Promise<void> {
  const auth = await getAuthStrict();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function sendEmailLink(email: string): Promise<void> {
  const auth = await getAuthStrict();
  const actionCodeSettings = {
    url: typeof window !== "undefined" ? window.location.origin : "",
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  if (typeof window !== "undefined") window.localStorage.setItem("emailForSignIn", email);
}

export async function completeEmailLink(): Promise<void> {
  if (typeof window === "undefined") return;
  const auth = await getAuthIfReady();
  if (!auth) return;
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn");
    if (!email) email = window.prompt("Confirm your email") || "";
    if (!email) return;
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("emailForSignIn");
  }
}

export async function signOut(): Promise<void> {
  const auth = await getAuthIfReady();
  if (!auth) return;
  await fbSignOut(auth);
}



