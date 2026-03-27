import Link from "next/link";
import { ExternalLink, MapPin, Tag, Star } from "lucide-react";

interface Dataset {
  id: string;
  title: string;
  description?: string;
  source?: string;
  country?: string;
  category?: string;
  format?: string;
  tags?: string[];
  source_url?: string;
  score?: number;
}

interface DatasetCardProps {
  dataset: Dataset;
  currentQuery?: string;
  currentFilters?: {
    country: string;
    category: string;
    format: string;
    source: string;
  };
}

const FORMAT_COLORS: Record<string, string> = {
  CSV:   "bg-savane-400/10 text-savane-600",
  JSON:  "bg-blue-50 text-blue-600",
  API:   "bg-purple-50 text-purple-600",
  Excel: "bg-emerald-50 text-emerald-600",
  PDF:   "bg-red-50 text-red-500",
};

/**
 * Construit une URL de recherche en appliquant UN SEUL filtre (badge cliqué)
 * Ne garde pas la requête précédente - filtre directement par le badge
 */
function buildBadgeUrl(filterKey: string, filterValue: string): string {
  const params = new URLSearchParams();
  params.set(filterKey, filterValue);
  return `/search?${params.toString()}`;
}

export default function DatasetCard({ dataset, currentQuery, currentFilters }: DatasetCardProps) {
  const fmtColor = dataset.format ? (FORMAT_COLORS[dataset.format.toUpperCase()] ?? "bg-earth-100 text-earth-800/60") : "";

  return (
    <div className="group bg-white rounded-2xl border border-earth-200 shadow-card hover:shadow-card-hover hover:border-terra-200 transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/dataset/${dataset.id}`}
            className="text-[15px] font-semibold text-ink hover:text-terra-500 transition-colors line-clamp-2 leading-snug"
          >
            {dataset.title}
          </Link>

          {dataset.description && (
            <p className="text-sm text-earth-800/55 mt-1.5 line-clamp-2 leading-relaxed">
              {dataset.description}
            </p>
          )}
        </div>

        {dataset.source_url && (
          <a
            href={dataset.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-1.5 rounded-full text-earth-200 hover:bg-terra-50 hover:text-terra-500 transition-all"
            title="Accéder à la source"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {dataset.source && (
          <Link
            href={buildBadgeUrl("source", dataset.source)}
            title="Source : filtrer par cette source de données"
            className="inline-flex items-center text-[11px] font-medium bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-100 hover:bg-blue-100 hover:text-blue-700 transition-all cursor-pointer"
          >
            {dataset.source}
          </Link>
        )}
        {dataset.country && (
          <Link
            href={buildBadgeUrl("country", dataset.country)}
            title="Pays : filtrer par ce pays"
            className="inline-flex items-center gap-1 text-[11px] font-medium bg-savane-400/10 text-savane-600 px-2.5 py-0.5 rounded-full border border-savane-400/20 hover:bg-savane-400/20 hover:text-savane-700 transition-all cursor-pointer"
          >
            <MapPin className="w-2.5 h-2.5" /> {dataset.country}
          </Link>
        )}
        {dataset.category && (
          <Link
            href={buildBadgeUrl("category", dataset.category)}
            title="Catégorie : filtrer par ce domaine"
            className="inline-flex items-center text-[11px] font-medium bg-terra-50 text-terra-600 px-2.5 py-0.5 rounded-full border border-terra-100 hover:bg-terra-100 hover:text-terra-700 transition-all cursor-pointer"
          >
            {dataset.category}
          </Link>
        )}
        {dataset.format && (
          <Link
            href={buildBadgeUrl("format", dataset.format)}
            title="Format : filtrer par ce format de fichier"
            className={`inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full cursor-pointer transition-all hover:opacity-75 ${fmtColor}`}
          >
            {dataset.format}
          </Link>
        )}
        {dataset.tags?.slice(0, 3).map((tag) => (
          <Link
            key={tag}
            href={buildBadgeUrl("q", tag)}
            title="Tag : rechercher ce mot-clé"
            className="inline-flex items-center gap-0.5 text-[11px] text-earth-800/50 bg-earth-100 px-2.5 py-0.5 rounded-full hover:bg-terra-50 hover:text-terra-600 transition-colors cursor-pointer"
          >
            <Tag className="w-2.5 h-2.5" /> {tag}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-earth-100 pt-3">
        <Link
          href={`/dataset/${dataset.id}`}
          className="text-xs font-medium text-earth-800/55 hover:text-terra-500 transition-colors"
        >
          Voir les détails
        </Link>
        <Link
          href={`/dataset/${dataset.id}#reviews`}
          className="inline-flex items-center gap-1.5 rounded-full bg-terra-50 px-3 py-1.5 text-xs font-semibold text-terra-600 hover:bg-terra-100 transition-colors"
        >
          <Star className="w-3.5 h-3.5" strokeWidth={1.75} />
          Donner un avis
        </Link>
      </div>
    </div>
  );
}
