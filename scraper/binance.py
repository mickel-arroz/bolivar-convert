import requests
import statistics
from utils import retry

@retry(attempts=3, delay=5)
def get_usdt_avg():
    """
    Se conecta a la API de Binance P2P. Extrae hasta 20 mejores precios de compra 
    y venta, filtrando solo comerciantes verificados y excluyendo anuncios promocionados.
    Utiliza la Mediana para evitar que valores atípicos dañen el promedio real del mercado.
    """
    url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
    headers = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Origin": "https://p2p.binance.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    # TradeType BUY (Nosotros compramos crypto, ellos venden)
    # publisherType: "merchant" -> Solo comerciantes verificados
    payload_buy = {
        "fiat": "VES", "page": 1, "rows": 20, "tradeType": "BUY", "asset": "USDT",
        "countries": [], "proMerchantAds": False, "shieldMerchantAds": False,
        "filterType": "all", "periods": [], "additionalKycVerifyFilter": 0,
        "publisherType": "merchant", "payTypes": [], "classifies": ["mass", "profession", "user"]
    }
    
    # TradeType SELL (Nosotros vendemos crypto, ellos compran)
    payload_sell = {
        "fiat": "VES", "page": 1, "rows": 20, "tradeType": "SELL", "asset": "USDT",
        "countries": [], "proMerchantAds": False, "shieldMerchantAds": False,
        "filterType": "all", "periods": [], "additionalKycVerifyFilter": 0,
        "publisherType": "merchant", "payTypes": [], "classifies": ["mass", "profession", "user"]
    }
    
    # Obtener precios de compra
    res_buy = requests.post(url, headers=headers, json=payload_buy, timeout=10)
    res_buy.raise_for_status()
    buy_items = res_buy.json().get("data") or []
    
    # Filtrar promocionados y tomar los 20 primeros ordenados de menor a mayor
    valid_buy_items = [item for item in buy_items if not item.get("adv", {}).get("isPromo", False)]
    valid_buy_items.sort(key=lambda x: float(x["adv"]["price"]))
    buy_prices = [float(item["adv"]["price"]) for item in valid_buy_items[:20]]
    
    # Obtener precios de venta
    res_sell = requests.post(url, headers=headers, json=payload_sell, timeout=10)
    res_sell.raise_for_status()
    sell_items = res_sell.json().get("data") or []
    
    # Filtrar promocionados y tomar los 20 primeros ordenados de mayor a menor
    valid_sell_items = [item for item in sell_items if not item.get("adv", {}).get("isPromo", False)]
    valid_sell_items.sort(key=lambda x: float(x["adv"]["price"]), reverse=True)
    sell_prices = [float(item["adv"]["price"]) for item in valid_sell_items[:20]]
    
    all_prices = buy_prices + sell_prices
    
    if len(all_prices) > 0:
        mediana = statistics.median(all_prices)
        return round(mediana, 2)
    return None
