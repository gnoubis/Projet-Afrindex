from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from db.database import init_db
from routers import search, datasets, categories, admin, reviews


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Afrindex API",
    description="Moteur de recherche de datasets africains — API REST",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = [
    origin.strip()
    for origin in settings.BACKEND_CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if settings.ENVIRONMENT == "production" else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(datasets.router, prefix="/api/v1", tags=["datasets"])
app.include_router(categories.router, prefix="/api/v1", tags=["categories"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])
app.include_router(reviews.router, prefix="/api/v1", tags=["reviews"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Renvoie les erreurs 500 avec les headers CORS pour éviter le blocage navigateur."""
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "afrindex-backend"}
