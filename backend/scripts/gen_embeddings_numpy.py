"""
Génère des embeddings pour tous les datasets (numpy only, no sklearn, no OpenAI).
SAUVEGARDE le pipeline pour que les requêtes de recherche utilisent le même espace vectoriel.
Usage: docker exec afrindex_backend python3 /app/scripts/gen_embeddings_numpy.py
"""
import asyncio
import sys
import os
import re
import pickle

sys.path.insert(0, "/app")
os.chdir("/app")

DIMS = 384
PIPELINE_PATH = "/app/data/tfidf_pipeline.pkl"


def tokenize(text: str):
    text = (text or "").lower()
    text = re.sub(r"[^a-zA-ZÀ-ÿ\s]", " ", text)
    tokens = text.split()
    # Unigrams + bigrams
    unigrams = tokens
    bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens)-1)]
    return unigrams + bigrams


async def main():
    import numpy as np
    from collections import defaultdict
    from math import log
    from sqlalchemy import text
    from db.database import AsyncSessionLocal

    print("[Embeddings] Chargement des datasets…")
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(text(
            "SELECT id, title, description, tags FROM datasets ORDER BY id"
        ))).mappings().all()

    total = len(rows)
    print(f"[Embeddings] {total} datasets chargés.")

    # Construire le corpus
    corpus = []
    for r in rows:
        title = r["title"] or ""
        desc = (r["description"] or "")[:400]
        tags = " ".join(r["tags"] or [])
        corpus.append(f"{title} {title} {desc} {tags}")  # title x2 pour boost

    print("[Embeddings] Tokenisation…")
    tokenized = [tokenize(t) for t in corpus]

    print("[Embeddings] Calcul DF (document frequency)…")
    df = defaultdict(int)
    for doc in tokenized:
        for term in set(doc):
            df[term] += 1

    # Garder seulement les 12000 termes les mieux distribués (ni trop rares, ni trop fréquents)
    N = total
    # Score: df entre 2 et 80% du corpus
    min_df, max_df = 2, int(0.8 * N)
    vocab = {
        term: idx for idx, (term, _) in enumerate(
            sorted(
                [(t, d) for t, d in df.items() if min_df <= d <= max_df],
                key=lambda x: -x[1]
            )[:12000]
        )
    }
    V = len(vocab)
    print(f"[Embeddings] Vocabulaire: {V} termes. Construction matrice TF-IDF…")

    # Construire matrice TF-IDF (N x V) en chunks pour économiser la RAM
    # On utilise la représentation sparse via dict
    idf = {term: log((N + 1) / (df[term] + 1)) + 1 for term in vocab}

    np.random.seed(42)
    R = np.random.normal(0, 1.0 / (DIMS ** 0.5), size=(V, DIMS)).astype(np.float32)

    print("[Embeddings] Calcul des projections…")
    matrix = np.zeros((N, DIMS), dtype=np.float32)
    CHUNK = 500
    for start in range(0, N, CHUNK):
        end = min(start + CHUNK, N)
        chunk_docs = tokenized[start:end]
        chunk_size = end - start
        tf_idf_chunk = np.zeros((chunk_size, V), dtype=np.float32)
        for i, tokens in enumerate(chunk_docs):
            tf_counts = defaultdict(int)
            for t in tokens:
                if t in vocab:
                    tf_counts[t] += 1
            doc_len = max(len(tokens), 1)
            for t, cnt in tf_counts.items():
                tf = cnt / doc_len
                tf_idf_chunk[i, vocab[t]] = tf * idf[t]
        matrix[start:end] = tf_idf_chunk @ R
        if (start // CHUNK) % 4 == 0:
            print(f"  {end}/{N}")

    print("[Embeddings] Normalisation L2…")
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    matrix = matrix / norms

    # --- Sauvegarder le pipeline ---
    os.makedirs(os.path.dirname(PIPELINE_PATH), exist_ok=True)
    pipeline = {"vocab": vocab, "idf": idf, "R": R, "dims": DIMS}
    with open(PIPELINE_PATH, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"[Embeddings] Pipeline sauvegardé → {PIPELINE_PATH}")

    print(f"[Embeddings] Insertion en DB…")

    BATCH = 500
    async with AsyncSessionLocal() as db:
        for i in range(0, total, BATCH):
            chunk_ids = [rows[j]["id"] for j in range(i, min(i + BATCH, total))]
            chunk_vecs = matrix[i: i + BATCH]
            for row_id, vec in zip(chunk_ids, chunk_vecs):
                vec_str = "[" + ",".join(f"{x:.6f}" for x in vec.tolist()) + "]"
                await db.execute(
                    text("UPDATE datasets SET embedding = CAST(:v AS vector) WHERE id = :id"),
                    {"v": vec_str, "id": row_id},
                )
            await db.commit()
            done = min(i + BATCH, total)
            print(f"  DB: {done}/{total} ({done*100//total}%)")

    # Vérification finale
    async with AsyncSessionLocal() as db:
        count = (await db.execute(
            text("SELECT COUNT(*) FROM datasets WHERE embedding IS NOT NULL")
        )).scalar()
    print(f"\n[Embeddings] ✓ Terminé — {count}/{total} embeddings générés.")


if __name__ == "__main__":
    asyncio.run(main())
