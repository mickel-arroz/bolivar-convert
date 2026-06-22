import os
import json
from upstash_redis import Redis
from datetime import datetime, timezone, timedelta
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

            # Actualizar binanceUsdAvg en el registro de historial para hoy (hora Caracas, UTC-4)
            CARACAS_TZ = timezone(timedelta(hours=-4))
            today_caracas = datetime.now(CARACAS_TZ).strftime("%Y-%m-%d")
            history = r.lrange("rates:history", 0, -1)
            for i, item in enumerate(history):
                record = json.loads(item)
                if record.get("date") == today_caracas:
                    record["binanceUsdAvg"] = binance_avg
                    r.lset("rates:history", i, json.dumps(record))
                    print(f"Historial actualizado para {today_caracas}: binanceUsdAvg={binance_avg}")
                    break
            else:
                print(f"No existe registro en historial para {today_caracas}. No se modifica historial.")
        elif not binance_avg:
            print("Error: No se pudo obtener la tasa de Binance.")

    except Exception as e:
        print(f"Error crítico durante el proceso de scraping Binance: {e}")

if __name__ == "__main__":
    main()
