"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ExternalLink, Tag, ArrowLeft, MapPin, Calendar, CheckCircle, Star, MessageSquarePlus, Users, SearchX } from "lucide-react";
import Link from "next/link";
import { fetchDataset, submitReview, fetchDatasetReviews } from "@/lib/api";
import DatasetCard from "@/components/DatasetCard";
import { useState } from "react";

// ── Étoiles en lecture seule ──────────────────────────────────────────────
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

// ── Section complète Avis ─────────────────────────────────────────────────
function ReviewSection({ datasetId, datasetTitle }: { datasetId: string; datasetTitle: string }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [author, setAuthor] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["reviews", datasetId],
    queryFn: () => fetchDatasetReviews(datasetId),
  });

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setLoading(true);
    try {
      await submitReview({ dataset_id: datasetId, dataset_title: datasetTitle, rating, comment, author });
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ["reviews", datasetId] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="reviews" className="mt-6 space-y-4 scroll-mt-24">
      <div className="bg-gradient-to-r from-terra-500 to-terra-600 rounded-2xl p-5 shadow-md text-white">
        <p className="font-bold text-base leading-snug">Ce dataset vous a été utile ?</p>
        <p className="text-terra-100 text-sm mt-0.5">Votre avis est visible juste ici et aide les autres utilisateurs à choisir plus vite.</p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-terra-200 shadow-md p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-ink flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
            <MessageSquarePlus className="w-5 h-5 text-terra-500" strokeWidth={1.75} />
            Votre avis sur ce dataset
          </h3>
          {avgRating && (
            <div className="flex items-center gap-2 text-sm">
              <StarDisplay rating={Math.round(avgRating)} />
              <span className="font-bold text-ink">{avgRating}</span>
            </div>
          )}
        </div>

        {sent ? (
          <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Merci pour votre avis !</p>
              <p className="text-xs text-green-600/70 mt-0.5">Il est maintenant visible par la communauté.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-earth-800/50 uppercase tracking-wide mb-2">Votre note *</p>
              <div className="flex flex-wrap items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className={`transition-all hover:scale-110 ${
                      star <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-gray-200"
                    }`}
                  >
                    <Star className="w-8 h-8" strokeWidth={1.5} />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-sm font-medium text-earth-800/60 sm:ml-3">
                    {["", "Très mauvais", "Mauvais", "Correct", "Bon", "Excellent"][rating]}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-earth-800/50 uppercase tracking-wide">Votre nom</label>
                <input
                  type="text"
                  placeholder="Anonyme"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm bg-earth-50 focus:outline-none focus:ring-2 focus:ring-terra-200 focus:border-terra-400 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-earth-800/50 uppercase tracking-wide">Commentaire</label>
                <input
                  type="text"
                  placeholder="Qualité, utilité, accessibilité…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-earth-200 text-sm bg-earth-50 focus:outline-none focus:ring-2 focus:ring-terra-200 focus:border-terra-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!rating || loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-terra-500 text-white text-sm font-bold rounded-xl hover:bg-terra-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? "Envoi…" : "Publier mon avis"}
            </button>
          </form>
        )}
      </div>

      {/* ── Avis existants ── */}
      <div className="bg-white rounded-2xl border border-earth-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-ink flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
            <Users className="w-4 h-4 text-terra-500" strokeWidth={1.75} />
            Avis de la communauté
            {reviews.length > 0 && (
              <span className="text-sm font-normal text-earth-800/40">({reviews.length})</span>
            )}
          </h3>
          {avgRating && (
            <div className="flex items-center gap-2 text-sm">
              <StarDisplay rating={Math.round(avgRating)} />
              <span className="font-bold text-ink">{avgRating}</span>
              <span className="text-earth-800/40 text-xs">/ 5</span>
            </div>
          )}
        </div>

        {loadingReviews ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl border border-earth-100 p-4 animate-pulse">
                <div className="h-3 bg-earth-100 rounded-full w-1/4 mb-2" />
                <div className="h-3 bg-earth-100 rounded-full w-full" />
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-earth-100 bg-earth-50/50 p-4">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-terra-100 text-terra-600 flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                      {r.author?.[0] ?? "A"}
                    </div>
                    <span className="text-sm font-semibold text-ink">{r.author}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StarDisplay rating={r.rating} />
                    <span className="text-xs text-earth-800/40">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-earth-800/65 leading-relaxed pl-9">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-earth-800/40">
            <Star className="w-8 h-8 mx-auto mb-2 text-earth-200" strokeWidth={1.25} />
            <p className="text-sm">Aucun avis pour l'instant — soyez le premier !</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function DatasetPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dataset", id],
    queryFn: () => fetchDataset(id),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-earth-100 rounded-full w-1/2" />
          <div className="h-4 bg-earth-100 rounded-full w-full" />
          <div className="h-4 bg-earth-100 rounded-full w-5/6" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <SearchX className="w-12 h-12 text-earth-200 mx-auto mb-4" strokeWidth={1.25} />
        <p className="text-earth-800/60 font-medium">Dataset introuvable.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-terra-500 hover:text-terra-700 underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <Link
        href="/search"
        className="inline-flex items-center gap-2 text-sm text-earth-800/50 hover:text-terra-500 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux résultats
      </Link>

      {/* Carte principale */}
      <div className="bg-white rounded-2xl border border-earth-200 shadow-card p-5 sm:p-8 mb-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-5">
          <h1
            className="text-xl sm:text-2xl font-bold text-ink leading-snug"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            {data.title}
          </h1>
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto justify-center flex-shrink-0 flex items-center gap-2 bg-terra-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-terra-600 transition-all shadow-sm hover:shadow-search"
            >
              Accéder <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Métadonnées */}
        <div className="flex flex-wrap gap-2 mb-6">
          {data.source && (
            <span className="inline-flex items-center text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full">
              {data.source}
            </span>
          )}
          {data.country && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-savane-400/10 text-savane-600 border border-savane-400/20 px-3 py-1 rounded-full">
              <MapPin className="w-3 h-3" /> {data.country}
            </span>
          )}
          {data.category && (
            <span className="inline-flex items-center text-xs font-medium bg-terra-50 text-terra-600 border border-terra-100 px-3 py-1 rounded-full">
              {data.category}
            </span>
          )}
          {data.format && (
            <span className="inline-flex items-center text-xs font-medium bg-earth-100 text-earth-800/60 px-3 py-1 rounded-full">
              {data.format}
            </span>
          )}
          {data.last_updated && (
            <span className="inline-flex items-center gap-1 text-xs text-earth-800/40 px-3 py-1 rounded-full bg-earth-100">
              <Calendar className="w-3 h-3" /> {new Date(data.last_updated).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-sm sm:text-[15px] text-earth-800/70 leading-relaxed mb-6">{data.description}</p>
        )}

        {/* Divider */}
        {data.tags?.length > 0 && <hr className="border-earth-100 mb-4" />}

        {/* Tags */}
        {data.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-earth-800/40 font-medium self-center">Tags :</span>
            {data.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1 text-xs bg-earth-100 text-earth-800/60 px-3 py-1 rounded-full hover:bg-terra-50 hover:text-terra-600 transition-colors"
              >
                <Tag className="w-2.5 h-2.5" /> {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Section avis — placée juste après la carte principale */}
      <ReviewSection datasetId={data.id} datasetTitle={data.title} />

      {/* Datasets similaires */}
      {data.similar_datasets?.length > 0 && (
        <section className="mt-6">
          <h2
            className="text-lg font-bold text-ink mb-4"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            Datasets similaires
          </h2>
          <div className="grid gap-3">
            {data.similar_datasets.map((d: any) => (
              <DatasetCard key={d.id} dataset={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
