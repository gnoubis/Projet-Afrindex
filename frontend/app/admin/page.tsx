"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, Star, RefreshCw,
  ArrowLeft, LogOut, Globe2, Database, Plus, Trash2, Play, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  fetchAdminStats,
  fetchSearchLogs,
  fetchAdminReviews,
  deleteReview,
  fetchEmbedStatus,
  triggerEmbeddings,
  fetchSources,
  createSource,
  updateSource,
  deleteSource,
  indexSource,
  indexAllSources,
  type DataSourceCreate,
  type DataSourceRecord,
} from "@/lib/api";

const SESSION_KEY = "afrindex_admin_auth";

// ── Types ──────────────────────────────────────────────────────────────────
type IndexStatus = { status: string; last_run: string | null; error: string | null };
type EmbedStatus = { status: string; done: number; total: number; error: string | null; last_run: string | null };
type AdminStats = {
  datasets: {
    total: number; sources: number; countries: number; with_embeddings: number;
    by_country: { country: string; cnt: number }[];
    by_category: { category: string; cnt: number }[];
  };
  searches: {
    total: number; today: number; this_week: number;
    top_queries: { query: string; cnt: number }[];
    daily: { day: string; cnt: number }[];
  };
  reviews: { total: number; avg_rating: number | null };
};

// ── Badge couleur statut ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle:    "bg-gray-100 text-gray-600",
    running: "bg-amber-100 text-amber-700 animate-pulse",
    done:    "bg-green-100 text-green-700",
    error:   "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = { idle: "En attente", running: "En cours…", done: "Terminé", error: "Erreur" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 border ${color}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value?.toLocaleString()}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

