import os
from upstash_redis import Redis
from datetime import datetime, timezone
from dotenv import load_dotenv

from binance import get_usdt_avg

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

    print("Obteniendo promedio de Binance P2P...")
    try:
        binance_avg = get_usdt_avg()
        print(f"Resultado -> Binance USDT: {binance_avg}")
        
        if r and binance_avg:
            r.set("rates:binance:usd:avg", str(binance_avg))
            
            # Actualizar timestamp global (última vez que el script corrió con éxito)
            now = datetime.now(timezone.utc).isoformat()
            r.set("rates:last_update", now)
            
            print("Redis actualizado con la tasa de Binance.")
        elif not binance_avg:
            print("Error: No se pudo obtener la tasa de Binance.")

    except Exception as e:
        print(f"Error crítico durante el proceso de scraping Binance: {e}")

if __name__ == "__main__":
    main()
