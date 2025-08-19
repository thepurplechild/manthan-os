"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./TopNav.module.css";
import { getAuthStrict } from "../../lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { signInWithGoogle, signOut } from "../../lib/firebase";
import BrandLockup from "../Brand/BrandLockup";


export default function TopNav(){
  const [user,setUser]=useState<User|null>(null);

  useEffect(()=>{
    (async ()=>{
      try{
        const auth=await getAuthStrict();
        return onAuthStateChanged(auth,(u)=>setUser(u));
      }catch{
        // Firebase not configured yet; nav still renders
        setUser(null);
      }
    })();
  },[]);

  return (
    <header className={styles.wrapper}>
      <div className={styles.nav}>
        - <Link href="/" className={styles.brand}>
-   <img src="/brand-mark.svg" alt="ManthanOS" className={styles.logo}/>
-   <span className={styles.wordmark}>ManthanOS</span>
- </Link>
+ <Link href="/" className={styles.brand}>
+   <div style={{display:"flex", alignItems:"center", gap:10}}>
+     <BrandLockup size="nav" />
+   </div>
+ </Link>

        <nav className={styles.links}>
          <Link href="/guided" className={styles.link}>Guided</Link>
          <Link href="/accelerated" className={styles.link}>Accelerated</Link>
          <Link href="/projects" className={styles.link}>Projects</Link>
        </nav>

        <div className={styles.actions}>
          {!user ? (
            <button className="btn btnPrimary" onClick={()=>signInWithGoogle()}>Sign in</button>
          ) : (
            <div className={styles.userBox}>
              {user.photoURL ? (
                <img className={styles.avatar} src={user.photoURL} alt={user.displayName||"user"} />
              ) : (
                <div className={styles.avatarFallback}>{(user.displayName||"U").slice(0,1)}</div>
              )}
              <span className={styles.userName}>{user.displayName||user.email}</span>
              <button className="btn" onClick={()=>signOut()}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

