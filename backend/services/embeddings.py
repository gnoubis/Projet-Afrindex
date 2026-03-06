"""Embeddings locaux via TF-IDF + Random Projection (numpy only, no OpenAI, no download).
Pipeline persisté dans /app/data/tfidf_pipeline.pkl après gen_embeddings_numpy.py.
384 dimensions, compatible avec le même espace vectoriel stocké en DB."""
import asyncio
import os
import re
import pickle
import logging
from collections import defaultdict
from math import log
from typing import List

log = logging.getLogger(__name__)

EMBEDDING_DIMS = 384
PIPELINE_PATH = "/app/data/tfidf_pipeline.pkl"

_pipeline = None


def _tokenize(text: str) -> list:
    text = (text or "").lower()
    text = re.sub(r"[^a-zA-ZÀ-ÿ\s]", " ", text)
    tokens = text.split()
    bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens)-1)]
    return tokens + bigrams


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        if not os.path.exists(PIPELINE_PATH):
            raise RuntimeError(
                f"Pipeline TF-IDF introuvable : {PIPELINE_PATH}. "
                "Lancez d'abord : python3 /app/scripts/gen_embeddings_numpy.py"
            )
        with open(PIPELINE_PATH, "rb") as f:
            _pipeline = pickle.load(f)
        log.info("[Embeddings] Pipeline TF-IDF chargé (%d termes).", len(_pipeline["vocab"]))
    return _pipeline


def _embed_text(text: str) -> list:
    import numpy as np
    p = _get_pipeline()
    vocab, idf, R = p["vocab"], p["idf"], p["R"]
    tokens = _tokenize(text)
    tf_counts: dict = defaultdict(int)
    for t in tokens:
        if t in vocab:
            tf_counts[t] += 1
    doc_len = max(len(tokens), 1)
    V = len(vocab)
    vec = np.zeros(V, dtype=np.float32)
    for t, cnt in tf_counts.items():
        tf = cnt / doc_len
        vec[vocab[t]] = tf * idf.get(t, 1.0)
    proj = vec @ R  # (384,)
    norm = float(np.linalg.norm(proj))
    if norm == 0:
        return None  # aucun terme du vocabulaire → FTS fallback
    return (proj / norm).tolist()


async def generate_embedding(text: str):
    """Génère un embedding local (384 dims). Retourne None si aucun terme du vocabulaire ne matche (→ FTS fallback)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _embed_text, text.strip())


async def generate_embeddings_batch(texts: List[str]) -> List[list[float]]:
    """Génère les embeddings pour une liste de textes."""
    loop = asyncio.get_event_loop()
    def _batch():
        return [_embed_text(t) for t in texts]
    return await loop.run_in_executor(None, _batch)
