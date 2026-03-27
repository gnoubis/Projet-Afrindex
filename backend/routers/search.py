import re
from typing import Optional

from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from services.search_service import hybrid_search

router = APIRouter()


def _extract_tokens(query: str) -> list[str]:
    tokens = [t.lower() for t in re.split(r"\s+", (query or "").strip()) if len(t) >= 3]
    seen: set[str] = set()
    unique: list[str] = []
    for tok in tokens:
        if tok not in seen:
            seen.add(tok)
            unique.append(tok)
    return unique[:5]


def _dataset_card_payload(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "description": row.get("description"),
        "source": row.get("source"),
        "source_url": row.get("source_url"),
        "country": row.get("country"),
        "category": row.get("category"),
        "format": row.get("format"),
        "last_updated": row.get("last_updated").isoformat() if row.get("last_updated") else None,
        "tags": row.get("tags") or [],
        "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
        "score": row.get("score"),
    }


def _query_suggestion_candidates(rows: list[dict]) -> list[str]:
    suggestions: list[str] = []
    seen: set[str] = set()

    for row in rows:
        title = (row.get("title") or "").strip()
        country = (row.get("country") or "").strip()
        category = (row.get("category") or "").strip()

        candidates = [
            " ".join(title.split()[:3]) if title else "",
            f"{category} {country}".strip() if category and country and country.lower() != "global" else "",
            category if category else "",
            country if country and country.lower() != "global" else "",
        ]

        for candidate in candidates:
            candidate = candidate.strip()
            if len(candidate) >= 3 and candidate.lower() not in seen:
                seen.add(candidate.lower())
                suggestions.append(candidate)
            if len(suggestions) >= 6:
                return suggestions

    return suggestions


async def _build_no_result_suggestions(
    db: AsyncSession,
    query: str,
    country: Optional[str],
    category: Optional[str],
    format_: Optional[str],
    source: Optional[str],
) -> tuple[list[dict], list[str]]:
    filter_parts: list[str] = []
    params: dict = {}

    if country:
        filter_parts.append("LOWER(country) LIKE LOWER(:country)")
        params["country"] = f"%{country}%"
    if category:
        filter_parts.append("LOWER(category) LIKE LOWER(:category)")
        params["category"] = f"%{category}%"
    if format_:
        filter_parts.append("LOWER(format) LIKE LOWER(:format)")
        params["format"] = f"%{format_}%"
    if source:
        filter_parts.append("LOWER(source) LIKE LOWER(:source)")
        params["source"] = f"%{source}%"

    tokens = _extract_tokens(query)
    filter_sql = (" AND ".join(filter_parts)) if filter_parts else ""

    relaxed_rows: list[dict] = []

    if tokens:
        token_conditions = []
        score_parts = []
        for i, token in enumerate(tokens):
            key = f"tok{i}"
            params[key] = f"%{token}%"
            token_conditions.append(
                f"(LOWER(COALESCE(title, '')) LIKE :{key} OR "
                f"LOWER(COALESCE(description, '')) LIKE :{key} OR "
                f"LOWER(COALESCE(array_to_string(tags, ' '), '')) LIKE :{key})"
            )
            score_parts.append(
                f"CASE WHEN LOWER(COALESCE(title, '')) LIKE :{key} THEN 3 "
                f"WHEN LOWER(COALESCE(description, '')) LIKE :{key} THEN 2 "
                f"WHEN LOWER(COALESCE(array_to_string(tags, ' '), '')) LIKE :{key} THEN 1 "
                f"ELSE 0 END"
            )

        where_parts = list(filter_parts)
        where_parts.append("(" + " OR ".join(token_conditions) + ")")
        where_sql = "WHERE " + " AND ".join(where_parts)
        score_sql = " + ".join(score_parts)

        relaxed_sql = text(f"""
            SELECT
                id, title, description, source, source_url,
                country, category, format, last_updated, tags, created_at,
                ({score_sql})::float AS score
            FROM datasets
            {where_sql}
            ORDER BY score DESC, created_at DESC
            LIMIT 6
        """)
        relaxed_result = await db.execute(relaxed_sql, params)
        relaxed_rows = [dict(r) for r in relaxed_result.mappings().all()]

    if not relaxed_rows:
        fallback_where = f"WHERE {filter_sql}" if filter_sql else ""
        fallback_sql = text(f"""
            SELECT
                id, title, description, source, source_url,
                country, category, format, last_updated, tags, created_at,
                0.0::float AS score
            FROM datasets
            {fallback_where}
            ORDER BY created_at DESC
            LIMIT 6
        """)
        fallback_result = await db.execute(fallback_sql, params)
        relaxed_rows = [dict(r) for r in fallback_result.mappings().all()]

    queries = _query_suggestion_candidates(relaxed_rows)

    if len(queries) < 4:
        generic_sql = text("""
            SELECT title, country, category
            FROM datasets
            WHERE title IS NOT NULL AND title != ''
            ORDER BY RANDOM()
            LIMIT 6
        """)
        generic_result = await db.execute(generic_sql)
        generic_rows = [dict(r) for r in generic_result.mappings().all()]
        for suggestion in _query_suggestion_candidates(generic_rows):
            if suggestion.lower() not in {q.lower() for q in queries}:
                queries.append(suggestion)
            if len(queries) >= 6:
                break

    return ([_dataset_card_payload(row) for row in relaxed_rows], queries[:6])


