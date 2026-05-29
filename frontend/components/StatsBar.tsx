"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/api";

const STATS = [
  { key: "total_datasets",  label: "datasets indexés"   },
  { key: "total_sources",   label: "sources de données" },
  { key: "total_countries", label: "pays couverts"      },
] as const;

export default function StatsBar() {
  const { data } = useQuery({ queryKey: ["stats"], queryFn: fetchStats });

  return (
    <div className="border-y border-earth-200 bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8 grid grid-cols-3">
        {STATS.map(({ key, label }, i) => (
          <div
            key={key}
            className="flex flex-col items-center gap-1.5 px-4"
            style={{ borderLeft: i > 0 ? "1px solid #E5DDD3" : "none" }}
          >
            <span
              className="font-display text-terra-500 leading-none"
              style={{ fontSize: "clamp(32px,5vw,56px)", letterSpacing: "2px" }}
            >
              {data?.[key]?.toLocaleString("fr-FR") ?? "—"}
            </span>
            <span
              className="font-dm font-semibold uppercase text-center text-earth-800/45"
              style={{ fontSize: "9px", letterSpacing: "0.22em" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
