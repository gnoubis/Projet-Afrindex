import logging
import math
import re
from typing import Optional, Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.embeddings import generate_embedding


def _clean(row: dict) -> dict:
    """Remplace NaN/Inf dans le score par 0."""
    d = dict(row)
    s = d.get("score")
    if s is not None and isinstance(s, float) and (math.isnan(s) or math.isinf(s)):
        d["score"] = 0.0
    return d


def _ilike_clause(tokens: list[str], filter_parts: list[str]) -> tuple[str, str, dict]:
    """
    Construit un WHERE/AND clause ILIKE pour chaque token.
    Chaque token doit apparaître dans (title OR description OR tags).
    Retourne (where_clause, score_expr, extra_params).
    """
    conditions = []
    score_parts = []
    extra: dict = {}
    for i, tok in enumerate(tokens):
        k = f"tok{i}"
        extra[k] = f"%{tok}%"
        cond = (
            f"(LOWER(d.title) LIKE :{k} OR "
            f"LOWER(d.description) LIKE :{k} OR "
            f"LOWER(array_to_string(d.tags, ' ')) LIKE :{k})"
        )
        conditions.append(cond)
        # Bonus si le token est dans le titre
        score_parts.append(f"(CASE WHEN LOWER(d.title) LIKE :{k} THEN 0.6 ELSE 0.3 END)")

    all_conds = " AND ".join(conditions)
    score_expr = " + ".join(score_parts) if score_parts else "0.3"

    if filter_parts:
        where = "WHERE " + " AND ".join(filter_parts) + " AND " + all_conds
    else:
        where = "WHERE " + all_conds

    return where, score_expr, extra

log = logging.getLogger(__name__)

SEMANTIC_WEIGHT = 0.70
FTS_WEIGHT = 0.30

# Traductions FR → EN pour les termes fréquents du développement africain
_FR_EN: dict[str, str] = {
    "sante": "health", "santé": "health",
    "eau": "water", "potable": "drinking water",
    "agriculture": "agriculture", "agricole": "agriculture",
    "éducation": "education", "education": "education", "scolaire": "school",
    "pauvreté": "poverty", "pauvrete": "poverty",
    "sécurité": "security", "securite": "security",
    "alimentaire": "food", "nourriture": "food",
    "enfant": "child", "enfants": "children",
    "femme": "women", "femmes": "women", "genre": "gender",
    "revenu": "income", "économie": "economy", "economie": "economy",
    "transport": "transport", "route": "road",
    "électricité": "electricity", "electricite": "electricity", "energie": "energy", "énergie": "energy",
    "population": "population", "démographie": "demographic", "demographie": "demographic",
    "climat": "climate", "environnement": "environment",
    "conflit": "conflict", "humanitarian": "humanitarian", "humanitaire": "humanitarian",
    "réfugié": "refugee", "refugie": "refugee", "réfugiés": "refugees",
    "marché": "market", "marche": "market",
    "emploi": "employment", "travail": "labor",
    "terre": "land", "sol": "soil",
    "forêt": "forest", "foret": "forest",
    "pêche": "fishing", "peche": "fishing",
    "elevage": "livestock", "élevage": "livestock",
    "migration": "migration", "deplacement": "displacement",
    "nutrition": "nutrition", "malnutrition": "malnutrition",
    "mortalite": "mortality", "mortalité": "mortality",
    "vaccination": "vaccination", "maladie": "disease",
    "gouvernance": "governance", "gouvernement": "government",
    "finances": "finance", "budget": "budget", "dette": "debt",
}


def _translate_query(q: str) -> str:
    """Traduit les termes français en anglais si possible."""
    words = q.lower().split()
    translated = [_FR_EN.get(w, w) for w in words]
    result = " ".join(translated)
    return result if result != q.lower() else q


