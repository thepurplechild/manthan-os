import "./src/styles/globals.css";
import { initPH } from "../src/lib/posthog";
import { useEffect } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => { initPH(); }, []);
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100">{children}</body>
    </html>
  )
}
