"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Sparkles, X, Globe2,
  Activity, Sprout, TrendingUp, GraduationCap,
  Leaf, Users, Zap, Landmark, HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import StatsBar from "@/components/StatsBar";
import RecentDatasets from "@/components/RecentDatasets";
import { searchDatasets } from "@/lib/api";

const POPULAR_CATEGORIES: { label: string; query: string; Icon: LucideIcon; color: string }[] = [
  { label: "Santé",         query: "health",       Icon: Activity,       color: "bg-red-50   text-red-600   border-red-100" },
  { label: "Agriculture",   query: "agriculture",  Icon: Sprout,         color: "bg-savane-400/10 text-savane-600 border-savane-400/20" },
  { label: "Finance",       query: "finance",      Icon: TrendingUp,     color: "bg-gold-300/20 text-yellow-700 border-gold-300/30" },
  { label: "Éducation",     query: "education",    Icon: GraduationCap,  color: "bg-blue-50  text-blue-600   border-blue-100" },
  { label: "Environnement", query: "environment",  Icon: Leaf,           color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { label: "Démographie",   query: "population",   Icon: Users,          color: "bg-purple-50 text-purple-600 border-purple-100" },
  { label: "Énergie",       query: "energy",       Icon: Zap,            color: "bg-gold-300/20 text-amber-700 border-amber-200" },
  { label: "Gouvernance",   query: "governance",   Icon: Landmark,       color: "bg-terra-50  text-terra-600  border-terra-100" },
  { label: "Humanitaire",   query: "humanitaire",  Icon: HeartHandshake, color: "bg-orange-50 text-orange-600 border-orange-100" },
];

// Fallback suggestions en cas de problème
const FALLBACK_SUGGESTIONS = [
  "mortalité infantile Cameroun",
  "production agricole Sénégal",
  "PIB Afrique de l'Ouest",
  "accès eau potable Nigeria",
];

async function fetchSuggestions() {
  const response = await fetch("/api/v1/suggestions");
  if (!response.ok) return { suggestions: FALLBACK_SUGGESTIONS };
  return response.json();
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);

  // Charge les vraies suggestions depuis l'API
  const { data: suggestionsData } = useQuery({
    queryKey: ["suggestions"],
    queryFn: fetchSuggestions,
    staleTime: 60_000 * 60, // 1 heure
  });

  useEffect(() => {
    if (suggestionsData?.suggestions) {
      setSuggestions(suggestionsData.suggestions);
    }
  }, [suggestionsData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div>
      {/* ── HERO : style Google centré ── */}
      <section className="pt-12 sm:pt-20 pb-10 sm:pb-12 px-4 text-center">
        {/* Logo géant */}
        <div className="mb-6 inline-flex flex-col items-center">
          <Globe2 className="w-12 h-12 sm:w-16 sm:h-16 mb-3 text-terra-500" strokeWidth={1.5} />
          <h1
            className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight gradient-text"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            Afrindex
          </h1>
          <p className="mt-2 text-earth-800/60 text-sm sm:text-base font-medium px-2">
            Le moteur de recherche de datasets africains
          </p>
        </div>

        {/* Barre de recherche principale */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-8">
          <div className="relative flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white border-2 border-earth-200 rounded-[2rem] px-4 sm:px-5 py-3.5 shadow-card hover:shadow-card-hover hover:border-terra-300 transition-all group">
            <Search className="w-5 h-5 text-earth-200 group-hover:text-terra-400 transition-colors flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher des données africaines…"
              className="search-input min-w-0 flex-1 bg-transparent text-ink placeholder-earth-200 text-sm sm:text-base outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-earth-200 hover:text-terra-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="flex w-full sm:w-auto justify-center items-center gap-2 bg-terra-500 hover:bg-terra-600 text-white text-sm font-semibold px-5 py-2 rounded-full transition-all shadow-sm hover:shadow-search"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Rechercher
            </button>
          </div>
        </form>

        {/* Suggestions rapides */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-earth-200 text-earth-800/70 hover:border-terra-300 hover:text-terra-600 hover:bg-terra-50 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Stats */}
      <StatsBar />

      {/* Catégories populaires */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h2 className="text-xl font-display font-bold text-ink mb-5" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
          Catégories populaires
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {POPULAR_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => router.push(`/search?q=${encodeURIComponent(cat.query)}`)}
              className={`flex flex-col items-center gap-2 border rounded-2xl p-4 text-center hover:shadow-card-hover transition-all group ${
                cat.color
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <cat.Icon className="w-6 h-6" strokeWidth={1.75} />
              <span className="text-sm font-semibold">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Derniers datasets */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <h2 className="text-xl font-display font-bold text-ink mb-5" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
          Derniers datasets ajoutés
        </h2>
        <RecentDatasets />
      </section>
    </div>
  );
}