async def _log_search(db: AsyncSession, query: str, results_count: int,
                      country: Optional[str], category: Optional[str]):
    try:
        await db.execute(
            text("INSERT INTO search_logs (query, results_count, country_filter, category_filter) "
                 "VALUES (:q, :rc, :co, :ca)"),
            {"q": query, "rc": results_count, "co": country, "ca": category},
        )
        await db.commit()
    except Exception:
        pass


@router.get("/suggestions")
async def get_suggestions(db: AsyncSession = Depends(get_db)):
    """
    Retourne 4 suggestions de recherche populaires basées sur les vraies données de la BD.
    Format : "titre court + pays" ou "catégorie + pays"
    """
    try:
        # Récupère 4 datasets random avec titre et pays bien remplis
        sql = text("""
            SELECT title, country, category
            FROM datasets
            WHERE title IS NOT NULL AND title != ''
              AND country IS NOT NULL AND country != '' AND country != 'global'
            ORDER BY RANDOM()
            LIMIT 4
        """)
        result = await db.execute(sql)
        datasets = [dict(r) for r in result.mappings().all()]
        
        suggestions = []
        for ds in datasets:
            # Construit une suggestion : "titre court + pays"
            title = ds.get("title", "").strip()
            country = ds.get("country", "").strip()
            
            # Prend les premiers 2-3 mots du titre
            title_short = " ".join(title.split()[:3]) if title else ""
            
            if title_short and country:
                suggestion = f"{title_short} {country}"
                suggestions.append(suggestion)
        
        # Si on a moins de 4 suggestions, on en complète avec des catégories
        if len(suggestions) < 4:
            sql2 = text("""
                SELECT DISTINCT country, category
                FROM datasets
                WHERE country IS NOT NULL AND country != '' AND country != 'global'
                  AND category IS NOT NULL AND category != ''
                ORDER BY RANDOM()
                LIMIT :limit
            """)
            result2 = await db.execute(sql2, {"limit": 4 - len(suggestions)})
            more_datasets = [dict(r) for r in result2.mappings().all()]
            for ds in more_datasets:
                category = ds.get("category", "").strip()
                country = ds.get("country", "").strip()
                if category and country:
                    suggestion = f"{category} {country}"
                    if suggestion not in suggestions:
                        suggestions.append(suggestion)
        
        return {"suggestions": suggestions[:4]}
    
    except Exception as e:
        # Fallback si erreur
        return {
            "suggestions": [
                "santé Afrique",
                "agriculture Sénégal",
                "éducation Nigeria",
                "environnement Kenya"
            ]
        }


@router.get("/search")
async def search(
    background_tasks: BackgroundTasks,
    q: str = Query("", description="Requête de recherche"),
    country: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    format: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    total, results, has_exact_matches = await hybrid_search(
        db=db,
        query=q,
        country=country,
        category=category,
        format_=format,
        source=source,
        limit=limit,
        offset=offset,
    )
    
    # Message explicite si pas de résultats exacts
    message = None
    if q and total > 0 and not has_exact_matches:
        message = f"⚠️ Aucun résultat exact pour « {q} ». Voici des résultats similaires qui pourraient vous intéresser :"

    alternative_datasets: list[dict] = []
    alternative_queries: list[str] = []
    if total == 0 or (q and total > 0 and not has_exact_matches):
        alternative_datasets, alternative_queries = await _build_no_result_suggestions(
            db=db,
            query=q,
            country=country,
            category=category,
            format_=format,
            source=source,
        )

    background_tasks.add_task(_log_search, db, q, total, country, category)
    return {
        "query": q,
        "total": total,
        "results": results,
        "has_exact_matches": has_exact_matches,
        "message": message,
        "alternative_queries": alternative_queries,
        "alternative_datasets": alternative_datasets if total == 0 else [],
    }
