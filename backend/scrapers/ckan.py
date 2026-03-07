"""
Scraper CKAN générique — compatible avec tout portail CKAN
(HDX, portails gouvernementaux africains, Open Africa, etc.)

Usage:
    scraper = CKANScraper(
        source_id=1,
        base_url="https://data.humdata.org/api/3/action",
        name="HDX",
        countries=["Kenya", "Nigeria", "Cameroon"],
        default_category="Humanitaire",
    )
    await scraper.run()
"""
import hashlib
import json
import httpx
from db.database import AsyncSessionLocal
from db.models import Dataset, DataSource
from services.embeddings import generate_embedding
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy import select, update
from datetime import datetime


class CKANScraper:
    """
    Scraper générique pour les portails CKAN.
    Paramétré par une ligne `DataSource` en base.
    """

    def __init__(
        self,
        source_id: int,
        base_url: str,
        name: str,
        countries: list[str] | None,
        default_category: str | None,
        max_per_country: int = 200,
        rows_per_page: int = 100,
    ):
        self.source_id = source_id
        self.base_url = base_url.rstrip("/")
        self.name = name
        self.countries = countries or []
        self.default_category = default_category or "Données"
        self.max_per_country = max_per_country
        self.rows_per_page = rows_per_page

    # ------------------------------------------------------------------ #
    # Entry point
    # ------------------------------------------------------------------ #

    async def run(self) -> int:
        """Lance l'indexation, retourne le nombre de datasets insérés/mis à jour."""
        await self._set_status("running")
        try:
            datasets = await self._fetch_all()
            await self._upsert(datasets)
            count = len(datasets)
            await self._set_status("done", datasets_count=count)
            print(f"[CKAN/{self.name}] {count} datasets indexés.")
            return count
        except Exception as exc:
            await self._set_status("error", error=str(exc)[:500])
            raise

    # ------------------------------------------------------------------ #
    # Fetching
    # ------------------------------------------------------------------ #

    async def _fetch_all(self) -> list[dict]:
        if not self.countries:
            # Pas de filtre pays → requête générique
            return await self._fetch_by_query("", "global")
        results = []
        seen: set[str] = set()
        for country in self.countries:
            partial = await self._fetch_by_query(country, country)
            for d in partial:
                if d["id"] not in seen:
                    seen.add(d["id"])
                    results.append(d)
        return results

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def _fetch_by_query(self, query: str, country_label: str) -> list[dict]:
        results = []
        seen: set[str] = set()
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            start = 0
            while True:
                params: dict = {
                    "rows": self.rows_per_page,
                    "start": start,
                    "sort": "metadata_modified desc",
                }
                if query:
                    params["q"] = query
                try:
                    resp = await client.get(
                        f"{self.base_url}/package_search", params=params
                    )
                    if resp.status_code != 200:
                        break
                    data = resp.json()
                except Exception:
                    break

                result = data.get("result", {})
                packages = (
                    result.get("results", []) if isinstance(result, dict) else []
                )
                total = result.get("count", 0) if isinstance(result, dict) else 0

                for pkg in packages:
                    pkg_name = pkg.get("name", "")
                    if pkg_name and pkg_name not in seen:
                        seen.add(pkg_name)
                        results.append(self._map(pkg, country_label))

                start += len(packages)
                if start >= min(total, self.max_per_country) or not packages:
                    break
        return results

    # ------------------------------------------------------------------ #
    # Mapping
    # ------------------------------------------------------------------ #

    def _map(self, pkg: dict, country: str) -> dict:
        resources = pkg.get("resources", [])
        formats = list(
            {r.get("format", "").upper() for r in resources if r.get("format")}
        )
        org = pkg.get("organization") or {}
        source_label = org.get("title", self.name)
        tags = [t.get("name", "") for t in pkg.get("tags", []) if t.get("name")][:10]

        return {
            "id": hashlib.md5(
                f"{self.base_url}-{pkg.get('name', '')}".encode()
            ).hexdigest(),
            "title": pkg.get("title", ""),
            "description": (
                pkg.get("notes", "") or pkg.get("title", "")
            )[:1000],
            "source": source_label,
            "source_url": self._build_url(pkg.get("name", "")),
            "country": country,
            "category": self.default_category,
            "format": ", ".join(formats[:4]) if formats else "Inconnu",
            "tags": tags,
        }

    def _build_url(self, pkg_name: str) -> str:
        """Construit l'URL publique du dataset à partir du base_url."""
        # Supprime "/api/3/action" pour obtenir la racine du portail
        portal_root = self.base_url
        for suffix in ["/api/3/action", "/api/3", "/api"]:
            if portal_root.endswith(suffix):
                portal_root = portal_root[: -len(suffix)]
                break
        return f"{portal_root}/dataset/{pkg_name}"

    # ------------------------------------------------------------------ #
    # Upsert
    # ------------------------------------------------------------------ #

    async def _upsert(self, datasets: list[dict]):
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        async with AsyncSessionLocal() as session:
            for d in datasets:
                if not d["title"]:
                    continue
                text_for_embedding = (
                    f"{d['title']} {d.get('description', '')[:400]} "
                    f"{' '.join(d.get('tags', []))}"
                )
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

    # ------------------------------------------------------------------ #
    # Status helpers
    # ------------------------------------------------------------------ #

    async def _set_status(
        self,
        status: str,
        datasets_count: int | None = None,
        error: str | None = None,
    ):
        if self.source_id < 0:
            return  # source éphémère (non persistée en base)
        async with AsyncSessionLocal() as session:
            values: dict = {"last_status": status}
            if status in ("running", "done", "error"):
                values["last_run"] = datetime.utcnow()
            if datasets_count is not None:
                values["datasets_count"] = datasets_count
            if error is not None:
                values["last_error"] = error
            await session.execute(
                update(DataSource)
                .where(DataSource.id == self.source_id)
                .values(**values)
            )
            await session.commit()
