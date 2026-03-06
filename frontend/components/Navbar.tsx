import Link from "next/link";
import { Globe2 } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-earth-50/80 backdrop-blur-sm border-b border-earth-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Globe2 className="w-5 h-5 text-terra-500" strokeWidth={1.5} />
          <span
            className="font-display font-bold text-lg tracking-tight gradient-text"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            Afrindex
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className="px-4 py-2 rounded-full text-sm font-medium text-earth-800 hover:bg-terra-50 hover:text-terra-600 transition-all"
          >
            Explorer
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-earth-800 hover:bg-terra-50 hover:text-terra-600 transition-all"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.579.688.481C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            GitHub
          </a>
          <Link
            href="/search"
            className="ml-2 px-5 py-2 bg-terra-500 text-white text-sm font-semibold rounded-full hover:bg-terra-600 transition-all shadow-sm hover:shadow-md"
          >
            Chercher
          </Link>
        </div>
      </div>
    </nav>
  );
}
