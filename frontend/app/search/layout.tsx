import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recherche de datasets",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
