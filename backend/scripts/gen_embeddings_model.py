"""
Génère le modèle TF-IDF + Random Projection pour les embeddings locaux.
Entraîne sur le vocabulaire de tous les datasets et sauvegarde dans /app/data/tfidf_pipeline.pkl

Usage (depuis le conteneur backend) :
    python3 /app/scripts/gen_embeddings_model.py
"""
import asyncio
import sys
import os
import pickle
import re
from collections import defaultdict
from math import log

sys.path.insert(0, "/app")
os.chdir("/app")

import numpy as np
from sqlalchemy import select, text
from db.database import AsyncSessionLocal
from db.models import Dataset


def _tokenize(text: str) -> list:
    """Tokenize et crée des bigrams."""
    text = (text or "").lower()
    text = re.sub(r"[^a-zA-ZÀ-ÿ\s]", " ", text)
    tokens = text.split()
    bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens)-1)]
    return tokens + bigrams


async def gen_model():
    """Génère le modèle TF-IDF et la matrice de projection."""
    async with AsyncSessionLocal() as session:
        # Récupère tous les textes
        result = await session.execute(select(Dataset.title, Dataset.description))
        rows = result.all()
        
        if not rows:
            print("[gen] Aucun dataset trouvé. Impossible de générer le modèle.")
            return
        
        print(f"[gen] Chargement de {len(rows)} datasets...")
        
        # Tokenize tous les textes
        all_tokens = []
        for title, desc in rows:
            text = f"{title or ''} {desc or ''}"
            tokens = _tokenize(text)
            all_tokens.extend(tokens)
        
        if not all_tokens:
            print("[gen] Aucun token extrait. Impossible de générer le modèle.")
            return
        
        # Construit le vocabulaire (tokens uniques)
        vocab = {}
        for token in set(all_tokens):
            vocab[token] = len(vocab)
        
        print(f"[gen] Vocabulaire généré : {len(vocab)} termes uniques")
        
        # Calcule les IDF (Inverse Document Frequency)
        V = len(vocab)
        num_docs = len(rows)
        doc_freqs = defaultdict(int)
        
        for title, desc in rows:
            text = f"{title or ''} {desc or ''}"
            tokens_set = set(_tokenize(text))
            for token in tokens_set:
                if token in vocab:
                    doc_freqs[token] += 1
        
        idf = {}
        for token in vocab:
            df = doc_freqs.get(token, 1)
            idf[token] = log((num_docs + 1) / (df + 1)) + 1.0
        
        print(f"[gen] IDF calculé pour {len(idf)} termes")
        
        # Génère la matrice de projection aléatoire (384 dimensions)
        EMBEDDING_DIMS = 384
        np.random.seed(42)  # Déterministe
        R = np.random.randn(V, EMBEDDING_DIMS).astype(np.float32)
        # Normalise chaque colonne
        R = R / np.linalg.norm(R, axis=0, keepdims=True)
        
        print(f"[gen] Matrice de projection générée : {V} × {EMBEDDING_DIMS}")
        
        # Sauvegarde le pipeline
        pipeline = {
            "vocab": vocab,
            "idf": idf,
            "R": R,
        }
        
        os.makedirs("/app/data", exist_ok=True)
        with open("/app/data/tfidf_pipeline.pkl", "wb") as f:
            pickle.dump(pipeline, f)
        
        print("[gen] ✅ Modèle sauvegardé dans /app/data/tfidf_pipeline.pkl")
        print(f"[gen] Prêt à être utilisé pour la génération d'embeddings locaux.")


if __name__ == "__main__":
    asyncio.run(gen_model())
