// apps/web/src/lib/firebase.ts
"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as fbSignOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/** Values come from frontend route /api/runtime-env at RUNTIME (no rebuilds) */
type RuntimeEnv = {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
};

let envPromise: Promise<RuntimeEnv | null> | null = null;

/** Fetch public-safe env at runtime */
async function loadRuntimeEnv(): Promise<RuntimeEnv | null> {
  if (envPromise) return envPromise;
  envPromise = (async () => {
    try {
      if (typeof window === "undefined") return null; // don't fetch during SSR
      const res = await fetch("/api/runtime-env", { cache: "no-store" });
      if (!res.ok) return null;
      const d = (await res.json()) as RuntimeEnv;
      if (!d.FIREBASE_API_KEY || !d.FIREBASE_AUTH_DOMAIN || !d.FIREBASE_PROJECT_ID || !d.FIREBASE_APP_ID) {
        return null;
      }
      return d;
    } catch {
      return null;
    }
  })();
  return envPromise;
}

/** Initialize Firebase ONLY in the browser and ONLY once we have keys */
function ensureApp(env: RuntimeEnv | null): FirebaseApp | null {
  if (typeof window === "undefined" || !env) return null;
  const config = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    appId: env.FIREBASE_APP_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  };
  const apps = getApps();
  return apps.length ? apps[0] : initializeApp(config);
}

/* ---------- Public helpers ---------- */

export async function getAuthIfReady(): Promise<Auth | null> {
  const env = await loadRuntimeEnv();
  const app = ensureApp(env);
  return app ? getAuth(app) : null;
}

/** Strict: throws if Firebase isn’t configured OR no app could be made */
export async function getAuthStrict(): Promise<Auth> {
  const env = await loadRuntimeEnv();
  const app = ensureApp(env);
  if (!app) throw new Error("Firebase is not configured.");
  return getAuth(app);
}

export async function getFirestoreIfReady(): Promise<Firestore | null> {
  const env = await loadRuntimeEnv();
  const app = ensureApp(env);
  return app ? getFirestore(app) : null;
}

/** Strict: throws if Firestore cannot be created */
export async function getFirestoreStrict(): Promise<Firestore> {
  const env = await loadRuntimeEnv();
  const app = ensureApp(env);
  if (!app) throw new Error("Firebase is not configured.");
  return getFirestore(app);
}

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

/** Require a UID, or throw a clear error (used by pages) */
export async function requireUid(): Promise<string> {
  const auth = await getAuthIfReady();
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Please sign in to continue.");
  return uid;
}


