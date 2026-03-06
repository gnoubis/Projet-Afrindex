from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Dataset
from services.search_service import similar_datasets

router = APIRouter()


@router.get("/datasets")
async def list_datasets(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count()).select_from(Dataset))
    total = total_result.scalar()

    result = await db.execute(
        select(Dataset).order_by(Dataset.created_at.desc()).limit(limit).offset(offset)
    )
    datasets = result.scalars().all()
    return {
        "total": total,
        "results": [_serialize(d) for d in datasets],
    }


@router.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset introuvable")

    similars = await similar_datasets(db, dataset_id)
    data = _serialize(dataset)
    data["similar_datasets"] = similars
    return data


@router.get("/datasets/{dataset_id}/similar")
async def get_similar(dataset_id: str, limit: int = 6, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dataset introuvable")
    return await similar_datasets(db, dataset_id, limit=limit)


def _serialize(d: Dataset) -> dict:
    return {
        "id": d.id,
        "title": d.title,
        "description": d.description,
        "source": d.source,
        "source_url": d.source_url,
        "country": d.country,
        "category": d.category,
        "format": d.format,
        "last_updated": d.last_updated.isoformat() if d.last_updated else None,
        "tags": d.tags or [],
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }
