"""Router Admin — statistiques, indexation, sources, logs, avis."""
import json
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db, AsyncSessionLocal
from db.models import DataSource

router = APIRouter(prefix="/admin", tags=["admin"])

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


async def _run_source(source_id: int) -> None:
    """Exécute l'indexation pour une source identifiée par son id en base."""
    async with AsyncSessionLocal() as db:
        src = (await db.execute(select(DataSource).where(DataSource.id == source_id))).scalar_one_or_none()
    if not src:
        return
    try:
        countries: list[str] = json.loads(src.countries) if src.countries else []
    except Exception:
        countries = []
    if src.source_type == "ckan":
        from scrapers.ckan import CKANScraper
        await CKANScraper(
            source_id=src.id, base_url=src.base_url, name=src.name,
            countries=countries, default_category=src.default_category,
        ).run()
    elif src.source_type == "worldbank":
        async with AsyncSessionLocal() as db:
            await db.execute(text("UPDATE data_sources SET last_status='running', last_run=NOW() WHERE id=:id"), {"id": source_id})
            await db.commit()
        try:
            from scrapers.worldbank import WorldBankScraper
            await WorldBankScraper().run()
            async with AsyncSessionLocal() as db:
                await db.execute(text("UPDATE data_sources SET last_status='done' WHERE id=:id"), {"id": source_id})
                await db.commit()
        except Exception as exc:
            async with AsyncSessionLocal() as db:
                await db.execute(text("UPDATE data_sources SET last_status='error', last_error=:e WHERE id=:id"), {"id": source_id, "e": str(exc)[:500]})
                await db.commit()
    else:
        async with AsyncSessionLocal() as db:
            await db.execute(text("UPDATE data_sources SET last_status='error', last_error=:e WHERE id=:id"), {"id": source_id, "e": f"Type inconnu: {src.source_type}"})
            await db.commit()


class SourceCreate(BaseModel):
    name: str
    source_type: str = "ckan"
    base_url: str
    countries: list[str] = []
    default_category: str | None = None
    description: str | None = None
    active: bool = True


class SourceUpdate(BaseModel):
    name: str | None = None
    source_type: str | None = None
    base_url: str | None = None
    countries: list[str] | None = None
    default_category: str | None = None
    description: str | None = None
    active: bool | None = None


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
    }


# ═ Gestion sources ═════════════════════════════════════════════════════════════════════════════

def _serialize_source(src: DataSource) -> dict:
    return {
        "id": src.id,
        "name": src.name,
        "source_type": src.source_type,
        "base_url": src.base_url,
        "countries": json.loads(src.countries) if src.countries else [],
        "default_category": src.default_category,
        "description": src.description,
        "active": src.active,
        "last_run": src.last_run.isoformat() if src.last_run else None,
        "last_status": src.last_status or "idle",
        "last_error": src.last_error,
        "datasets_count": src.datasets_count,
        "created_at": src.created_at.isoformat() if src.created_at else None,
    }


@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(DataSource).order_by(DataSource.id))).scalars().all()
    return {"sources": [_serialize_source(s) for s in rows]}


@router.post("/sources", status_code=201)
async def create_source(body: SourceCreate, db: AsyncSession = Depends(get_db)):
    src = DataSource(
        name=body.name, source_type=body.source_type, base_url=body.base_url,
        countries=json.dumps(body.countries), default_category=body.default_category,
        description=body.description, active=body.active, last_status="idle",
    )
    db.add(src)
    await db.commit()
    await db.refresh(src)
    return _serialize_source(src)


@router.put("/sources/{source_id}")
async def update_source(source_id: int, body: SourceUpdate, db: AsyncSession = Depends(get_db)):
    src = (await db.execute(select(DataSource).where(DataSource.id == source_id))).scalar_one_or_none()
    if not src:
        raise HTTPException(404, f"Source {source_id} introuvable")
    if body.name is not None: src.name = body.name
    if body.source_type is not None: src.source_type = body.source_type
    if body.base_url is not None: src.base_url = body.base_url
    if body.countries is not None: src.countries = json.dumps(body.countries)
    if body.default_category is not None: src.default_category = body.default_category
    if body.description is not None: src.description = body.description
    if body.active is not None: src.active = body.active
    await db.commit()
    await db.refresh(src)
    return _serialize_source(src)


@router.delete("/sources/{source_id}")
async def remove_source(source_id: int, db: AsyncSession = Depends(get_db)):
    if not (await db.execute(select(DataSource).where(DataSource.id == source_id))).scalar_one_or_none():
        raise HTTPException(404, f"Source {source_id} introuvable")
    await db.execute(delete(DataSource).where(DataSource.id == source_id))
    await db.commit()
    return {"deleted": source_id}


@router.post("/sources/{source_id}/index")
async def index_source(source_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    src = (await db.execute(select(DataSource).where(DataSource.id == source_id))).scalar_one_or_none()
    if not src:
        raise HTTPException(404, f"Source {source_id} introuvable")
    if src.last_status == "running":
        raise HTTPException(409, f"'{src.name}' est déjà en cours d'indexation")
    background_tasks.add_task(_run_source, source_id)
    return {"message": f"Indexation lancée : {src.name}", "source_id": source_id}


@router.post("/sources/index-all")
async def index_all_sources(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(DataSource).where(DataSource.active == True))).scalars().all()
    launched = []
    for src in rows:
        if src.last_status != "running":
            background_tasks.add_task(_run_source, src.id)
            launched.append({"id": src.id, "name": src.name})
    return {"message": f"{len(launched)} sources lancées", "sources": launched}


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
