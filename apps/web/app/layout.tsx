import "../src/styles/globals.css";
import ClientInit from "../src/components/ClientInit";
import AuthProvider, { useAuth } from "../src/components/AuthProvider";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "../src/lib/firebase";

function Header() {
  const { user, ready } = useAuth();
  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Manthan" width={28} height={28} />
          <span className="font-semibold">Manthan</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/studio" className="hover:underline">Studio</Link>
          <Link href="/guided" className="hover:underline">Guided</Link>
          <Link href="/accelerated" className="hover:underline">Accelerated</Link>
          {ready && (user
            ? <button onClick={() => signOut()} className="bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20">Sign out</button>
            : <Link href="/" className="bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100">
        <ClientInit />
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
