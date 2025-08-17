import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailLink, sendSignInLinkToEmail, isSignInWithEmailLink } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(config);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function sendEmailLink(email: string) {
  const actionCodeSettings = {
    url: typeof window !== "undefined" ? window.location.origin : "",
    handleCodeInApp: true
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem("emailForSignIn", email);
}

export async function completeEmailLink() {
  if (typeof window === "undefined") return;
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn") || window.prompt("Confirm your email");
    if (!email) return;
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem("emailForSignIn");
  }
}
