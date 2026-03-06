# Afrindex 🌍

> Le moteur de recherche de datasets africains — recherche hybride IA + full-text

## Stack

| Couche | Technologies |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, React Query |
| Backend | FastAPI, PostgreSQL + pgvector, Celery + Redis |
| IA | OpenAI text-embedding-3-small, cosine similarity |
| Infra | Docker Compose, Railway, Vercel, GitHub Actions |

## Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Node.js 20+
- Clé API OpenAI

### 1. Configuration

```bash
# Cloner le repo
git clone <votre-repo> afrindex && cd afrindex

# Renseigner la clé OpenAI
echo "OPENAI_API_KEY=sk-..." >> backend/.env
```

### 2. Lancer le backend

```bash
docker-compose up --build
```

L'API est disponible sur http://localhost:8000  
Documentation Swagger : http://localhost:8000/docs

### 3. Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

Interface disponible sur http://localhost:3000

### 4. Indexer les données

```bash
# Depuis le conteneur backend
docker-compose exec backend python -c "
import asyncio
from scrapers.worldbank import WorldBankScraper
asyncio.run(WorldBankScraper().run())
"
```

## Structure

```
afrindex/
├── frontend/                # Next.js 14
│   ├── app/
│   │   ├── page.tsx         # Page d'accueil
│   │   ├── search/page.tsx  # Résultats de recherche
│   │   └── dataset/[id]/    # Fiche dataset
│   └── components/
│       ├── SearchBar
│       ├── DatasetCard
│       └── FilterPanel
├── backend/                 # FastAPI
│   ├── main.py
│   ├── routers/
│   ├── services/
│   ├── scrapers/
│   └── db/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Endpoints

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/search?q=...` | Recherche hybride |
| GET | `/api/v1/datasets` | Liste des datasets |
| GET | `/api/v1/datasets/{id}` | Fiche dataset |
| GET | `/api/v1/datasets/{id}/similar` | Datasets similaires |
| GET | `/api/v1/categories` | Catégories |
| GET | `/api/v1/stats` | Statistiques globales |

---

Afrindex · Geordan Noubissie · Data Engineer & Software Engineer · 2026
