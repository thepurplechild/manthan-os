import type { Metadata } from "next";
import "./globals.css";
import TopNav from "../components/Nav/TopNav";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Manthan Studio",
  description: "Creator Suite for premium, cinematic stories",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