async def hybrid_search(
    db: AsyncSession,
    query: str,
    country: Optional[str] = None,
    category: Optional[str] = None,
    format_: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[int, list[dict]]:
    """
    Recherche hybride : 70 % sémantique (pgvector cosine) + 30 % full-text (PostgreSQL FTS).
    Si l'embedding échoue, bascule automatiquement en FTS seul.
    """
    embedding_str: Optional[str] = None
    clean_query = (query or "").strip().strip("*").strip()
    translated_query = _translate_query(clean_query) if clean_query else clean_query

    if clean_query:
        try:
            embedding = await generate_embedding(clean_query)
            if embedding is None and translated_query != clean_query:
                # Mot français sans match vocab → essaie la version traduite
                embedding = await generate_embedding(translated_query)
            if embedding is not None:
                embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
        except Exception as exc:
            log.warning("Embedding generation failed, falling back to ILIKE: %s", exc)

    # Filtres dynamiques sur d.*
    filter_parts = []
    params: dict = {"query": translated_query, "limit": limit, "offset": offset}

    if country:
        filter_parts.append("LOWER(d.country) LIKE LOWER(:country)")
        params["country"] = f"%{country}%"
    if category:
        filter_parts.append("TRIM(LOWER(d.category)) LIKE TRIM(LOWER(:category))")
        params["category"] = category
    if format_:
        filter_parts.append("LOWER(d.format) = LOWER(:format)")
        params["format"] = format_
    if source:
        filter_parts.append("LOWER(d.source) LIKE LOWER(:source)")
        params["source"] = f"%{source}%"

    where_d = ("WHERE " + " AND ".join(filter_parts)) if filter_parts else ""
    and_d   = ("AND "   + " AND ".join(filter_parts)) if filter_parts else ""

    if embedding_str:
        # ── Recherche hybride sémantique + FTS ──────────────────────────────
        params.update({"embedding": embedding_str, "sem_w": SEMANTIC_WEIGHT, "fts_w": FTS_WEIGHT,
                        "min_score": 0.01})

        sql = text(f"""
            WITH sem AS (
                SELECT id,
                       1 - (embedding <=> CAST(:embedding AS vector)) AS sem_score
                FROM datasets
                WHERE embedding IS NOT NULL
            ),
            fts AS (
                SELECT id,
                       ts_rank_cd(
                           to_tsvector('simple',
                               COALESCE(title,'') || ' ' ||
                               COALESCE(description,'') || ' ' ||
                               COALESCE(array_to_string(tags,' '),'')),
                           plainto_tsquery('simple', :query)
                       ) AS fts_score
                FROM datasets
            ),
            scored AS (
                SELECT
                    d.id, d.title, d.description, d.source, d.source_url,
                    d.country, d.category, d.format, d.last_updated, d.tags, d.created_at,
                    COALESCE(CASE WHEN sem.sem_score = 'NaN'::float OR sem.sem_score = 'Infinity'::float
                                  THEN NULL ELSE sem.sem_score END, 0) * :sem_w
                    + COALESCE(fts.fts_score, 0) * :fts_w AS score
                FROM datasets d
                LEFT JOIN sem ON sem.id = d.id
                LEFT JOIN fts ON fts.id = d.id
                {where_d}
            ),
            relevant AS (
                SELECT * FROM scored WHERE score >= :min_score
            )
            SELECT
                COUNT(*) OVER() AS total_count,
                id, title, description, source, source_url,
                country, category, format, last_updated, tags, created_at, score
            FROM relevant
            ORDER BY score DESC, created_at DESC
            LIMIT :limit OFFSET :offset
        """)

    else:
        # ── ILIKE fallback : fonctionne pour tout mot FR/EN/abréviation ─────
        # Tokenise la requête et cherche chaque mot par sous-chaîne.
        # "culture" → matche "agriculture", "cultural", etc.
        # Tokenise les deux versions (originale + traduite) pour plus de coverage
        orig_tokens = [t.lower() for t in re.split(r"\s+", clean_query.strip()) if len(t) >= 2]
        trans_tokens = [t.lower() for t in re.split(r"\s+", translated_query.strip()) if len(t) >= 2]
        # Déduplique tout en gardant l'ordre : traduits en premier (plus précis)
        seen: set = set()
        tokens: list[str] = []
        for t in trans_tokens + orig_tokens:
            if t not in seen:
                seen.add(t)
                tokens.append(t)

        if not tokens:
            # Requête vide → tous les datasets, triés par date
            sql = text(f"""
                SELECT COUNT(*) OVER() AS total_count,
                    d.id, d.title, d.description, d.source, d.source_url,
                    d.country, d.category, d.format, d.last_updated, d.tags, d.created_at,
                    0.0::float AS score
                FROM datasets d {where_d}
                ORDER BY d.created_at DESC
                LIMIT :limit OFFSET :offset
            """)
        else:
            ilike_where, score_expr, tok_params = _ilike_clause(tokens, filter_parts)
            params.update(tok_params)
            sql = text(f"""
                WITH ilike_matches AS (
                    SELECT
                        d.id, d.title, d.description, d.source, d.source_url,
                        d.country, d.category, d.format, d.last_updated, d.tags, d.created_at,
                        ({score_expr})::float AS score
                    FROM datasets d
                    {ilike_where}
                )
                SELECT COUNT(*) OVER() AS total_count, *
                FROM ilike_matches
                ORDER BY score DESC, created_at DESC
                LIMIT :limit OFFSET :offset
            """)

    result = await db.execute(sql, params)
    rows = result.mappings().all()
    total = int(rows[0]["total_count"]) if rows else 0
    return total, [_clean({k: v for k, v in r.items() if k != "total_count"}) for r in rows]


async def similar_datasets(
    db: AsyncSession,
    dataset_id: str,
    limit: int = 6,
) -> list[dict]:
    """Retourne les datasets les plus similaires à un dataset donné (cosine similarity)."""
    sql = text("""
        SELECT
            d.id, d.title, d.description, d.source, d.country, d.category, d.format,
            1 - (d.embedding <=> ref.embedding) AS score
        FROM datasets d
        CROSS JOIN (SELECT embedding FROM datasets WHERE id = :id) ref
        WHERE d.id != :id AND d.embedding IS NOT NULL
        ORDER BY score DESC
        LIMIT :limit
    """)
    result = await db.execute(sql, {"id": dataset_id, "limit": limit})
    return [dict(r) for r in result.mappings().all()]
