"""
Initialise les sources par défaut (HDX + WorldBank) dans la table data_sources.
Idempotent : vérifie si les sources existent déjà.

Usage (depuis le conteneur backend) :
    python3 /app/scripts/seed_sources.py
"""
import asyncio
import sys
import os

sys.path.insert(0, "/app")
os.chdir("/app")

import json
from db.database import AsyncSessionLocal
from db.models import DataSource
from sqlalchemy import select


DEFAULT_SOURCES = [
    {
        "name": "HDX — Humanitarian Data Exchange",
        "source_type": "ckan",
        "base_url": "https://data.humdata.org/api/3/action",
        "countries": json.dumps([
            "Cameroon", "Nigeria", "Senegal", "Ghana", "Kenya",
            "Ethiopia", "Tanzania", "South Africa", "Morocco", "Mali",
            "Niger", "Chad", "Congo", "Mozambique", "Uganda",
        ]),
        "default_category": "Humanitaire",
        "description": "Portail de données humanitaires géré par OCHA. "
                       "Contient des milliers de datasets africains.",
        "active": True,
    },
    {
        "name": "World Bank Open Data",
        "source_type": "worldbank",
        "base_url": "https://api.worldbank.org/v2",
        "countries": json.dumps([]),
        "default_category": "Économie",
        "description": "Indicateurs économiques mondiaux de la Banque Mondiale.",
        "active": True,
    },
    {
        "name": "Open Africa",
        "source_type": "ckan",
        "base_url": "https://open.africa/api/3/action",
        "countries": json.dumps([]),
        "default_category": "Gouvernance",
        "description": "Portail CKAN pan-africain. Données ouvertes de plusieurs "
                       "pays africains.",
        "active": False,  # désactivé par défaut, à activer manuellement
    },
]


async def seed():
    async with AsyncSessionLocal() as session:
        for src in DEFAULT_SOURCES:
            existing = await session.execute(
                select(DataSource).where(DataSource.base_url == src["base_url"])
            )
            if existing.scalar_one_or_none() is not None:
                print(f"[seed] Déjà présent : {src['name']}")
                continue
            session.add(DataSource(**src))
            print(f"[seed] Ajouté : {src['name']}")
        await session.commit()
    print("[seed] Terminé.")


if __name__ == "__main__":
    asyncio.run(seed())
