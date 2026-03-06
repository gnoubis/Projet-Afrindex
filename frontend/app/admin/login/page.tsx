"use client";
import {
  useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";

// ── Identifiants admin ─────────────────────────────────────────────────────
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "afrindex2024";
const SESSION_KEY = "afrindex_admin_auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, "1");
        router.replace("/admin");
      } else {
        setError(true);
        setLoading(false);
        setPassword("");
      }
    }, 400);
  }

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
      hasError
        ? "border-red-400 ring-2 ring-red-100 bg-red-50"
        : "border-earth-300 focus:border-terra-400 focus:ring-2 focus:ring-terra-100"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-50 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Globe2 className="w-14 h-14 mx-auto mb-3 text-terra-500" strokeWidth={1.25} />
          <h1
            className="mt-3 text-2xl font-bold gradient-text"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            Afrindex Admin
          </h1>
          <p className="mt-1 text-sm text-earth-500">Accès réservé aux administrateurs</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-card border border-earth-200 p-8 flex flex-col gap-4"
        >
          {/* Nom d'utilisateur */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-earth-700">
              Nom d'utilisateur
            </label>
            <input
              id="username"
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(false); }}
              placeholder="admin"
              className={inputClass(error)}
            />
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-earth-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="••••••••"
              className={inputClass(error)}
            />
          </div>

          {/* Message d'erreur */}
          {error && (
            <p className="text-xs text-red-500 -mt-1">
              Nom d'utilisateur ou mot de passe incorrect.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-1 w-full py-2.5 bg-terra-500 hover:bg-terra-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-earth-400 mt-6">
          <a href="/" className="hover:text-terra-500 transition-colors">← Retour à l'accueil</a>
        </p>
      </div>
    </div>
  );
}
