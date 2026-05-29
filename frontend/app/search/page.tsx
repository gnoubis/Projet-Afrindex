"use client";

import { Suspense, startTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, AlertTriangle, SearchX, ChevronLeft, ChevronRight } from "lucide-react";
import { searchDatasets, fetchSourceNames, fetchRecentDatasets, fetchSearchSuggestions } from "@/lib/api";
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
    staleTime: 60_000 * 10,
  });
  const { data: suggestionsData } = useQuery({
    queryKey: ["search-empty-suggestions"],
    queryFn: fetchSearchSuggestions,
    staleTime: 60_000 * 30,
  });
  const { data: recentData } = useQuery({
    queryKey: ["search-empty-recent"],
    queryFn: fetchRecentDatasets,
    staleTime: 60_000 * 10,
  });

  const dynamicSources = sourcesData?.map((s) => s.name) ?? [];
  const emptySuggestions = suggestionsData?.suggestions ?? [
    "santé Afrique", "agriculture Sénégal", "éducation Nigeria", "environnement Kenya",
  ];
  const recentDatasets = recentData?.results?.slice(0, 4) ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    setQuery(trimmed);
    setPage(1);
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    startTransition(() => { router.push(`/search?${params.toString()}`); });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    startTransition(() => { router.push(`/search?${params.toString()}`); });
  };

  const clearAllFilters = () => {
    setFilters({ country: "", category: "", format: "", source: "" });
    setQuery("");
    setInputValue("");
    setPage(1);
    startTransition(() => { router.push("/search"); });
  };

  const handleClearInput = () => {
    setInputValue("");
    setQuery("");
    setPage(1);
    const hasActive = Object.values(filters).some(f => f);
    if (!hasActive) {
      startTransition(() => { router.push("/search"); });
      return;
    }
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    startTransition(() => { router.push(`/search?${params.toString()}`); });
  };

  const alternativeQueries: string[] = data?.alternative_queries ?? [];
  const alternativeDatasets: any[] = data?.alternative_datasets ?? [];
  const openSuggestedSearch = (suggestion: string) => {
    const params = new URLSearchParams();
    params.set("q", suggestion);
    startTransition(() => { router.push(`/search?${params.toString()}`); });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Lien retour */}
      <a href="/" className="inline-flex items-center gap-1.5 text-sm text-earth-800/60 hover:text-terra-500 transition-colors mb-4 font-dm">
        <ChevronLeft className="w-4 h-4" /> Retour à l'accueil
      </a>

      {/* Barre de recherche — pill style */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div
          className="flex-1 flex items-center bg-white rounded-full border border-earth-200 pl-4 sm:pl-5 pr-2 py-2 hover:shadow-md focus-within:shadow-md focus-within:border-terra-300 transition-all"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}
        >
          <Search className="w-4 h-4 text-earth-800/30 flex-shrink-0 mr-2 sm:mr-3" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Rechercher…"
            className="flex-1 py-1.5 bg-transparent text-ink placeholder-earth-800/30 text-sm outline-none font-dm search-input min-w-0"
          />
          {inputValue && (
            <button type="button" onClick={handleClearInput} className="mr-1 sm:mr-2 text-earth-800/30 hover:text-terra-500 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="flex-shrink-0 bg-terra-500 hover:bg-terra-600 text-white rounded-full transition-colors"
          >
            <span className="flex sm:hidden items-center justify-center w-9 h-9">
              <Search className="w-4 h-4" />
            </span>
            <span className="hidden sm:flex items-center font-dm font-bold uppercase tracking-[0.18em] px-5 py-2" style={{ fontSize: "10px" }}>
              Rechercher
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex w-full sm:w-auto justify-center items-center gap-2 px-5 py-3 rounded-full border font-dm text-sm font-medium transition-all ${
            showFilters || activeFilters.length > 0
              ? "bg-terra-50 border-terra-300 text-terra-600 shadow-sm"
              : "bg-white border-earth-200 text-earth-800/60 hover:border-terra-300 hover:text-terra-500"
          }`}
          style={{ boxShadow: showFilters || activeFilters.length > 0 ? undefined : "0 1px 6px rgba(0,0,0,0.06)" }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtres</span>
          {activeFilters.length > 0 && (
            <span className="bg-terra-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </button>
      </form>

      {/* Chips filtres actifs */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {activeFilters.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 text-xs font-dm font-medium bg-terra-50 text-terra-600 border border-terra-200 px-3 py-1.5 rounded-full"
            >
              {value}
              <button onClick={() => handleFilterChange(key, "")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="text-xs font-dm text-earth-800/50 hover:text-red-500 transition-colors underline">
            Effacer tous les filtres
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {showFilters && (
          <aside className="w-full lg:w-64 lg:flex-shrink-0">
            <FilterPanel filters={filters} onChange={handleFilterChange} dynamicSources={dynamicSources} />
          </aside>
        )}

        <div className="flex-1 min-w-0">

          {/* État vide */}
          {!shouldSearch && (
            <div className="space-y-5">
              <div className="text-center py-12 rounded-2xl border border-dashed border-earth-200 bg-earth-50">
                <Search className="w-12 h-12 text-earth-200 mx-auto mb-3" strokeWidth={1.25} />
                <p className="font-dm text-earth-800/60 font-medium">Explorez des sujets populaires.</p>
                <p className="font-dm text-earth-800/40 text-sm mt-1">Choisissez une suggestion ou découvrez les derniers datasets ajoutés.</p>
              </div>

              <div className="bg-white rounded-2xl border border-earth-200 p-5 shadow-sm">
                <div className="section-label mb-4">
                  <span className="section-label-line" />
                  <span className="section-label-text">Recherches suggérées</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emptySuggestions.map((s) => (
                    <button key={s} onClick={() => openSuggestedSearch(s)} className="suggestion-tag">{s}</button>
                  ))}
                </div>
              </div>

              {recentDatasets.length > 0 && (
                <div>
                  <div className="section-label mb-4">
                    <span className="section-label-line" />
                    <span className="section-label-text">Datasets récents à découvrir</span>
                  </div>
                  <div className="grid gap-3">
                    {recentDatasets.map((d: any) => <DatasetCard key={d.id} dataset={d} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skeletons */}
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

          {/* Erreur */}
          {shouldSearch && isError && (
            <div className="text-center py-16 rounded-2xl border border-red-100 bg-red-50">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="font-dm text-red-600 font-medium">Erreur de connexion à l'API.</p>
              <p className="font-dm text-red-400 text-sm mt-1">Vérifiez que le backend est démarré.</p>
            </div>
          )}

          {/* Résultats */}
          {shouldSearch && data && !isLoading && (
            <>
              <p className="font-dm text-sm text-earth-800/50 mb-4">
                <span className="font-semibold text-ink">{data.total.toLocaleString("fr-FR")}</span> résultat{data.total !== 1 ? "s" : ""}
                {query && <> pour <span className="font-medium text-terra-500">"{query}"</span></>}
                <span className="ml-2 text-earth-800/30">— page {page} / {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}</span>
              </p>

              {data.message && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-5 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="font-dm text-sm text-yellow-700 font-medium">{data.message}</p>
                    <p className="font-dm text-xs text-yellow-600 mt-1">Affinez votre recherche pour de meilleurs résultats.</p>
                  </div>
                </div>
              )}

              {data.message && alternativeQueries.length > 0 && (
                <div className="bg-white rounded-2xl border border-earth-200 p-4 sm:p-5 mb-5 shadow-sm">
                  <div className="section-label mb-3">
                    <span className="section-label-line" />
                    <span className="section-label-text">Reformuler la recherche</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alternativeQueries.map((s) => (
                      <button key={s} onClick={() => openSuggestedSearch(s)} className="suggestion-tag">{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {data.results.length === 0 ? (
                <div className="space-y-5">
                  <div className="text-center py-12 rounded-2xl border border-dashed border-earth-200 bg-white">
                    <SearchX className="w-12 h-12 text-earth-200 mx-auto mb-3" strokeWidth={1.25} />
                    <p className="font-dm text-earth-800/60 font-medium">Aucun dataset trouvé.</p>
                    <p className="font-dm text-earth-800/40 text-sm mt-1">On n'a rien trouvé pour cette requête exacte, mais voici d'autres pistes utiles.</p>
                  </div>

                  {alternativeQueries.length > 0 && (
                    <div className="bg-white rounded-2xl border border-earth-200 p-4 sm:p-5 shadow-sm">
                      <div className="section-label mb-3">
                        <span className="section-label-line" />
                        <span className="section-label-text">Essayez aussi</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {alternativeQueries.map((s) => (
                          <button key={s} onClick={() => openSuggestedSearch(s)} className="suggestion-tag">{s}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {alternativeDatasets.length > 0 && (
                    <div>
                      <div className="section-label mb-4">
                        <span className="section-label-line" />
                        <span className="section-label-text">Datasets suggérés</span>
                      </div>
                      <div className="grid gap-3">
                        {alternativeDatasets.map((d: any) => (
                          <DatasetCard key={d.id} dataset={d} currentQuery={query} currentFilters={filters} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Légende badges */}
                  <div className="mb-5 p-4 bg-white rounded-2xl border border-earth-200 shadow-sm">
                    <p className="font-dm text-xs font-bold uppercase tracking-[0.2em] text-earth-800/40 mb-3">Comprendre les badges</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {[
                        { cls: "bg-blue-50 text-blue-600 border-blue-100", label: "HDX", desc: "Source" },
                        { cls: "bg-savane-400/10 text-savane-600 border-savane-400/20", label: "Mali", desc: "Pays" },
                        { cls: "bg-terra-50 text-terra-600 border-terra-100", label: "Santé", desc: "Domaine" },
                        { cls: "bg-savane-400/10 text-savane-600 border-savane-400/20", label: "CSV", desc: "Format" },
                      ].map(({ cls, label, desc }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className={`inline-flex items-center text-[11px] font-dm font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>{label}</span>
                          <span className="font-dm text-xs text-earth-700">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {data.results.map((d: any) => (
                      <DatasetCard key={d.id} dataset={d} currentQuery={query} currentFilters={filters} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {data.total > PAGE_SIZE && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-earth-200 bg-white font-dm text-sm font-medium text-earth-800/60 hover:border-terra-300 hover:text-terra-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" /> Précédent
                      </button>

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
                              <span key={`e-${i}`} className="px-1 text-earth-800/30 font-dm text-sm">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setPage(p as number)}
                                className={`w-9 h-9 rounded-full font-dm text-sm font-medium transition-all ${
                                  page === p
                                    ? "bg-terra-500 text-white shadow-sm"
                                    : "text-earth-800/60 hover:bg-earth-100 border border-earth-200"
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-earth-200 bg-white font-dm text-sm font-medium text-earth-800/60 hover:border-terra-300 hover:text-terra-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
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
