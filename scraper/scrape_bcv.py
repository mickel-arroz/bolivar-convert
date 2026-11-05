import os
import sys

from upstash_redis import Redis
from dotenv import load_dotenv

from bcv_core import fetch_bcv_html
from bcv_usd import get_usd
from bcv_eur import get_eur
from redis_history import upsert_today

load_dotenv()

def get_redis_client():
    try:
        # Redis.from_env() busca UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN
        return Redis.from_env()
    except Exception:
        return None

def parse_rate(name, parser, soup, errors):
    try:
        value = parser(soup)
    except Exception as e:
        errors.append(f"{name}: {e}")
        return None
    if value is None:
        errors.append(f"{name}: no se encontró en el HTML")
    return value

def main():
    r = get_redis_client()
    if not r:
        if os.getenv("GITHUB_ACTIONS"):
            print("Error: Redis no está configurado (UPSTASH_REDIS_REST_URL/TOKEN).")
            return 1
        print("Advertencia: No hay conexión a Redis configurada (UPSTASH_REDIS_REST_URL/TOKEN). Se ejecutará localmente.")

    print("Obteniendo datos del BCV...")
    try:
        bcv_html = fetch_bcv_html()
    except Exception as e:
        print(f"Error crítico descargando la página del BCV: {e}")
        return 1

    errors = []
    usd_val = parse_rate("USD", get_usd, bcv_html, errors)
    eur_val = parse_rate("EUR", get_eur, bcv_html, errors)

    print(f"Resultados -> USD: {usd_val}, EUR: {eur_val}")

    if r:
        # Se escribe lo que sí se obtuvo aunque la otra tasa haya fallado; upsert_today
        # ignora los None, así que no se pisa lo existente.
        try:
            record = upsert_today(r, {"bcvUsd": usd_val, "bcvEur": eur_val})
        except Exception as e:
            print(f"Error crítico escribiendo en Redis: {e}")
            return 1
        if record:
            print(f"Historial actualizado: {record}")
        else:
            print("No se obtuvieron tasas del BCV; historial sin cambios.")

    if errors:
        for error in errors:
            print(f"Error parseando tasa {error}")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
