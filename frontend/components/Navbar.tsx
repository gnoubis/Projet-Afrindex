import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-earth-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="font-display text-terra-500 tracking-[0.1em] leading-none"
            style={{ fontSize: "22px" }}
          >
            AFRINDEX
          </span>
          <span
            className="hidden sm:block font-dm font-semibold uppercase text-earth-800/40 leading-none mt-px"
            style={{ fontSize: "9px", letterSpacing: "0.28em" }}
          >
            Données africaines
          </span>
        </Link>

        <Link
          href="/search"
          className="font-dm font-semibold uppercase text-earth-800/50 hover:text-terra-500 transition-colors"
          style={{ fontSize: "9px", letterSpacing: "0.25em" }}
        >
          Rechercher
        </Link>
      </div>
    </nav>
  );
}
