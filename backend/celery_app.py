from celery import Celery
from config import settings

celery_app = Celery(
    "afrindex",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["tasks.scraping_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "scrape-worldbank-daily": {
            "task": "tasks.scraping_tasks.run_worldbank_scraper",
            "schedule": 86400,  # toutes les 24h
        },
        "scrape-hdx-daily": {
            "task": "tasks.scraping_tasks.run_hdx_scraper",
            "schedule": 86400,
        },
    },
)
