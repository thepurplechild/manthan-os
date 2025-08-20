export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import "./globals.css";
import { Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"], // 900 caused build warnings earlier
  display: "swap",
});

export const metadata: Metadata = {
  title: "ManthanOS",
  description: "Concept → Contract. Create, package, and pitch in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.className}>
      <body>
        <div className="site">
          <header className="topbar">
            <div className="brand">
              <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#9A7CFF" />
                    <stop offset="1" stopColor="#7DD3FC" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#g)" opacity="0.18" />
                <path d="M12 48V16h8l10 11 10-11h8v32h-8V31L40 40h-1L28 31v17h-8Z" fill="url(#g)" />
                <circle cx="48" cy="22" r="3" fill="url(#g)"/>
              </svg>
              <div className="lockup">
                <span className="name">Manthan</span>
                <span className="os">OS</span>
              </div>
            </div>
            <nav className="nav">
              <a href="/" className="navlink">Home</a>
              <a href="/studio" className="navlink">Studio</a>
              <a href="/guided" className="navlink">Guided</a>
              <a href="/accelerated" className="navlink">Accelerated</a>
              <a href="/outreach" className="navlink">Outreach</a>
            </nav>
          </header>
          <main className="content">{children}</main>
          <footer className="foot">
            <span>© {new Date().getFullYear()} ManthanOS</span>
            <span className="dot">•</span>
            <a href="/projects">Projects</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
