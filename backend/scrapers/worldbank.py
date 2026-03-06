"""
Scraper Banque Mondiale — World Bank Open Data API v2.
Indexe les indicateurs du développement africain (WDI + Africa Development Indicators).
"""
import hashlib
import httpx
from db.database import AsyncSessionLocal
from db.models import Dataset
from services.embeddings import generate_embedding
from tenacity import retry, stop_after_attempt, wait_exponential

AFRICAN_COUNTRIES_LABEL = [
    "Cameroon", "Nigeria", "Senegal", "Côte d'Ivoire", "Ghana",
    "Kenya", "Ethiopia", "Tanzania", "South Africa", "Morocco",
    "Tunisia", "Algeria", "Egypt", "Uganda", "Rwanda",
    "Benin", "Burkina Faso", "Mali", "Niger", "Chad",
]

# Sources World Bank qui contiennent des données africaines
WB_SOURCES = [
    ("2",  "World Development Indicators", "Économie"),
    ("11", "Africa Development Indicators",  "Développement"),
    ("57", "WDI Database Archives",          "Archive"),
]

WB_API = "https://api.worldbank.org/v2"


class WorldBankScraper:
    async def run(self):
        datasets = await self._fetch_datasets()
        await self._upsert(datasets)
        print(f"[WorldBank] {len(datasets)} datasets indexés.")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def _fetch_datasets(self) -> list[dict]:
        results = []
        async with httpx.AsyncClient(timeout=60) as client:
            for source_id, source_name, category in WB_SOURCES:
                page = 1
                while True:
                    url = f"{WB_API}/indicator"
                    params = {
                        "source": source_id,
                        "format": "json",
                        "per_page": 500,
                        "page": page,
                    }
                    resp = await client.get(url, params=params)
                    if resp.status_code != 200:
                        break
                    data = resp.json()
                    if not isinstance(data, list) or len(data) < 2 or not data[1]:
                        break
                    for item in data[1]:
                        results.append(self._map(item, source_name, category))
                    meta = data[0]
                    if page >= int(meta.get("pages", 1)):
                        break
                    page += 1
        return results

    def _map(self, item: dict, source_name: str, category: str) -> dict:
        ind_id = item.get("id", "")
        name = item.get("name", "") or item.get("sourceNote", "")
        topics = [t.get("value", "") for t in (item.get("topics") or []) if t.get("value")]
        return {
            "id": hashlib.md5(f"wb-{ind_id}".encode()).hexdigest(),
            "title": name,
            "description": item.get("sourceNote", "") or name,
            "source": f"Banque Mondiale — {source_name}",
            "source_url": f"https://data.worldbank.org/indicator/{ind_id}",
            "country": "Afrique (multi-pays)",
            "category": topics[0] if topics else category,
            "format": "API / CSV / Excel",
            "tags": ["worldbank", "afrique", ind_id.lower()] + [t.lower() for t in topics[:3]],
        }

    async def _upsert(self, datasets: list[dict]):
        async with AsyncSessionLocal() as session:
            for d in datasets:
                if not d["title"]:
                    continue
                text_for_embedding = f"{d['title']} {d.get('description', '')[:400]} {' '.join(d.get('tags', []))}"
                try:
                    embedding = await generate_embedding(text_for_embedding)
                except Exception:
                    embedding = None

                from sqlalchemy.dialects.postgresql import insert as pg_insert
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
                    set_={"title": d["title"], "description": d["description"],
                          "source_url": d["source_url"], "category": d["category"],
                          "tags": d["tags"], "embedding": embedding},
                )
                await session.execute(stmt)
            await session.commit()
