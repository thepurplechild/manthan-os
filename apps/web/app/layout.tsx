import "../src/styles/globals.css";
import ClientInit from "../src/components/ClientInit";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100">
        <ClientInit />
        {children}
      </body>
    </html>
  );
}
