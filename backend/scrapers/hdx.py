"""
Scraper HDX (Humanitarian Data Exchange) — CKAN API.
Indexe les datasets africains de data.humdata.org.
"""
import hashlib
import httpx
from db.database import AsyncSessionLocal
from db.models import Dataset
from services.embeddings import generate_embedding
from tenacity import retry, stop_after_attempt, wait_exponential

HDX_API = "https://data.humdata.org/api/3/action"

AFRICAN_COUNTRIES = [
    ("Cameroon",     "Cameroun"),
    ("Nigeria",      "Nigeria"),
    ("Senegal",      "Sénégal"),
    ("Ghana",        "Ghana"),
    ("Kenya",        "Kenya"),
    ("Ethiopia",     "Éthiopie"),
    ("Tanzania",     "Tanzanie"),
    ("South Africa", "Afrique du Sud"),
    ("Morocco",      "Maroc"),
    ("Mali",         "Mali"),
    ("Niger",        "Niger"),
    ("Chad",         "Tchad"),
    ("Congo",        "Congo"),
    ("Mozambique",   "Mozambique"),
    ("Uganda",       "Ouganda"),
]


class HDXScraper:
    async def run(self):
        datasets = await self._fetch_datasets()
        await self._upsert(datasets)
        print(f"[HDX] {len(datasets)} datasets indexés.")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def _fetch_datasets(self) -> list[dict]:
        results = []
        seen_ids: set[str] = set()
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            for country_en, country_fr in AFRICAN_COUNTRIES:
                start = 0
                while True:
                    params = {
                        "q": country_en,
                        "rows": 100,
                        "start": start,
                        "sort": "metadata_modified desc",
                    }
                    resp = await client.get(f"{HDX_API}/package_search", params=params)
                    if resp.status_code != 200:
                        break
                    data = resp.json()
                    result = data.get("result", {})
                    packages = result.get("results", []) if isinstance(result, dict) else []
                    total = result.get("count", 0) if isinstance(result, dict) else 0
                    for pkg in packages:
                        pkg_name = pkg.get("name", "")
                        if pkg_name and pkg_name not in seen_ids:
                            seen_ids.add(pkg_name)
                            results.append(self._map(pkg, country_fr))
                    start += len(packages)
                    if start >= min(total, 200) or len(packages) == 0:
                        break
        return results

    def _map(self, pkg: dict, country: str) -> dict:
        resources = pkg.get("resources", [])
        formats = list({r.get("format", "").upper() for r in resources if r.get("format")})
        org = pkg.get("organization") or {}
        return {
            "id": hashlib.md5(f"hdx-{pkg.get('name', '')}".encode()).hexdigest(),
            "title": pkg.get("title", ""),
            "description": (pkg.get("notes", "") or pkg.get("title", ""))[:1000],
            "source": org.get("title", "HDX"),
            "source_url": f"https://data.humdata.org/dataset/{pkg.get('name', '')}",
            "country": country,
            "category": "Humanitaire",
            "format": ", ".join(formats[:4]) if formats else "Inconnu",
            "tags": [t.get("name", "") for t in pkg.get("tags", []) if t.get("name")][:10],
        }

    async def _upsert(self, datasets: list[dict]):
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        async with AsyncSessionLocal() as session:
            for d in datasets:
                if not d["title"]:
                    continue
                text_for_embedding = f"{d['title']} {d.get('description', '')[:400]} {' '.join(d.get('tags', []))}"
                try:
                    embedding = await generate_embedding(text_for_embedding)
                except Exception:
                    embedding = None

                stmt = pg_insert(Dataset).values(
                    id=d["id"],
                    title=d["title"],
                    description=d["description"],
                    source=d["source"],
                    source_url=d["source_url"],
                    country=d["country"],
                    category=d["category"],
                    format=d["format"],
                    tags=d["tags"],
                    embedding=embedding,
                ).on_conflict_do_update(
                    index_elements=["id"],
                    set_={
                        "title": d["title"],
                        "description": d["description"],
                        "source_url": d["source_url"],
                        "tags": d["tags"],
                        "embedding": embedding,
                    },
                )
                await session.execute(stmt)
            await session.commit()
