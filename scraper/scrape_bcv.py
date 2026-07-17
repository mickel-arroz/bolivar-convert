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

def main():
    r = get_redis_client()
    if not r:
        print("Advertencia: No hay conexión a Redis configurada (UPSTASH_REDIS_REST_URL/TOKEN). Se ejecutará localmente.")

    print("Obteniendo datos del BCV...")
    try:
        bcv_html = fetch_bcv_html()

        usd_val = get_usd(bcv_html)
        eur_val = get_eur(bcv_html)

        print(f"Resultados -> USD: {usd_val}, EUR: {eur_val}")

        if r:
            # Upsert del registro de hoy en el historial unificado. Solo se escriben
            # los campos con valor (si el parseo falló, no se pisa lo existente).
            record = upsert_today(r, {"bcvUsd": usd_val, "bcvEur": eur_val})
            if record:
                print(f"Historial actualizado: {record}")
            else:
                print("No se obtuvieron tasas del BCV; historial sin cambios.")

    except Exception as e:
        print(f"Error crítico durante el proceso de scraping BCV: {e}")

if __name__ == "__main__":
    main()
