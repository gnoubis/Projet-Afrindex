"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/api";
import { Database, Globe2, LayoutGrid } from "lucide-react";

const STAT_CONFIG = [
  { key: "total_datasets", label: "datasets indexés", icon: Database, color: "text-terra-500" },
  { key: "total_sources",  label: "sources de données", icon: LayoutGrid, color: "text-savane-500" },
  { key: "total_countries", label: "pays couverts", icon: Globe2, color: "text-gold-500" },
] as const;

export default function StatsBar() {
  const { data } = useQuery({ queryKey: ["stats"], queryFn: fetchStats });

  return (
    <div className="border-y border-earth-200 bg-white/60 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-6 py-6 grid grid-cols-3 divide-x divide-earth-200">
        {STAT_CONFIG.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="flex flex-col items-center gap-1 px-4">
            <Icon className={`w-4 h-4 ${color} mb-1`} />
            <span className={`text-2xl font-display font-bold ${color}`} style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
              {data?.[key]?.toLocaleString("fr-FR") ?? "—"}
            </span>
            <span className="text-xs text-earth-800/50 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
