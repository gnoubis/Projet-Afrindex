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

const FORMAT_COLORS: Record<string, string> = {
  CSV:   "bg-savane-400/10 text-savane-600",
  JSON:  "bg-blue-50 text-blue-600",
  API:   "bg-purple-50 text-purple-600",
  Excel: "bg-emerald-50 text-emerald-600",
  PDF:   "bg-red-50 text-red-500",
};

export default function DatasetCard({ dataset }: { dataset: Dataset }) {
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
          <span className="inline-flex items-center text-[11px] font-medium bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-100">
            {dataset.source}
          </span>
        )}
        {dataset.country && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-savane-400/10 text-savane-600 px-2.5 py-0.5 rounded-full border border-savane-400/20">
            <MapPin className="w-2.5 h-2.5" /> {dataset.country}
          </span>
        )}
        {dataset.category && (
          <span className="inline-flex items-center text-[11px] font-medium bg-terra-50 text-terra-600 px-2.5 py-0.5 rounded-full border border-terra-100">
            {dataset.category}
          </span>
        )}
        {dataset.format && (
          <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full ${fmtColor}`}>
            {dataset.format}
          </span>
        )}
        {dataset.tags?.slice(0, 3).map((tag) => (
          <Link
            key={tag}
            href={`/search?q=${encodeURIComponent(tag)}`}
            className="inline-flex items-center gap-0.5 text-[11px] text-earth-800/50 bg-earth-100 px-2.5 py-0.5 rounded-full hover:bg-terra-50 hover:text-terra-600 transition-colors"
          >
            <Tag className="w-2.5 h-2.5" /> {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
