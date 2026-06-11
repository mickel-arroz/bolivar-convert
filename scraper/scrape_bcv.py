import os
import json
from upstash_redis import Redis
from datetime import datetime, date, timezone
from dotenv import load_dotenv

from bcv_core import fetch_bcv_html, extract_fecha_valor
from bcv_usd import get_usd
from bcv_eur import get_eur

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
        nueva_fecha_valor = extract_fecha_valor(bcv_html)
        
        if not nueva_fecha_valor:
            print("Error: No se pudo extraer la Fecha Valor del BCV.")
            return

        print(f"Fecha Valor extraída: {nueva_fecha_valor}")

        # Comparar con la fecha guardada en Redis
        fecha_guardada_str = r.get("rates:bcv:fecha_valor") if r else None
        fecha_guardada = None
        
        if fecha_guardada_str:
            try:
                # upstash-redis devuelve strings, no bytes por defecto
                fecha_guardada = datetime.strptime(fecha_guardada_str, "%Y-%m-%d").date()
            except ValueError:
                pass

        # Lógica de actualización
        if not fecha_guardada or nueva_fecha_valor > fecha_guardada:
            print("Nuevos datos disponibles. Procediendo a actualizar...")
            
            usd_val = get_usd(bcv_html)
            eur_val = get_eur(bcv_html)
            
            # Obtener el valor actual de Binance desde Redis para el historial
            binance_avg = r.get("rates:binance:usd:avg") if r else None
            
            print(f"Resultados -> USD: {usd_val}, EUR: {eur_val}, Binance USDT (desde Redis): {binance_avg}")
            
            if r:
                # Guardamos sin expiración (TTL no definido)
                if usd_val:
                    r.set("rates:bcv:usd", str(usd_val))
                if eur_val:
                    r.set("rates:bcv:eur", str(eur_val))
                    
                # Guardar la nueva fecha valor para futuras comparaciones
                r.set("rates:bcv:fecha_valor", nueva_fecha_valor.strftime("%Y-%m-%d"))
                
                # Timestamp de actualización del sistema
                now = datetime.now(timezone.utc).isoformat()
                r.set("rates:last_update", now)

                # Guardar en el historial
                history_record = {
                    "date": nueva_fecha_valor.strftime("%Y-%m-%d"),
                    "bcvUsd": usd_val,
                    "bcvEur": eur_val,
                    "binanceUsdAvg": float(binance_avg) if binance_avg else None
                }
                r.rpush("rates:history", json.dumps(history_record))
                
                print("Redis actualizado y registro añadido al historial.")
        else:
            print(f"La fecha extraída ({nueva_fecha_valor}) no es más reciente que la fecha guardada ({fecha_guardada}). No se actualizarán los datos.")

    except Exception as e:
        print(f"Error crítico durante el proceso de scraping BCV: {e}")

if __name__ == "__main__":
    main()
