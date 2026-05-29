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
    title: "Mortalité,\nMaladies\n& Nutrition",
    desc: "Données épidémiologiques, couverture vaccinale, mortalité maternelle et infantile.",
    query: "health",
  },
  {
    num: "02",
    tag: "Agriculture",
    title: "Cultures,\nÉlevage\n& Sols",
    desc: "Production agricole, sécurité alimentaire, rendements et utilisation des terres.",
    query: "agriculture",
  },
  {
    num: "03",
    tag: "Finance",
    title: "PIB,\nCommerce\n& Dettes",
    desc: "Indicateurs macroéconomiques, flux financiers et échanges commerciaux africains.",
    query: "finance",
  },
  {
    num: "04",
    tag: "Éducation",
    title: "Scolarisation\n& Alphabétisation",
    desc: "Taux d'inscription, accès à l'école et qualité de l'enseignement par pays.",
    query: "education",
  },
  {
    num: "05",
    tag: "Environnement",
    title: "Forêts,\nEau\n& Climat",
    desc: "Déforestation, ressources hydriques, qualité de l'air et émissions de CO₂.",
    query: "environment",
  },
  {
    num: "06",
    tag: "Humanitaire",
    title: "Réfugiés,\nDéplacements\n& Crises",
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
      {/* ───────────────────────── HERO ─────────────────────────
          Centré, style moteur de recherche moderne
      ──────────────────────────────────────────────────────── */}
      <section className="bg-earth-50 flex flex-col items-center px-4 sm:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24">

        {/* Logo + accroche */}
        <div className="text-center mb-10 anim-1">
          <h1
            className="font-display text-terra-500 leading-none tracking-[0.08em] mb-3 select-none"
            style={{ fontSize: "clamp(56px, 9vw, 88px)" }}
          >
            AFRINDEX
          </h1>
          <p className="font-dm text-earth-800/50 text-sm sm:text-base tracking-wide">
            Le moteur de recherche de datasets africains
          </p>
        </div>

        {/* Barre de recherche */}
        <form
          onSubmit={handleSearch}
          className="w-full max-w-4xl mb-5 anim-2"
        >
          <div
            className="flex transition-shadow duration-200"
            style={{ boxShadow: "0 2px 24px rgba(0,0,0,0.09)" }}
          >
            <div className="flex-1 flex items-center gap-3 bg-white border border-r-0 border-earth-200 px-6 py-5 focus-within:border-terra-300 transition-colors">
              <Search className="w-5 h-5 flex-shrink-0 text-earth-800/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des données africaines…"
                className="flex-1 bg-transparent text-ash-800 placeholder-earth-800/30 text-base search-input font-dm"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-earth-800/30 hover:text-terra-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="font-dm font-bold uppercase tracking-[0.22em] bg-terra-500 hover:bg-terra-600 text-white px-8 sm:px-10 transition-colors whitespace-nowrap border border-terra-500"
              style={{ fontSize: "10px" }}
            >
              Rechercher
            </button>
          </div>
        </form>

        {/* Suggestions rapides */}
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl anim-3">
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

      {/* ─────────────────────────── STATS ──────────────────────── */}
      <StatsBar />

      {/* ──────────────────────── CATÉGORIES ─────────────────────
          Grille éditoriale — reste en dessous du fold
      ──────────────────────────────────────────────────────── */}
      <section className="bg-earth-100 py-16 sm:py-20">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10">

          <div className="flex items-end justify-between gap-8 mb-10 flex-wrap">
            <div>
              <div className="section-label">
                <span className="section-label-line" />
                <span className="section-label-text">Explorer par thème</span>
              </div>
              <h2
                className="font-display leading-[0.88] m-0 select-none text-ash-800"
                style={{ fontSize: "clamp(40px,5.5vw,76px)", letterSpacing: "3px" }}
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
              9 domaines. Des milliers de datasets indexés depuis les meilleures sources africaines.
            </p>
          </div>

          <div>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.num}
                onClick={() => router.push(`/search?q=${encodeURIComponent(cat.query)}`)}
                className="cat-row"
              >
                {/* Numéro */}
                <span className="cat-row-num">{cat.num}</span>

                {/* Séparateur */}
                <span className="cat-row-divider" />

                {/* Tag + Titre */}
                <span className="cat-row-name">
                  <span className="cat-row-tag">{cat.tag}</span>
                  <span className="cat-row-title">
                    {cat.title.replace(/\n/g, " ")}
                  </span>
                </span>

                {/* Description — masquée sur mobile */}
                <span className="cat-row-desc hidden sm:block">{cat.desc}</span>

                {/* CTA */}
                <span className="cat-row-cta">
                  Explorer <span className="cat-cta-bar" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── DERNIERS DATASETS ──────────────────── */}
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
