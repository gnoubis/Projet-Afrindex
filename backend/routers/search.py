from typing import Optional

from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db
from services.search_service import hybrid_search

router = APIRouter()


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
    total, results = await hybrid_search(
        db=db,
        query=q,
        country=country,
        category=category,
        format_=format,
        source=source,
        limit=limit,
        offset=offset,
    )
    background_tasks.add_task(_log_search, db, q, total, country, category)
    return {"query": q, "total": total, "results": results}