// ── Mini bar chart ─────────────────────────────────────────────────────────
function BarChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  if (!data.length) return <p className="text-sm text-gray-400 py-4">Aucune donnée</p>;
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-32 truncate text-gray-700 text-xs">{d[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-[#C1440E]"
              style={{ width: `${Math.round((d[valueKey] / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Sparkline (daily searches) ─────────────────────────────────────────────
function Sparkline({ data }: { data: { day: string; cnt: number }[] }) {
  if (!data.length) return <p className="text-sm text-gray-400">Aucune donnée</p>;
  const max = Math.max(...data.map((d) => d.cnt), 1);
  const W = 400; const H = 60; const pad = 4;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (W - pad * 2);
    const y = H - pad - ((d.cnt / max) * (H - pad * 2));
    return `${x},${y}`;
  }).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
        <polyline points={pts} fill="none" stroke="#C1440E" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = pad + (i / (data.length - 1 || 1)) * (W - pad * 2);
          const y = H - pad - ((d.cnt / max) * (H - pad * 2));
          return <circle key={i} cx={x} cy={y} r="3" fill="#C1440E" />;
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "searches" | "reviews" | "indexation" | "sources">("overview");
  const [sources, setSources] = useState<DataSourceRecord[]>([]);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newSource, setNewSource] = useState<DataSourceCreate>({
    name: "", source_type: "ckan", base_url: "", countries: [], default_category: "", description: "", active: true,
  });
  const [sourceMsg, setSourceMsg] = useState("");
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus | null>(null);
  const [embedMsg, setEmbedMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Vérification de session ────────────────────────────────────────────
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) !== "1") {
      router.replace("/admin/login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    router.replace("/admin/login");
  }

  const reload = useCallback(async () => {
    try {
      const [s, l, r, srcs] = await Promise.all([
        fetchAdminStats(), fetchSearchLogs(), fetchAdminReviews(), fetchSources(),
      ]);
      setStats(s);
      setLogs(l.logs ?? []);
      setReviews(r.reviews ?? []);
      setSources(srcs.sources ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) reload(); }, [reload, authed]);

  // Rafraîchir le statut embed
  useEffect(() => {
    fetchEmbedStatus().then(setEmbedStatus).catch(() => {});
    const t = setInterval(() => {
      fetchEmbedStatus().then(setEmbedStatus).catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, []);

  async function launchEmbeddings() {
    try {
      const r = await triggerEmbeddings();
      setEmbedMsg(r.message ?? r.error ?? "Lancé");
      fetchEmbedStatus().then(setEmbedStatus);
    } catch {
      setEmbedMsg("Erreur lors du lancement");
    }
  }

  // Rafraîchir toutes les 10s si une indexation est en cours
  useEffect(() => {
    if (!sources.length) return;
    const running = sources.some((s) => s.last_status === "running");
    if (!running) return;
    const t = setTimeout(reload, 10000);
    return () => clearTimeout(t);
  }, [sources, reload]);


  const handleIndexSource = async (id: number) => {
    try {
      const r = await indexSource(id);
      setSourceMsg(r.message ?? "");
      setTimeout(reload, 1500);
    } catch (e: any) {
      setSourceMsg(e?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleIndexAll = async () => {
    try {
      const r = await indexAllSources();
      setSourceMsg(r.message ?? "");
      setTimeout(reload, 1500);
    } catch {
      setSourceMsg("Erreur lors du lancement");
    }
  };

  const handleToggleSource = async (src: DataSourceRecord) => {
    await updateSource(src.id, { active: !src.active });
    reload();
  };

  const handleDeleteSource = async (id: number) => {
    if (!confirm("Supprimer cette source ? (les datasets déjà indexés sont conservés)")) return;
    await deleteSource(id);
    reload();
  };

  const handleCreateSource = async () => {
    if (!newSource.name || !newSource.base_url) {
      setSourceMsg("Nom et URL requis"); return;
    }
    try {
      await createSource({ ...newSource, countries: newSource.countries.filter(Boolean) });
      setAddFormOpen(false);
      setNewSource({ name: "", source_type: "ckan", base_url: "", countries: [], default_category: "", description: "", active: true });
      setSourceMsg("Source ajoutée avec succès");
      reload();
    } catch (e: any) {
      setSourceMsg(e?.response?.data?.detail ?? "Erreur lors de la création");
    }
  };

  const removeReview = async (id: number) => {
    await deleteReview(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  if (!authed) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EBE3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#C1440E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement du dashboard…</p>
        </div>
      </div>
    );
  }

  const ds = stats?.datasets;
  const sr = stats?.searches;
  const rv = stats?.reviews;

  const TABS = [
    { key: "overview",   label: "Vue d'ensemble", Icon: LayoutDashboard },
    { key: "searches",   label: "Recherches",      Icon: Search },
    { key: "reviews",    label: "Avis",            Icon: Star },
    { key: "sources",    label: "Sources",          Icon: Database },
    { key: "indexation", label: "Indexation",      Icon: RefreshCw },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F0EBE3]">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/" className="inline-flex items-center gap-1.5 text-[#C1440E] hover:underline text-sm">
            <ArrowLeft className="w-3.5 h-3.5" /> Afrindex
          </a>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Dashboard Admin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={reload} className="inline-flex items-center gap-1.5 text-sm text-[#C1440E] hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Déconnexion <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-[#C1440E] text-[#C1440E]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.Icon className="w-4 h-4" strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ── Vue d'ensemble ── */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Datasets" value={ds?.total ?? 0} sub={`${ds?.sources} sources`} color="border-orange-200 bg-orange-50 text-orange-900" />
              <StatCard label="Pays" value={ds?.countries ?? 0} sub="couverts" color="border-green-200 bg-green-50 text-green-900" />
              <StatCard label="Recherches aujourd'hui" value={sr?.today ?? 0} sub={`${sr?.this_week} cette semaine`} color="border-blue-200 bg-blue-50 text-blue-900" />
              <StatCard label="Note moyenne" value={rv?.avg_rating ? `${rv.avg_rating}/5` : "—"} sub={`${rv?.total} avis`} color="border-yellow-200 bg-yellow-50 text-yellow-900" />
            </div>

            {/* Graphiques */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Datasets par pays</h3>
                <BarChart data={ds?.by_country ?? []} labelKey="country" valueKey="cnt" />
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Datasets par catégorie</h3>
                <BarChart data={ds?.by_category ?? []} labelKey="category" valueKey="cnt" />
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 md:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-4">Recherches (14 derniers jours)</h3>
                <Sparkline data={sr?.daily ?? []} />
              </div>
            </div>

            {/* Embeddings */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2">Couverture sémantique</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-[#C1440E] to-[#E2A917]"
                    style={{ width: ds?.total ? `${Math.round(((ds.with_embeddings ?? 0) / ds.total) * 100)}%` : "0%" }}
                  />
                </div>
                <span className="text-sm text-gray-600 break-words">
                  {ds?.with_embeddings?.toLocaleString()} / {ds?.total?.toLocaleString()} datasets avec embedding
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Recherches ── */}
        {tab === "searches" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <StatCard label="Total recherches" value={sr?.total ?? 0} color="border-blue-200 bg-blue-50 text-blue-900" />
              <StatCard label="Aujourd'hui" value={sr?.today ?? 0} color="border-green-200 bg-green-50 text-green-900" />
              <StatCard label="Cette semaine" value={sr?.this_week ?? 0} color="border-purple-200 bg-purple-50 text-purple-900" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Top requêtes (7 jours)</h3>
                <BarChart data={sr?.top_queries ?? []} labelKey="query" valueKey="cnt" />
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Tendance (14 jours)</h3>
                <Sparkline data={sr?.daily ?? []} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-800">Journal des recherches récentes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Requête</th>
                      <th className="px-4 py-3">Résultats</th>
                      <th className="px-4 py-3">Pays</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{l.query}</td>
                        <td className="px-4 py-2.5 text-gray-500">{l.results_count}</td>
                        <td className="px-4 py-2.5 text-gray-500">{l.country_filter || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-500">{l.category_filter || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">
                          {new Date(l.created_at).toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                    {!logs.length && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucune recherche enregistrée</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Avis ── */}
        {tab === "reviews" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard label="Total avis" value={rv?.total ?? 0} color="border-yellow-200 bg-yellow-50 text-yellow-900" />
              <StatCard label="Note moyenne" value={rv?.avg_rating ? `${rv.avg_rating} / 5` : "—"} color="border-orange-200 bg-orange-50 text-orange-900" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-800">Tous les avis</h3>
              </div>
              <div className="divide-y">
                {reviews.map((r) => (
                  <div key={r.id} className="px-5 py-4 flex gap-4 items-start">
                    <div className="flex-shrink-0 text-2xl">
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {r.dataset_title ?? "Dataset non spécifié"}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">{r.comment || <em className="text-gray-400">Pas de commentaire</em>}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {r.author} · {new Date(r.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeReview(r.id)}
                      className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
                {!reviews.length && (
                  <div className="px-5 py-10 text-center text-gray-400">Aucun avis pour l'instant</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Sources ── */}
        {tab === "sources" && (
          <div className="space-y-6">
            {sourceMsg && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
                {sourceMsg}
              </div>
            )}

            {/* Boutons globaux */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">Sources de données ({sources.length})</h2>
              <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
                <button
                  onClick={handleIndexAll}
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-[#C1440E] text-white hover:bg-[#A3370B] transition-colors"
                >
                  <Play className="w-3.5 h-3.5" /> Tout indexer
                </button>
                <button
                  onClick={() => setAddFormOpen((v) => !v)}
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-[#C1440E] text-[#C1440E] hover:bg-orange-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une source
                </button>
              </div>
            </div>

            {/* Formulaire ajout */}
            {addFormOpen && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-800">Nouvelle source</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                    <input value={newSource.name} onChange={(e) => setNewSource((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Kenya Open Data" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                    <select value={newSource.source_type} onChange={(e) => setNewSource((p) => ({ ...p, source_type: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="ckan">CKAN (HDX, portails gouvernementaux…)</option>
                      <option value="worldbank">World Bank API</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">URL de base API *</label>
                    <input value={newSource.base_url} onChange={(e) => setNewSource((p) => ({ ...p, base_url: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="https://opendata.go.ke/api/3/action" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie par défaut</label>
                    <input value={newSource.default_category ?? ""} onChange={(e) => setNewSource((p) => ({ ...p, default_category: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Gouvernance" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pays (séparés par des virgules)</label>
                    <input
                      defaultValue=""
                      onChange={(e) => setNewSource((p) => ({ ...p, countries: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Kenya, Uganda, Tanzania" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea value={newSource.description ?? ""} onChange={(e) => setNewSource((p) => ({ ...p, description: e.target.value }))}
                      rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button onClick={handleCreateSource}
                    className="px-4 py-2 bg-[#C1440E] text-white text-sm font-medium rounded-xl hover:bg-[#A3370B] transition-colors">
                    Créer la source
                  </button>
                  <button onClick={() => setAddFormOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Table sources */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {sources.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  Aucune source configurée. Cliquez sur « Ajouter une source » pour commencer.
                </div>
              ) : (
                <div className="divide-y">
                  {sources.map((src) => (
                    <div key={src.id} className="px-5 py-4">
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800">{src.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              src.source_type === "ckan" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                            }`}>{src.source_type.toUpperCase()}</span>
                            <StatusBadge status={src.last_status} />
                            {!src.active && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Désactivée</span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">{src.base_url}</p>
                          {src.description && <p className="text-sm text-gray-500 mt-1">{src.description}</p>}
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 mt-1 text-xs text-gray-400">
                            {src.countries?.length > 0 && <span>Pays: {src.countries.join(", ")}</span>}
                            {src.default_category && <span>Catégorie: {src.default_category}</span>}
                            {src.datasets_count > 0 && <span>{src.datasets_count.toLocaleString()} datasets</span>}
                            {src.last_run && <span>Dernière exéc.: {new Date(src.last_run).toLocaleString("fr-FR")}</span>}
                          </div>
                          {src.last_error && src.last_status === "error" && (
                            <p className="text-xs text-red-500 mt-1">Erreur: {src.last_error}</p>
                          )}
                        </div>
                        <div className="flex w-full sm:w-auto items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleSource(src)}
                            title={src.active ? "Désactiver" : "Activer"}
                            className="text-gray-400 hover:text-[#C1440E] transition-colors"
                          >
                            {src.active
                              ? <ToggleRight className="w-5 h-5 text-green-500" />
                              : <ToggleLeft className="w-5 h-5" />
                            }
                          </button>
                          <button
                            onClick={() => handleIndexSource(src.id)}
                            disabled={src.last_status === "running" || !src.active}
                            className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#C1440E] text-white hover:bg-[#A3370B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            {src.last_status === "running" ? "En cours" : "Indexer"}
                          </button>
                          <button
                            onClick={() => handleDeleteSource(src.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exemples de sources à ajouter */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h4 className="font-semibold text-amber-800 mb-3">💡 Portails CKAN africains à ajouter</h4>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                {[
                  { name: "Open Africa", url: "https://open.africa/api/3/action" },
                  { name: "Kenya Open Data", url: "https://opendata.go.ke/api/3/action" },
                  { name: "Ghana Open Data", url: "https://data.gov.gh/api/3/action" },
                  { name: "Nigeria Open Data", url: "https://data.gov.ng/api/3/action" },
                ].map((ex) => (
                  <div key={ex.url} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <div>
                      <span className="font-medium text-gray-700">{ex.name}</span>
                      <p className="text-xs text-gray-400 font-mono">{ex.url}</p>
                    </div>
                    <button
                      onClick={() => {
                        setNewSource((p) => ({ ...p, name: ex.name, source_type: "ckan", base_url: ex.url }));
                        setAddFormOpen(true);
                      }}
                      className="text-xs text-[#C1440E] hover:underline"
                    >
                      Utiliser
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Indexation ── */}
        {tab === "indexation" && (
          <div className="space-y-6">
            {sourceMsg && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
                {sourceMsg}
              </div>
            )}

            {/* Redirect to sources tab */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
              <strong>Conseil :</strong> La gestion dynamique des sources se trouve dans l'onglet
              <button onClick={() => setTab("sources")} className="underline font-semibold ml-1">Sources</button>.
              Ici vous pouvez lancer une ré-indexation rapide des sources déjà configurées.
            </div>

            {/* Sources rapides */}
            {sources.filter((s) => s.active).map((src) => (
              <div key={src.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-orange-500" strokeWidth={1.75} />
                      <h3 className="font-semibold text-gray-800">{src.name}</h3>
                      <StatusBadge status={src.last_status} />
                    </div>
                    {src.last_run && (
                      <p className="text-xs text-gray-400 mt-1">
                        Dernière exécution : {new Date(src.last_run).toLocaleString("fr-FR")}
                      </p>
                    )}
                    {src.last_error && src.last_status === "error" && (
                      <p className="text-xs text-red-500 mt-1">Erreur : {src.last_error}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleIndexSource(src.id)}
                    disabled={src.last_status === "running"}
                    className="w-full sm:w-auto flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl bg-[#C1440E] text-white hover:bg-[#A3370B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {src.last_status === "running" ? "En cours…" : "Lancer"}
                  </button>
                </div>
              </div>
            ))}

            {/* Tout indexer */}
            <div className="bg-gradient-to-r from-[#C1440E] to-[#E2A917] rounded-2xl p-5 text-white">
              <h3 className="font-semibold text-lg mb-1">Tout indexer</h3>
              <p className="text-sm opacity-80 mb-4">
                Lance toutes les sources actives simultanément. L'opération peut prendre plusieurs minutes.
              </p>
              <button
                onClick={handleIndexAll}
                disabled={sources.some((s) => s.last_status === "running")}
                className="px-5 py-2 bg-white text-[#C1440E] font-semibold rounded-xl hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Indexation complète
              </button>
            </div>

            {/* Embeddings */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    <h3 className="font-semibold text-gray-800">Embeddings sémantiques (OpenAI)</h3>
                    <StatusBadge status={embedStatus?.status ?? "idle"} />
                  </div>
                  <p className="text-sm text-gray-500">Génère les vecteurs pour les {ds?.total?.toLocaleString()} datasets via OpenAI text-embedding-3-small. Améliore la pertinence des recherches.</p>
                  {embedStatus?.status === "running" && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: embedStatus.total ? `${Math.round((embedStatus.done / embedStatus.total) * 100)}%` : "0%" }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{embedStatus.done.toLocaleString()} / {embedStatus.total.toLocaleString()} datasets traités</p>
                    </div>
                  )}
                  {embedStatus?.status === "done" && embedStatus.last_run && (
                    <p className="text-xs text-green-600 mt-1">Complété le {new Date(embedStatus.last_run).toLocaleString("fr-FR")}</p>
                  )}
                  {embedStatus?.error && (
                    <p className="text-xs text-red-500 mt-1">Erreur : {embedStatus.error}</p>
                  )}
                  {embedMsg && <p className="text-xs text-blue-600 mt-1">{embedMsg}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {ds?.with_embeddings?.toLocaleString() ?? 0} / {ds?.total?.toLocaleString() ?? 0} embeddings générés
                  </p>
                </div>
                <button
                  onClick={launchEmbeddings}
                  disabled={embedStatus?.status === "running"}
                  className="w-full sm:w-auto flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {embedStatus?.status === "running" ? "En cours…" : "Générer"}
                </button>
              </div>
            </div>

            {/* Stats datasets */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">État de la base de données</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[
                  { label: "Total datasets", val: ds?.total },
                  { label: "Sources", val: ds?.sources },
                  { label: "Pays", val: ds?.countries },
                  { label: "Avec embeddings", val: ds?.with_embeddings },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-[#C1440E]">{item.val?.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
