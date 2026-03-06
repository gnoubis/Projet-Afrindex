/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terracotta / Orange africain
        terra: {
          50:  "#FFF4EE",
          100: "#FFE3D0",
          200: "#FFC4A0",
          400: "#F48C06",
          500: "#E85D04",
          600: "#C44A02",
          700: "#9C3A00",
        },
        // Or africain
        gold: {
          300: "#FFD166",
          400: "#F4A417",
          500: "#D4AF37",
        },
        // Vert savane
        savane: {
          400: "#52B788",
          500: "#40916C",
          600: "#2D6A4F",
          800: "#1B4332",
        },
        // Terre / fond
        earth: {
          50:  "#F0EBE3",
          100: "#E5DDD3",
          200: "#D4C5B0",
          800: "#3D2B1F",
          900: "#241408",
        },
        ink: "#1A1A2E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,.08), 0 1px 2px -1px rgba(0,0,0,.06)",
        "card-hover": "0 8px 24px -4px rgba(0,0,0,.12), 0 2px 8px -2px rgba(0,0,0,.08)",
        search: "0 2px 12px 0 rgba(232,93,4,.18)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
