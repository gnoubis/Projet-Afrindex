// Catégories correspondant exactement aux valeurs stockées en base
const CATEGORIES = [
  "Humanitaire",    // 4523 datasets
  "Archive",        // 881
  "Développement",  // 726
  "Health",         // 309
  "Economy & Growth", // 283
  "Gouvernance",    // 200
  "Education",      // 182
  "Environnement",  // ~68
];

const COUNTRIES = [
  "Cameroun", "Nigeria", "Sénégal", "Côte d'Ivoire", "Ghana",
  "Kenya", "Éthiopie", "Tanzanie", "Afrique du Sud", "Maroc",
  "Mali", "Niger", "Tchad", "Congo", "Ouganda",
];

// Formats : correspondent aux valeurs partielles présentes dans le champ
const FORMATS = ["CSV", "JSON", "XLSX", "Excel", "PDF", "API", "SHP", "GEOJSON"];

// Sources correspondant aux vraies valeurs indexées en base (via LIKE partiel)
const SOURCES = [
  "Banque Mondiale",   // ~3568 datasets (WDI + ADI + Archives)
  "World Bank Group",  // 919 datasets
  "UNHCR",             // 499 datasets
  "OpenStreetMap",     // 380 datasets (HOT)
  "FEWS NET",          // 162 datasets
  "FAO",               // 70 datasets
];

interface Filters {
  country: string;
  category: string;
  format: string;
  source: string;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (key: string, value: string) => void;
  dynamicSources?: string[];
}

import { X, MapPin, Tag, FileText, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function FilterPanel({ filters, onChange, dynamicSources }: FilterPanelProps) {
  const activeCount = Object.values(filters).filter(Boolean).length;
  const sourcesToShow = dynamicSources && dynamicSources.length > 0 ? dynamicSources : SOURCES;

  return (
    <div className="bg-white rounded-2xl border border-earth-200 shadow-card p-4 sm:p-5 space-y-5 lg:sticky lg:top-20">
      <div className="flex items-center justify-between">
        <h3
          className="font-bold text-ink"
          style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
        >
          Filtres
        </h3>
        {activeCount > 0 && (
          <button
            onClick={() => {
              onChange("country", "");
              onChange("category", "");
              onChange("format", "");
              onChange("source", "");
            }}
            className="text-xs text-terra-500 hover:text-terra-700 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Réinitialiser
          </button>
        )}
      </div>

      <FilterSection Icon={MapPin}   label="Pays / Région" options={COUNTRIES}      selected={filters.country}   onSelect={(v) => onChange("country", v)} />
      <FilterSection Icon={Tag}      label="Catégorie"   options={CATEGORIES}    selected={filters.category}  onSelect={(v) => onChange("category", v)} />
      <FilterSection Icon={FileText} label="Format"      options={FORMATS}      selected={filters.format}    onSelect={(v) => onChange("format", v)} />
      <FilterSection Icon={Landmark} label="Source"      options={sourcesToShow} selected={filters.source}    onSelect={(v) => onChange("source", v)} />
    </div>
  );
}

function FilterSection({
  Icon,
  label,
  options,
  selected,
  onSelect,
}: {
  Icon: LucideIcon;
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-earth-800/50 uppercase tracking-widest mb-2">
        <Icon className="w-3 h-3" strokeWidth={2} />
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(selected === opt ? "" : opt)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
              selected === opt
                ? "bg-terra-500 text-white border-terra-500 shadow-sm"
                : "bg-earth-50 text-earth-800/70 border-earth-200 hover:border-terra-300 hover:text-terra-600 hover:bg-terra-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
