"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink
} from "firebase/auth";

let cachedCfg: any | null = null;

async function loadRuntimeConfig() {
  if (cachedCfg) return cachedCfg;
  const res = await fetch("/api/runtime-env", { cache: "no-store" });
  const d = await res.json();
  cachedCfg = {
    apiKey: d.FIREBASE_API_KEY,
    authDomain: d.FIREBASE_AUTH_DOMAIN,
    projectId: d.FIREBASE_PROJECT_ID,
    appId: d.FIREBASE_APP_ID,
    storageBucket: d.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: d.FIREBASE_MESSAGING_SENDER_ID,
  };
  return cachedCfg;
}

function ensureAppSync(cfg: any) {
  if (typeof window === "undefined") return null;
  if (!cfg?.apiKey || !cfg?.authDomain || !cfg?.projectId || !cfg?.appId) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return app;
}

export async function getAuthIfReady() {
  const cfg = await loadRuntimeConfig();
  const app = ensureAppSync(cfg);
  return app ? getAuth(app) : null;
}

export async function signInWithGoogle() {
  const auth = await getAuthIfReady();
  if (!auth) throw new Error("Firebase not configured yet.");
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function sendEmailLink(email: string) {
  const auth = await getAuthIfReady();
  if (!auth) throw new Error("Firebase not configured yet.");
  const actionCodeSettings = {
    url: typeof window !== "undefined" ? window.location.origin : "",
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem("emailForSignIn", email);
}

export async function completeEmailLink() {
  if (typeof window === "undefined") return;
  const auth = await getAuthIfReady();
  if (!auth) return;
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn") || window.prompt("Confirm your email") || "";
    if (!email) return;
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("emailForSignIn");
  }
}

