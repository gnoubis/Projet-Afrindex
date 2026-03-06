"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecentDatasets } from "@/lib/api";
import DatasetCard from "./DatasetCard";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-earth-200 p-5 animate-pulse">
      <div className="h-4 bg-earth-100 rounded-full w-3/4 mb-3" />
      <div className="h-3 bg-earth-100 rounded-full w-full mb-1.5" />
      <div className="h-3 bg-earth-100 rounded-full w-5/6" />
      <div className="flex gap-2 mt-4">
        <div className="h-5 w-16 bg-earth-100 rounded-full" />
        <div className="h-5 w-20 bg-earth-100 rounded-full" />
      </div>
    </div>
  );
}

export default function RecentDatasets() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-datasets"],
    queryFn: fetchRecentDatasets,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!data?.results?.length) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-earth-200 bg-white">
        <span className="text-4xl mb-3 block">🌝</span>
        <p className="text-earth-800/50 text-sm">Aucun dataset pour l'instant.</p>
        <p className="text-earth-800/35 text-xs mt-1">À bientôt avec les premiers scrapers !</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {data.results.slice(0, 6).map((d: any) => (
        <DatasetCard key={d.id} dataset={d} />
      ))}
    </div>
  );
}
