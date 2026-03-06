"""Public endpoint: soumettre et consulter les avis sur les datasets."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.database import get_db

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    dataset_id: str | None = None
    dataset_title: str | None = None
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None
    author: str | None = None


@router.post("")
async def create_review(body: ReviewCreate, db: AsyncSession = Depends(get_db)):
    await db.execute(
        text(
            "INSERT INTO reviews (dataset_id, dataset_title, rating, comment, author) "
            "VALUES (:dataset_id, :dataset_title, :rating, :comment, :author)"
        ),
        {
            "dataset_id": body.dataset_id,
            "dataset_title": body.dataset_title,
            "rating": body.rating,
            "comment": body.comment,
            "author": body.author or "Anonyme",
        },
    )
    await db.commit()
    return {"success": True}


@router.get("/dataset/{dataset_id}")
async def get_dataset_reviews(dataset_id: str, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            text(
                "SELECT id, rating, comment, author, created_at FROM reviews "
                "WHERE dataset_id = :id ORDER BY created_at DESC LIMIT 20"
            ),
            {"id": dataset_id},
        )
    ).mappings().all()
    return [dict(r) for r in rows]
