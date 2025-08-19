"use client";
import styles from "./BrandLockup.module.css";
import { Sora } from "next/font/google";

// Use only supported weights (or "variable")
const sora = Sora({
  subsets: ["latin"],
  weight: ["700", "800"], // <-- removed "900"
  variable: "--font-brand",
});

export default function BrandLockup({ size = "nav" }: { size?: "nav" | "hero" }) {
  return (
    <div className={`${styles.lockup} ${sora.variable} ${size === "hero" ? styles.hero : styles.nav}`}>
      <span className={styles.top}>Manthan</span>
      <span className={styles.bottom}>OS</span>
    </div>
  );
}

