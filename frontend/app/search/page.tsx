"use client";

import { Suspense, startTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, AlertTriangle, SearchX, ChevronLeft, ChevronRight } from "lucide-react";
import { searchDatasets, fetchSourceNames } from "@/lib/api";
import DatasetCard from "@/components/DatasetCard";
import FilterPanel from "@/components/FilterPanel";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-earth-800/40">Chargement…</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [filters, setFilters] = useState({
    country:  "",
    category: "",
    format:   "",
    source:   "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Synchronise l'état avec les paramètres d'URL
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setInputValue(searchParams.get("q") || "");
    setFilters({
      country:  searchParams.get("country")  || "",
      category: searchParams.get("category") || "",
      format:   searchParams.get("format")   || "",
      source:   searchParams.get("source")   || "",
    });
    setPage(1);
  }, [searchParams]);

  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  const hasActiveFilters = Object.values(filters).some(f => f);
  const shouldSearch = query.trim() !== "" || hasActiveFilters;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", query, filters, page],
    queryFn: () => searchDatasets({ q: query || "*", ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    enabled: shouldSearch,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ["source-names"],
    queryFn: fetchSourceNames,
    staleTime: 60_000 * 10, // 10 min
  });
  const dynamicSources = sourcesData?.map((s) => s.name) ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    setQuery(trimmed);
    setPage(1);
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    setFilters({ country: "", category: "", format: "", source: "" });
    setQuery("");
    setInputValue("");
    setPage(1);
    startTransition(() => {
      router.push("/search");
    });
  };

  const handleClearInput = () => {
    setInputValue("");
    setQuery("");
    setPage(1);
    
    // Reste sur la page de recherche mais sans résultats
    const hasActiveFilters = Object.values(filters).some(f => f);
    if (!hasActiveFilters) {
      startTransition(() => {
        router.push("/search");
      });
      return;
    }
    
    // Sinon garder les filtres et chercher avec requête vide
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Lien retour */}
      <a href="/" className="inline-flex items-center gap-1.5 text-sm text-earth-800/60 hover:text-terra-500 transition-colors mb-4">
        <ChevronLeft className="w-4 h-4" /> Retour à l'accueil
      </a>

      {/* Barre de recherche */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="flex-1 relative flex items-center bg-white border-2 border-earth-200 rounded-full px-5 py-3 hover:border-terra-300 focus-within:border-terra-400 transition-all shadow-card group">
          <Search className="w-4 h-4 text-earth-800/30 group-focus-within:text-terra-400 transition-colors flex-shrink-0 mr-3" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Rechercher des datasets africains…"
            className="flex-1 bg-transparent text-ink placeholder-earth-800/30 text-sm outline-none"
          />
          {inputValue && (
            <button type="button" onClick={handleClearInput} className="ml-2 text-earth-800/30 hover:text-terra-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="bg-terra-500 text-white font-semibold px-6 py-3 rounded-full hover:bg-terra-600 transition-all shadow-sm hover:shadow-search text-sm"
        >
          Rechercher
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 border px-4 py-3 rounded-full text-sm font-medium transition-all ${
            showFilters || activeFilters.length > 0
              ? "bg-terra-50 border-terra-300 text-terra-600"
              : "bg-white border-earth-200 text-earth-800/60 hover:bg-earth-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtres</span>
          {activeFilters.length > 0 && (
            <span className="bg-terra-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </button>
      </form>

      {/* Filtres actifs (chips) */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {activeFilters.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-terra-50 text-terra-600 border border-terra-200 px-3 py-1 rounded-full"
            >
              {value}
              <button onClick={() => handleFilterChange(key, "")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-earth-800/50 hover:text-red-500 transition-colors underline"
          >
            Effacer tous les filtres
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Filtres latéraux */}
        {showFilters && (
          <aside className="w-64 flex-shrink-0">
            <FilterPanel filters={filters} onChange={handleFilterChange} dynamicSources={dynamicSources} />
          </aside>
        )}

        {/* Résultats */}
        <div className="flex-1 min-w-0">
          {!shouldSearch && (
            <div className="text-center py-16 rounded-2xl border border-dashed border-earth-200 bg-earth-50">
              <Search className="w-12 h-12 text-earth-200 mx-auto mb-3" strokeWidth={1.25} />
              <p className="text-earth-800/60 font-medium">Effectuez une recherche pour afficher les résultats.</p>
              <p className="text-earth-800/40 text-sm mt-1">Entrez un ou plusieurs mots-clés ou utilisez les filtres.</p>
            </div>
          )}
          {shouldSearch && isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-earth-200 p-5 animate-pulse">
                  <div className="h-4 bg-earth-100 rounded-full w-2/3 mb-3" />
                  <div className="h-3 bg-earth-100 rounded-full w-full mb-1.5" />
                  <div className="h-3 bg-earth-100 rounded-full w-4/5" />
                </div>
              ))}
            </div>
          )}
          {shouldSearch && isError && (
            <div className="text-center py-16 rounded-2xl border border-red-100 bg-red-50">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-red-600 font-medium">Erreur de connexion à l'API.</p>
              <p className="text-red-400 text-sm mt-1">Vérifiez que le backend est démarré.</p>
            </div>
          )}
          {shouldSearch && data && !isLoading && (
            <>
              <p className="text-sm text-earth-800/50 mb-4">
                <span className="font-semibold text-ink">{data.total.toLocaleString("fr-FR")}</span> résultat{data.total !== 1 ? "s" : ""}
                {query && <> pour <span className="font-medium text-terra-500">"{query}"</span></>}
                <span className="ml-2 text-earth-800/30">— page {page} / {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}</span>
              </p>

              {/* Message explicite si pas de résultats exacts */}
              {data.message && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-yellow-700 font-medium">{data.message}</p>
                    <p className="text-xs text-yellow-600 mt-1">Affinez votre recherche pour de meilleurs résultats.</p>
                  </div>
                </div>
              )}

              {data.results.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-earth-200 bg-white">
                  <SearchX className="w-12 h-12 text-earth-200 mx-auto mb-3" strokeWidth={1.25} />
                  <p className="text-earth-800/60 font-medium">Aucun dataset trouvé.</p>
                  <p className="text-earth-800/40 text-sm mt-1">Essayez des mots-clés différents ou modifiez les filtres.</p>
                </div>
              ) : (
                <>
                  {/* Légende des badges - Design amélioré */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-terra-50 to-earth-50 rounded-2xl border border-terra-100/50">
                    <p className="text-sm font-semibold text-earth-800 mb-3">Comprendre les badges :</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-[11px] font-medium bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-100">
                          HDX
                        </span>
                        <span className="text-xs text-earth-700">Source de données</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-savane-400/10 text-savane-600 px-2.5 py-0.5 rounded-full border border-savane-400/20">
                          🌍 Mali
                        </span>
                        <span className="text-xs text-earth-700">Pays couvert</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-[11px] font-medium bg-terra-50 text-terra-600 px-2.5 py-0.5 rounded-full border border-terra-100">
                          Santé
                        </span>
                        <span className="text-xs text-earth-700">Domaine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-[11px] font-medium bg-savane-400/10 text-savane-600 px-2.5 py-0.5 rounded-full border border-savane-400/20">
                          CSV
                        </span>
                        <span className="text-xs text-earth-700">Format du fichier</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-earth-800/50 bg-earth-100 px-2.5 py-0.5 rounded-full">
                          🏷️ Tag
                        </span>
                        <span className="text-xs text-earth-700">Mot-clé</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {data.results.map((dataset: any) => (
                      <DatasetCard 
                        key={dataset.id} 
                        dataset={dataset}
                        currentQuery={query}
                        currentFilters={filters}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {data.total > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-earth-200 bg-white text-sm font-medium text-earth-800/60 hover:border-terra-300 hover:text-terra-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" /> Précédent
                      </button>

                      {/* Numéros de page */}
                      <div className="flex items-center gap-1">
                        {(() => {
                          const total = Math.ceil(data.total / PAGE_SIZE);
                          const pages: (number | "...")[] = [];
                          if (total <= 7) {
                            for (let i = 1; i <= total; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (page > 3) pages.push("...");
                            for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i);
                            if (page < total - 2) pages.push("...");
                            pages.push(total);
                          }
                          return pages.map((p, i) =>
                            p === "..." ? (
                              <span key={`ellipsis-${i}`} className="px-1 text-earth-800/30 text-sm">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setPage(p as number)}
                                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                                  page === p
                                    ? "bg-terra-500 text-white shadow-sm"
                                    : "text-earth-800/60 hover:bg-earth-100"
                                }`}
                              >
                                {p}
                              </button>
                            )
                          );
                        })()}
                      </div>

                      <button
                        onClick={() => setPage((p) => Math.min(Math.ceil(data.total / PAGE_SIZE), p + 1))}
                        disabled={page >= Math.ceil(data.total / PAGE_SIZE)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-earth-200 bg-white text-sm font-medium text-earth-800/60 hover:border-terra-300 hover:text-terra-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Suivant <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}