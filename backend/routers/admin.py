"""Router Admin — statistiques, indexation, logs de recherche, avis."""
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

# État d'indexation gardé en mémoire (reset au redémarrage du backend)
_index_status: dict = {
    "worldbank": {"status": "idle", "last_run": None, "error": None},
    "hdx":       {"status": "idle", "last_run": None, "error": None},
}

# État du batch embedding
_embed_status: dict = {
    "status": "idle",   # idle | running | done | error
    "done": 0,
    "total": 0,
    "error": None,
    "last_run": None,
}


async def _run_batch_embeddings() -> None:
    """Génère les embeddings manquants pour tous les datasets, par lots de 100."""
    from services.embeddings import generate_embeddings_batch
    from db.database import AsyncSessionLocal

    _embed_status["status"] = "running"
    _embed_status["done"] = 0
    _embed_status["error"] = None

    BATCH = 100

    try:
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(text(
                "SELECT id, title, description, tags FROM datasets "
                "WHERE embedding IS NULL ORDER BY id"
            ))).mappings().all()

        _embed_status["total"] = len(rows)

        for i in range(0, len(rows), BATCH):
            chunk = rows[i: i + BATCH]
            texts = [
                f"{r['title']} {(r['description'] or '')[:400]} "
                f"{' '.join(r['tags'] or [])}"
                for r in chunk
            ]
            vectors = await generate_embeddings_batch(texts)

            async with AsyncSessionLocal() as db:
                for row, vec in zip(chunk, vectors):
                    await db.execute(
                        text("UPDATE datasets SET embedding = CAST(:v AS vector) WHERE id = :id"),
                        {"v": f"[{','.join(str(x) for x in vec)}]", "id": row["id"]},
                    )
                await db.commit()

            _embed_status["done"] += len(chunk)

        _embed_status["status"] = "done"
        _embed_status["last_run"] = datetime.utcnow().isoformat()

    except Exception as exc:
        _embed_status["status"] = "error"
        _embed_status["error"] = str(exc)


async def _run_scraper(source: str) -> None:
    _index_status[source]["status"] = "running"
    _index_status[source]["error"] = None
    try:
        if source == "worldbank":
            from scrapers.worldbank import WorldBankScraper
            await WorldBankScraper().run()
        else:
            from scrapers.hdx import HDXScraper
            await HDXScraper().run()
        _index_status[source]["status"] = "done"
        _index_status[source]["last_run"] = datetime.utcnow().isoformat()
    except Exception as exc:
        _index_status[source]["status"] = "error"
        _index_status[source]["error"] = str(exc)


