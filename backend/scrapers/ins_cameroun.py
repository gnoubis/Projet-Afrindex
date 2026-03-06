"""
Scraper INS Cameroun — statistics.cameroon.org (scraping HTML).
"""
import httpx
from bs4 import BeautifulSoup
from db.database import AsyncSessionLocal
from db.models import Dataset
from services.embeddings import generate_embedding
from tenacity import retry, stop_after_attempt, wait_exponential

INS_URL = "https://statistics.cameroon.org/publication.php"


class INSCamerounScraper:
    async def run(self):
        datasets = await self._scrape()
        await self._upsert(datasets)
        print(f"[INS Cameroun] {len(datasets)} datasets indexés.")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def _scrape(self) -> list[dict]:
        results = []
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(INS_URL)
            if resp.status_code != 200:
                return results
            soup = BeautifulSoup(resp.text, "html.parser")
            for item in soup.select(".publication-item, .dataset-item, article"):
                title_el = item.select_one("h2, h3, .title")
                link_el = item.select_one("a[href]")
                desc_el = item.select_one("p, .description")
                if not title_el:
                    continue
                results.append({
                    "title": title_el.get_text(strip=True),
                    "description": desc_el.get_text(strip=True) if desc_el else "",
                    "source": "INS Cameroun",
                    "source_url": link_el["href"] if link_el else INS_URL,
                    "country": "Cameroun",
                    "category": "Statistiques nationales",
                    "format": "PDF",
                    "tags": ["cameroun", "ins", "statistiques"],
                })
        return results

    async def _upsert(self, datasets: list[dict]):
        async with AsyncSessionLocal() as session:
            for d in datasets:
                if not d["title"]:
                    continue
                text_for_embedding = f"{d['title']} {d.get('description', '')} cameroun ins"
                try:
                    embedding = await generate_embedding(text_for_embedding)
                except Exception:
                    embedding = None
                dataset = Dataset(**{k: v for k, v in d.items()}, embedding=embedding)
                session.add(dataset)
            await session.commit()
