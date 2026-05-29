import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import Navbar from "@/components/Navbar";

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
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-earth-50 text-ash-800">
        <QueryProvider>
          <div className="kente-bar" />
          <Navbar />
          <main>{children}</main>
          <footer className="border-t border-earth-200 mt-16 py-10 text-center bg-white">
            <p
              className="font-display text-terra-500 tracking-[0.15em] mb-1"
              style={{ fontSize: "20px" }}
            >
              AFRINDEX
            </p>
            <p
              className="font-dm font-semibold uppercase text-earth-800/40"
              style={{ fontSize: "9px", letterSpacing: "0.28em" }}
            >
              © 2026 · Moteur de recherche de datasets africains
            </p>
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
