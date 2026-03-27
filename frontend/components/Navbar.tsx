import Link from "next/link";
import { Globe2 } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-earth-50/80 backdrop-blur-sm border-b border-earth-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Globe2 className="w-5 h-5 text-terra-500" strokeWidth={1.5} />
          <span
            className="font-display font-bold text-base sm:text-lg tracking-tight gradient-text"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            Afrindex
          </span>
        </Link>
      </div>
    </nav>
  );
}
