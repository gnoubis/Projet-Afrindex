import uuid
from datetime import datetime
from typing import List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Text, DateTime, ARRAY, Integer, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    format: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_updated: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(384), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def __repr__(self) -> str:
        return f"<Dataset id={self.id} title={self.title!r}>"


class SearchLog(Base):
    """Enregistre chaque recherche effectuée."""
    __tablename__ = "search_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    query: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    results_count: Mapped[int] = mapped_column(Integer, default=0)
    country_filter: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    category_filter: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)


class Review(Base):
    """Avis des utilisateurs sur les datasets."""
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    dataset_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)


class DataSource(Base):
    """Sources de données configurées par l'administrateur."""
    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Type : "ckan" (HDX, portails gouvernementaux...) | "worldbank" | "csv_url"
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="ckan")
    base_url: Mapped[str] = mapped_column(String(2000), nullable=False)
    # Filtre pays : liste JSON ex. '["Kenya","Nigeria"]' — vide = tous les pays
    countries: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Catégorie par défaut assignée aux datasets de cette source
    default_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_run: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # idle|running|done|error
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    datasets_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
