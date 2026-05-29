"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import StatsBar from "@/components/StatsBar";
import RecentDatasets from "@/components/RecentDatasets";

const FALLBACK_SUGGESTIONS = [
  "mortalité infantile Cameroun",
  "production agricole Sénégal",
  "PIB Afrique de l'Ouest",
  "accès eau potable Nigeria",
];

async function fetchSuggestions() {
  const res = await fetch("/api/v1/suggestions");
  if (!res.ok) return { suggestions: FALLBACK_SUGGESTIONS };
  return res.json();
}

const CATEGORIES = [
  {
    num: "01",
    tag: "Santé",
    title: "Mortalité, Maladies & Nutrition",
    desc: "Données épidémiologiques, couverture vaccinale, mortalité maternelle et infantile.",
    query: "health",
  },
  {
    num: "02",
    tag: "Agriculture",
    title: "Cultures, Élevage & Sols",
    desc: "Production agricole, sécurité alimentaire, rendements et utilisation des terres.",
    query: "agriculture",
  },
  {
    num: "03",
    tag: "Finance",
    title: "PIB, Commerce & Dettes",
    desc: "Indicateurs macroéconomiques, flux financiers et échanges commerciaux africains.",
    query: "finance",
  },
  {
    num: "04",
    tag: "Éducation",
    title: "Scolarisation & Alphabétisation",
    desc: "Taux d'inscription, accès à l'école et qualité de l'enseignement par pays.",
    query: "education",
  },
  {
    num: "05",
    tag: "Environnement",
    title: "Forêts, Eau & Climat",
    desc: "Déforestation, ressources hydriques, qualité de l'air et émissions de CO₂.",
    query: "environment",
  },
  {
    num: "06",
    tag: "Humanitaire",
    title: "Réfugiés, Déplacements & Crises",
    desc: "Données UNHCR, flux de déplacés internes, aide humanitaire et accès aux services.",
    query: "humanitaire",
  },
];

export default function HomePage() {
  const [query, setQuery]             = useState("");
  const router                        = useRouter();
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);

  const { data: suggestionsData } = useQuery({
    queryKey: ["suggestions"],
    queryFn: fetchSuggestions,
    staleTime: 60_000 * 60,
  });

  useEffect(() => {
    if (suggestionsData?.suggestions) setSuggestions(suggestionsData.suggestions);
  }, [suggestionsData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div>
      {/* ─────────────────────── HERO ───────────────────────── */}
      <section className="bg-earth-50 flex flex-col items-center px-4 sm:px-8 pt-14 sm:pt-36 pb-14 sm:pb-32">

        {/* Logo */}
        <div className="text-center mb-10 anim-1">
          <h1
            className="font-display text-terra-500 leading-none tracking-[0.08em] mb-3 select-none"
            style={{ fontSize: "clamp(64px, 10vw, 104px)" }}
          >
            AFRINDEX
          </h1>
          <p className="font-dm text-earth-800/50 text-sm sm:text-base tracking-wide">
            Le moteur de recherche de datasets africains
          </p>
        </div>

        {/* Barre de recherche — pill Google */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6 anim-2">
          <div
            className="flex items-center bg-white rounded-full border border-earth-200 pl-4 sm:pl-6 pr-2 py-2 hover:shadow-lg focus-within:shadow-lg focus-within:border-terra-300 transition-all"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-earth-800/30 mr-2 sm:mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 py-2 bg-transparent text-ash-800 placeholder-earth-800/30 text-sm sm:text-base search-input font-dm min-w-0"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mr-1 sm:mr-2 text-earth-800/30 hover:text-terra-500 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {/* Mobile : icône seule — Desktop : texte complet */}
            <button
              type="submit"
              className="flex-shrink-0 bg-terra-500 hover:bg-terra-600 text-white rounded-full transition-colors"
            >
              <span className="flex sm:hidden items-center justify-center w-10 h-10">
                <Search className="w-4 h-4" />
              </span>
              <span className="hidden sm:flex items-center font-dm font-bold uppercase tracking-[0.18em] px-6 py-3" style={{ fontSize: "10px" }}>
                Rechercher
              </span>
            </button>
          </div>
        </form>

        {/* Suggestions rapides — pills */}
        <div className="flex flex-wrap justify-center gap-2 max-w-xl anim-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
              className="suggestion-tag"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* ───────────────────────── STATS ────────────────────── */}
      <StatsBar />

      {/* ─────────────────────── CATÉGORIES ──────────────────── */}
      <section className="bg-earth-100 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">

          <div className="flex items-end justify-between gap-8 mb-10 flex-wrap">
            <div>
              <div className="section-label">
                <span className="section-label-line" />
                <span className="section-label-text">Explorer par thème</span>
              </div>
              <h2
                className="font-display leading-[0.88] m-0 select-none text-ash-800"
                style={{ fontSize: "clamp(40px,5.5vw,72px)", letterSpacing: "3px" }}
              >
                DONNÉES<br />
                <span style={{ WebkitTextStroke: "1.5px #E85D04", color: "transparent" }}>
                  THÉMATIQUES
                </span>
              </h2>
            </div>
            <p
              className="font-dm font-light leading-relaxed text-earth-800/50 pb-1"
              style={{ fontSize: "13px", maxWidth: "200px" }}
            >
              6 domaines. Des milliers de datasets indexés depuis les meilleures sources africaines.
            </p>
          </div>

          {/* Grille de cartes arrondies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.num}
                onClick={() => router.push(`/search?q=${encodeURIComponent(cat.query)}`)}
                className="cat-card"
              >
                <span className="cat-card-num">{cat.num}</span>
                <span className="cat-card-tag">{cat.tag}</span>
                <span className="cat-card-title">{cat.title}</span>
                <span className="cat-card-desc">{cat.desc}</span>
                <span className="cat-card-cta">
                  Explorer <span className="cat-cta-bar" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── DERNIERS DATASETS ──────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="section-label">
          <span className="section-label-line" />
          <span className="section-label-text">Dernières données</span>
        </div>
        <h2
          className="font-display mb-10 select-none text-ash-800"
          style={{ fontSize: "clamp(36px,4.5vw,62px)", lineHeight: 0.9, letterSpacing: "3px" }}
        >
          NOUVEAUX<br />
          <span style={{ WebkitTextStroke: "1.5px #E85D04", color: "transparent" }}>
            DATASETS
          </span>
        </h2>
        <RecentDatasets />
      </section>
    </div>
  );
}
