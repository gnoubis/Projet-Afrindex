"""
Détecte les pays africains dans le titre et la description des datasets.
Met à jour le champ `country` avec les pays détectés.

Usage (depuis le conteneur backend) :
    python3 /app/scripts/detect_countries.py
"""
import asyncio
import sys
import os
import re

sys.path.insert(0, "/app")
os.chdir("/app")

from sqlalchemy import select, update
from db.database import AsyncSessionLocal
from db.models import Dataset


# Dictionnaire des pays africains avec variantes de noms (français, anglais, variantes)
AFRICAN_COUNTRIES = {
    "algeria": ["algérie", "algeria"],
    "angola": ["angola"],
    "benin": ["bénin", "benin"],
    "botswana": ["botswana"],
    "burkina": ["burkina", "burkina faso", "haute volta"],
    "burundi": ["burundi"],
    "cameroon": ["cameroun", "cameroon"],
    "cape verde": ["cap vert", "cape verde"],
    "central african": ["rca", "centrafrique", "central african"],
    "chad": ["tchad", "chad"],
    "comoros": ["comores", "comoros"],
    "congo": ["congo", "rdc", "democratic republic"],
    "côte d'ivoire": ["côte d'ivoire", "cote d'ivoire", "ivory coast"],
    "djibouti": ["djibouti"],
    "egypt": ["égypte", "egypt"],
    "equatorial": ["guinée équatoriale", "gabon equatorial"],
    "eritrea": ["érythrée", "eritrea"],
    "ethiopia": ["éthiopie", "ethiopia"],
    "gabon": ["gabon"],
    "gambia": ["gambie", "gambia"],
    "ghana": ["ghana"],
    "guinea": ["guinée", "guinea"],
    "guinea-bissau": ["guinée-bissau", "guinea-bissau"],
    "kenya": ["kenya"],
    "lesotho": ["lesotho"],
    "liberia": ["liberia"],
    "libya": ["libye", "libya"],
    "madagascar": ["madagascar"],
    "malawi": ["malawi"],
    "mali": ["mali"],
    "mauritania": ["mauritanie", "mauritania"],
    "mauritius": ["maurice", "mauritius"],
    "morocco": ["maroc", "morocco"],
    "mozambique": ["mozambique"],
    "namibia": ["namibia"],
    "niger": ["niger"],
    "nigeria": ["nigeria"],
    "rwanda": ["rwanda"],
    "senegal": ["sénégal", "senegal"],
    "seychelles": ["seychelles"],
    "sierra leone": ["sierra leone"],
    "somalia": ["somalie", "somalia"],
    "south africa": ["afrique du sud", "south africa"],
    "south sudan": ["soudan du sud", "south sudan"],
    "sudan": ["soudan", "sudan"],
    "swaziland": ["eswatini", "swaziland"],
    "tanzania": ["tanzanie", "tanzania"],
    "togo": ["togo"],
    "tunisia": ["tunisie", "tunisia"],
    "uganda": ["ouganda", "uganda"],
    "zambia": ["zambie", "zambia"],
    "zimbabwe": ["zimbabwe"],
}

# Crée un dictionnaire inversé pour lookup rapide
COUNTRY_LOOKUP = {}
for official_name, variants in AFRICAN_COUNTRIES.items():
    for variant in variants:
        COUNTRY_LOOKUP[variant.lower()] = official_name


def detect_countries(text: str) -> list:
    """Détecte les noms de pays dans le texte."""
    if not text:
        return []
    
    text_lower = text.lower()
    # Nettoie les accents et caractères spéciaux
    text_lower = re.sub(r"[àâä]", "a", text_lower)
    text_lower = re.sub(r"[éèêë]", "e", text_lower)
    text_lower = re.sub(r"[îï]", "i", text_lower)
    text_lower = re.sub(r"[ôö]", "o", text_lower)
    text_lower = re.sub(r"[ûü]", "u", text_lower)
    text_lower = re.sub(r"[ç]", "c", text_lower)
    
    found_countries = set()
    
    # Cherche les pays dans le texte
    for variant_key, official_name in COUNTRY_LOOKUP.items():
        # Utilise des mots limites pour éviter les faux positifs
        pattern = r'\b' + re.escape(variant_key) + r'\b'
        if re.search(pattern, text_lower):
            found_countries.add(official_name)
    
    return sorted(list(found_countries))


async def detect_and_update():
    """Détecte les pays et met à jour la base."""
    async with AsyncSessionLocal() as session:
        # Récupère tous les datasets
        result = await session.execute(select(Dataset))
        datasets = result.scalars().all()
        
        if not datasets:
            print("[detect] Aucun dataset à traiter.")
            return
        
        print(f"[detect] Traitement de {len(datasets)} datasets...")
        
        updated = 0
        
        for i, dataset in enumerate(datasets, 1):
            # Combine titre + description
            text = f"{dataset.title or ''} {dataset.description or ''}"
            
            # Détecte les pays
            countries = detect_countries(text)
            
            if countries:
                # Prend le premier pays détecté (on pourrait aussi en mettre plusieurs séparés par des virgules)
                new_country = countries[0]
                
                # Met à jour si le pays a changé
                if dataset.country != new_country:
                    stmt = update(Dataset).where(Dataset.id == dataset.id).values(country=new_country)
                    await session.execute(stmt)
                    updated += 1
                    print(f"[detect] {dataset.title[:50]}... → {new_country}")
            
            if i % 50 == 0:
                print(f"[detect] {i}/{len(datasets)} traités...")
        
        # Commit final
        await session.commit()
        
        print(f"[detect] ✅ Terminé : {updated} datasets mis à jour")


if __name__ == "__main__":
    asyncio.run(detect_and_update())
