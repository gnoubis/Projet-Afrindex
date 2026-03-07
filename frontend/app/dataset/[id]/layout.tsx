import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Détail dataset",
};

export default function DatasetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
