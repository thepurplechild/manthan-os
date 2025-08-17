// apps/web/src/lib/firebase.ts
"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

// Read env once
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// Only initialize in the browser, and only if keys exist
function ensureApp() {
  if (typeof window === "undefined") return null;
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return app;
}

export function getAuthIfReady() {
  const app = ensureApp();
  if (!app) return null;
  return getAuth(app);
}

export async function signInWithGoogle() {
  const auth = getAuthIfReady();
  if (!auth) throw new Error("Firebase not configured yet.");
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function sendEmailLink(email: string) {
  const auth = getAuthIfReady();
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
  const auth = getAuthIfReady();
  if (!auth) return;
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn") || window.prompt("Confirm your email") || "";
    if (!email) return;
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("emailForSignIn");
  }
}

