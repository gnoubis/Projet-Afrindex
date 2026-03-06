from fastapi import APIRouter, Depends
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Dataset

router = APIRouter()

CATEGORIES = [
    "Santé", "Agriculture", "Finance", "Éducation",
    "Environnement", "Démographie", "Énergie", "Transport",
    "Gouvernance", "Technologie",
]

COUNTRIES = [
    "Cameroun", "Nigeria", "Sénégal", "Côte d'Ivoire", "Ghana",
    "Kenya", "Éthiopie", "Tanzanie", "Afrique du Sud", "Maroc",
]


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Dataset.category, func.count(Dataset.id).label("count"))
        .where(Dataset.category.isnot(None))
        .group_by(Dataset.category)
        .order_by(func.count(Dataset.id).desc())
    )
    rows = result.all()
    return [{"name": r.category.strip(), "count": r.count} for r in rows]


@router.get("/countries")
async def get_countries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(distinct(Dataset.country))
        .where(Dataset.country.isnot(None))
        .order_by(Dataset.country)
    )
    return [r[0] for r in result.all()]


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    total = await db.execute(select(func.count()).select_from(Dataset))
    sources = await db.execute(
        select(func.count(distinct(Dataset.source))).select_from(Dataset)
    )
    countries = await db.execute(
        select(func.count(distinct(Dataset.country))).select_from(Dataset)
    )
    return {
        "total_datasets": total.scalar(),
        "total_sources": sources.scalar(),
        "total_countries": countries.scalar(),
    }
