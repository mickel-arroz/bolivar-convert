from upstash_redis import Redis
from dotenv import load_dotenv

from binance import get_usdt_avg
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

    print("Obteniendo promedio de Binance P2P...")
    try:
        binance_avg = get_usdt_avg()
        print(f"Resultado -> Binance USDT: {binance_avg}")

        if r and binance_avg:
            # Upsert del registro de hoy en el historial unificado (solo binanceUsdAvg).
            record = upsert_today(r, {"binanceUsdAvg": binance_avg})
            print(f"Historial actualizado: {record}")
        elif not binance_avg:
            print("Error: No se pudo obtener la tasa de Binance.")

    except Exception as e:
        print(f"Error crítico durante el proceso de scraping Binance: {e}")

if __name__ == "__main__":
    main()
