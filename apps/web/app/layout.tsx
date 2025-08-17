// apps/web/app/layout.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import "../src/styles/globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        {children}
      </body>
    </html>
  );
}
