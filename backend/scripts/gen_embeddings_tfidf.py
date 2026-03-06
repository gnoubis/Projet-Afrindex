"""
Génère des embeddings TF-IDF (384 dimensions) pour tous les datasets
sans API externe, sans téléchargement. Utilise uniquement scikit-learn.
"""
import asyncio
import sys
import os

sys.path.insert(0, "/app")
os.chdir("/app")


async def main():
    from sqlalchemy import text
    from db.database import AsyncSessionLocal

    print("[TF-IDF Embeddings] Chargement des datasets…")
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(text(
            "SELECT id, title, description, tags FROM datasets ORDER BY id"
        ))).mappings().all()

    total = len(rows)
    print(f"[TF-IDF Embeddings] {total} datasets à traiter.")

    # Construire le corpus de textes
    texts = [
        f"{r['title']} {(r['description'] or '')[:500]} {' '.join(r['tags'] or [])}"
        for r in rows
    ]

    # Générer les vecteurs TF-IDF 384 dims
    print("[TF-IDF Embeddings] Calcul TF-IDF (1–2 min)…")
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.decomposition import TruncatedSVD
    from sklearn.pipeline import Pipeline
    import numpy as np

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            strip_accents="unicode",
            analyzer="word",
        )),
        ("svd", TruncatedSVD(n_components=384, random_state=42)),
    ])

    print("[TF-IDF Embeddings] Fit+transform en cours…")
    matrix = pipeline.fit_transform(texts)  # shape (N, 384)

    # Normaliser (cosine similarity)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    matrix = matrix / norms

    print(f"[TF-IDF Embeddings] Vecteurs prêts: {matrix.shape}. Insertion en DB…")

    BATCH = 500
    async with AsyncSessionLocal() as db:
        for i in range(0, total, BATCH):
            chunk_ids = [rows[j]["id"] for j in range(i, min(i + BATCH, total))]
            chunk_vecs = matrix[i: i + BATCH]
            for row_id, vec in zip(chunk_ids, chunk_vecs):
                await db.execute(
                    text("UPDATE datasets SET embedding = CAST(:v AS vector) WHERE id = :id"),
                    {"v": f"[{','.join(f'{x:.6f}' for x in vec.tolist())}]", "id": row_id},
                )
            await db.commit()
            done = min(i + BATCH, total)
            print(f"  {done}/{total} ({done*100//total}%)")

    # Vérification finale
    async with AsyncSessionLocal() as db:
        count = (await db.execute(text("SELECT COUNT(*) FROM datasets WHERE embedding IS NOT NULL"))).scalar()
    print(f"[TF-IDF Embeddings] ✓ Terminé — {count}/{total} embeddings générés.")


if __name__ == "__main__":
    asyncio.run(main())
