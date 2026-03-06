from celery_app import celery_app
from scrapers.worldbank import WorldBankScraper
from scrapers.hdx import HDXScraper
import asyncio


@celery_app.task(name="tasks.scraping_tasks.run_worldbank_scraper")
def run_worldbank_scraper():
    asyncio.run(WorldBankScraper().run())


@celery_app.task(name="tasks.scraping_tasks.run_hdx_scraper")
def run_hdx_scraper():
    asyncio.run(HDXScraper().run())
