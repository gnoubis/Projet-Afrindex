import Link from "next/link";
import { ExternalLink, MapPin, Tag } from "lucide-react";

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
  CSV:   "bg-savane-400/10 text-savane-600 border-savane-400/20",
  JSON:  "bg-blue-50 text-blue-600 border-blue-100",
  API:   "bg-purple-50 text-purple-600 border-purple-100",
  XLSX:  "bg-emerald-50 text-emerald-600 border-emerald-100",
  EXCEL: "bg-emerald-50 text-emerald-600 border-emerald-100",
  PDF:   "bg-red-50 text-red-500 border-red-100",
};

function buildBadgeUrl(filterKey: string, filterValue: string): string {
  const params = new URLSearchParams();
  params.set(filterKey, filterValue);
  return `/search?${params.toString()}`;
}

export default function DatasetCard({ dataset }: DatasetCardProps) {
  const fmtColor =
    dataset.format
      ? (FORMAT_COLORS[dataset.format.toUpperCase()] ?? "bg-earth-100 text-earth-800/60 border-earth-200")
      : "";

  return (
    <div className="group relative bg-white border border-earth-200 rounded-2xl overflow-hidden hover:border-terra-200 hover:shadow-lg transition-all duration-200">
      {/* Barre ambrée gauche au hover */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-terra-500 origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-[420ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] rounded-l-2xl" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/dataset/${dataset.id}`}
              className="font-dm text-[15px] font-semibold text-ash-800 hover:text-terra-500 transition-colors line-clamp-2 leading-snug block"
            >
              {dataset.title}
            </Link>
            {dataset.description && (
              <p className="font-dm text-sm mt-1.5 line-clamp-2 leading-relaxed" style={{ color: "rgba(44,55,64,0.55)" }}>
                {dataset.description}
              </p>
            )}
          </div>

          {dataset.source_url && (
            <a
              href={dataset.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1.5 text-earth-200 hover:text-terra-500 transition-colors"
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
              className="inline-flex items-center text-[11px] font-dm font-semibold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              {dataset.source}
            </Link>
          )}
          {dataset.country && (
            <Link
              href={buildBadgeUrl("country", dataset.country)}
              className="inline-flex items-center gap-1 text-[11px] font-dm font-semibold bg-savane-400/10 text-savane-600 px-2.5 py-0.5 rounded-full border border-savane-400/20 hover:bg-savane-400/20 transition-colors"
            >
              <MapPin className="w-2.5 h-2.5" /> {dataset.country}
            </Link>
          )}
          {dataset.category && (
            <Link
              href={buildBadgeUrl("category", dataset.category)}
              className="inline-flex items-center text-[11px] font-dm font-semibold bg-terra-50 text-terra-600 px-2.5 py-0.5 rounded-full border border-terra-100 hover:bg-terra-100 transition-colors"
            >
              {dataset.category}
            </Link>
          )}
          {dataset.format && (
            <Link
              href={buildBadgeUrl("format", dataset.format)}
              className={`inline-flex items-center text-[11px] font-dm font-semibold px-2.5 py-0.5 rounded-full border hover:opacity-75 transition-opacity ${fmtColor}`}
            >
              {dataset.format}
            </Link>
          )}
          {dataset.tags?.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={buildBadgeUrl("q", tag)}
              className="inline-flex items-center gap-0.5 text-[11px] font-dm text-earth-800/50 bg-earth-100 px-2.5 py-0.5 rounded-full hover:bg-terra-50 hover:text-terra-600 transition-colors"
            >
              <Tag className="w-2.5 h-2.5" /> {tag}
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-earth-100 pt-3">
          <Link
            href={`/dataset/${dataset.id}`}
            className="font-dm font-semibold uppercase tracking-[0.15em] hover:text-terra-500 transition-colors"
            style={{ fontSize: "9px", color: "rgba(44,55,64,0.4)" }}
          >
            Voir les détails
          </Link>
          <Link
            href={`/dataset/${dataset.id}#reviews`}
            className="font-dm font-bold uppercase tracking-[0.18em] text-terra-500 hover:text-terra-700 transition-colors"
            style={{ fontSize: "9px" }}
          >
            Donner un avis →
          </Link>
        </div>
      </div>
    </div>
  );
}
