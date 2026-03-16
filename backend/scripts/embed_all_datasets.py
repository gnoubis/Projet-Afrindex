"""
Génère les embeddings pour TOUS les datasets en utilisant le modèle TF-IDF local.
À exécuter après gen_embeddings_model.py.

Usage (depuis le conteneur backend) :
    python3 /app/scripts/embed_all_datasets.py
"""
import asyncio
import sys
import os

sys.path.insert(0, "/app")
os.chdir("/app")

from sqlalchemy import select, update
from db.database import AsyncSessionLocal
from db.models import Dataset
from services.embeddings import generate_embedding


async def embed_all():
    """Génère les embeddings pour tous les datasets."""
    async with AsyncSessionLocal() as session:
        # Récupère tous les datasets
        result = await session.execute(select(Dataset))
        datasets = result.scalars().all()
        
        if not datasets:
            print("[embed] Aucun dataset à traiter.")
            return
        
        print(f"[embed] Traitement de {len(datasets)} datasets...")
        
        success = 0
        failed = 0
        
        for i, dataset in enumerate(datasets, 1):
            try:
                # Combine le titre et la description pour le texte à encoder
                text = f"{dataset.title or ''} {dataset.description or ''}"
                
                # Génère l'embedding
                embedding = await generate_embedding(text)
                
                if embedding is not None:
                    # Sauvegarde l'embedding dans la base
                    stmt = update(Dataset).where(Dataset.id == dataset.id).values(embedding=embedding)
                    await session.execute(stmt)
                    success += 1
                    
                    if i % 50 == 0:
                        print(f"[embed] {i}/{len(datasets)} traités...")
                else:
                    failed += 1
                    print(f"[embed] ⚠️  Pas d'embedding pour : {dataset.title}")
                    
            except Exception as e:
                failed += 1
                print(f"[embed] ❌ Erreur pour {dataset.title}: {e}")
        
        # Commit final
        await session.commit()
        
        print(f"[embed] ✅ Terminé : {success} réussis, {failed} échoués")


if __name__ == "__main__":
    asyncio.run(embed_all())