# ── Statistiques globales ─────────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(db: AsyncSession = Depends(get_db)):
    def s(q, **kw):
        return db.execute(text(q), kw)

    total_ds       = (await db.execute(text("SELECT COUNT(*) FROM datasets"))).scalar()
    total_sources  = (await db.execute(text("SELECT COUNT(DISTINCT source) FROM datasets"))).scalar()
    total_countries= (await db.execute(text("SELECT COUNT(DISTINCT country) FROM datasets"))).scalar()
    with_emb       = (await db.execute(text("SELECT COUNT(*) FROM datasets WHERE embedding IS NOT NULL"))).scalar()

    total_searches = (await db.execute(text("SELECT COUNT(*) FROM search_logs"))).scalar()
    searches_today = (await db.execute(text(
        "SELECT COUNT(*) FROM search_logs WHERE created_at >= NOW() - INTERVAL '24 hours'"
    ))).scalar()
    searches_week  = (await db.execute(text(
        "SELECT COUNT(*) FROM search_logs WHERE created_at >= NOW() - INTERVAL '7 days'"
    ))).scalar()

    total_reviews  = (await db.execute(text("SELECT COUNT(*) FROM reviews"))).scalar()
    avg_rating     = (await db.execute(text("SELECT AVG(rating) FROM reviews"))).scalar()

    top_queries = (await db.execute(text(
        "SELECT query, COUNT(*) as cnt FROM search_logs "
        "WHERE created_at >= NOW() - INTERVAL '7 days' "
        "GROUP BY query ORDER BY cnt DESC LIMIT 10"
    ))).mappings().all()

    daily = (await db.execute(text(
        "SELECT DATE(created_at) as day, COUNT(*) as cnt FROM search_logs "
        "WHERE created_at >= NOW() - INTERVAL '14 days' "
        "GROUP BY day ORDER BY day"
    ))).mappings().all()

    by_country = (await db.execute(text(
        "SELECT country, COUNT(*) as cnt FROM datasets "
        "WHERE country IS NOT NULL GROUP BY country ORDER BY cnt DESC LIMIT 10"
    ))).mappings().all()

    by_category = (await db.execute(text(
        "SELECT category, COUNT(*) as cnt FROM datasets "
        "WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC LIMIT 8"
    ))).mappings().all()

    return {
        "datasets": {
            "total": total_ds,
            "sources": total_sources,
            "countries": total_countries,
            "with_embeddings": with_emb,
            "by_country":  [dict(r) for r in by_country],
            "by_category": [dict(r) for r in by_category],
        },
        "searches": {
            "total": total_searches,
            "today": searches_today,
            "this_week": searches_week,
            "top_queries": [dict(r) for r in top_queries],
            "daily": [{"day": str(r["day"]), "cnt": r["cnt"]} for r in daily],
        },
        "reviews": {
            "total": total_reviews,
            "avg_rating": round(float(avg_rating), 2) if avg_rating else None,
        },
        "indexation": _index_status,
    }


# ── Logs de recherche ─────────────────────────────────────────────────────────

@router.get("/search-logs")
async def search_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(text(
        "SELECT id, query, results_count, country_filter, category_filter, created_at "
        "FROM search_logs ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    ), {"limit": limit, "offset": offset})).mappings().all()
    total = (await db.execute(text("SELECT COUNT(*) FROM search_logs"))).scalar()
    return {"total": total, "logs": [dict(r) for r in rows]}


# ── Avis ──────────────────────────────────────────────────────────────────────

@router.get("/reviews")
async def get_reviews(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(text(
        "SELECT id, dataset_id, dataset_title, rating, comment, author, created_at "
        "FROM reviews ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    ), {"limit": limit, "offset": offset})).mappings().all()
    total = (await db.execute(text("SELECT COUNT(*) FROM reviews"))).scalar()
    return {"total": total, "reviews": [dict(r) for r in rows]}


@router.delete("/reviews/{review_id}")
async def delete_review(review_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM reviews WHERE id = :id"), {"id": review_id})
    await db.commit()
    return {"deleted": review_id}


# ── Indexation ────────────────────────────────────────────────────────────────

@router.get("/index/status")
async def index_status():
    return _index_status


@router.post("/index/{source}")
async def trigger_indexation(source: str, background_tasks: BackgroundTasks):
    if source not in ("worldbank", "hdx", "all"):
        return {"error": f"Source inconnue: {source}. Valeurs: worldbank, hdx, all"}
    sources = ["worldbank", "hdx"] if source == "all" else [source]
    for s in sources:
        if _index_status[s]["status"] == "running":
            return {"error": f"{s} est déjà en cours d'indexation"}
    for s in sources:
        background_tasks.add_task(_run_scraper, s)
    return {"message": f"Indexation lancée: {', '.join(sources)}", "sources": sources}


# ── Embeddings ────────────────────────────────────────────────────────────────

@router.get("/embed/status")
async def embed_status():
    return _embed_status


@router.post("/embed/all")
async def trigger_embeddings(background_tasks: BackgroundTasks):
    if _embed_status["status"] == "running":
        return {"error": "Génération d'embeddings déjà en cours"}
    background_tasks.add_task(_run_batch_embeddings)
    return {"message": "Génération des embeddings lancée en arrière-plan"}
