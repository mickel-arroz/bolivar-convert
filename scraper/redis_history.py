"""
Utilidad compartida para escribir en el historial unificado de tasas en Redis.

Toda la data de tasas vive en UN solo arreglo (`rates:history`), una entrada por
día calendario (zona horaria de Caracas). Los scrapers solo modifican este arreglo:
si no existe el registro de hoy lo agregan al final; si ya existe, lo actualizan
(upsert) sin duplicarlo.
"""
import json
from datetime import datetime, timezone, timedelta

CARACAS_TZ = timezone(timedelta(hours=-4))
HISTORY_KEY = "rates:history"


def _parse(item):
    if isinstance(item, str):
        try:
            return json.loads(item)
        except Exception:
            return None
    return item


def upsert_today(r, updates):
    """
    Inserta o actualiza el registro del día actual (TZ Caracas) en `rates:history`.

    - Solo escribe los campos de `updates` que NO sean None (así un scraper que
      falla no pisa una tasa buena con None).
    - Si no hay nada que escribir, no crea ni toca ningún registro.
    - Devuelve el registro resultante (o None si no se escribió nada).
    """
    if not r:
        return None

    clean = {k: v for k, v in updates.items() if v is not None}
    if not clean:
        return None

    today = datetime.now(CARACAS_TZ).strftime("%Y-%m-%d")
    now_iso = datetime.now(CARACAS_TZ).isoformat()

    history = r.lrange(HISTORY_KEY, 0, -1) or []
    for i, item in enumerate(history):
        record = _parse(item)
        if record and record.get("date") == today:
            record.update(clean)
            record["updatedAt"] = now_iso
            r.lset(HISTORY_KEY, i, json.dumps(record))
            return record

    record = {"date": today, "bcvUsd": None, "bcvEur": None, "binanceUsdAvg": None}
    record.update(clean)
    record["updatedAt"] = now_iso
    r.rpush(HISTORY_KEY, json.dumps(record))
    return record
