import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import Navbar from "@/components/Navbar";
import { Copy, Copyright } from "lucide-react";

export const metadata: Metadata = {
  title: {
    default: "Afrindex — Moteur de recherche de datasets africains",
    template: "%s | Afrindex",
  },
  description:
    "Trouvez des données fiables sur l'Afrique : Banque Mondiale, INS, HDX et bien d'autres sources centralisées en un seul endroit.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
        <body className="min-h-screen" style={{ background: "#F0EBE3" }}>
        <QueryProvider>
          <div className="kente-bar" />
          <Navbar />
          <main>{children}</main>
          <footer className="border-t border-earth-200 mt-20 py-8 text-center text-sm text-earth-800/50">
            <span className="font-medium text-terra-500">Afrindex</span>  <Copyright className="inline-block mx-1" size={16} /> 2026. Tous droits réservés.
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
